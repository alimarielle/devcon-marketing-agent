import { NextRequest, NextResponse } from "next/server";

const DAILY_LIMIT    = 5;
const MAX_WORDS      = 200;
const MAX_BODY_BYTES = 32_768;

const VALID_ROLES = ["chapter_lead","volunteer","cohort_intern","operations_manager","hq_lead"];

// Per role+IP daily usage: key = "role:ip:date"
const usage = new Map<string, number>();

function getToday() { return new Date().toISOString().slice(0, 10); }

function getIP(req: NextRequest): string {
  const f = req.headers.get("x-forwarded-for");
  if (f) { const ip = f.split(",")[0].trim(); if (/^[\d.a-fA-F:]+$/.test(ip)) return ip; }
  return req.headers.get("x-real-ip") || "unknown";
}

function countWords(t: string): number {
  return t.trim().split(/\s+/).filter(Boolean).length;
}

function sanitizeInput(text: string): string {
  return text
    .replace(/\0/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
}

function validateMessages(messages: unknown): boolean {
  if (!Array.isArray(messages)) return false;
  if (messages.length > 50) return false;
  for (const m of messages) {
    if (typeof m !== "object" || m === null) return false;
    const msg = m as Record<string, unknown>;
    if (!["user","assistant"].includes(msg.role as string)) return false;
    if (typeof msg.content !== "string") return false;
    if ((msg.content as string).length > 20_000) return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    const proto = req.headers.get("x-forwarded-proto");
    if (proto && proto !== "https")
      return NextResponse.json({ error: "HTTPS required." }, { status: 400 });
  }

  if (!req.headers.get("content-type")?.includes("application/json"))
    return NextResponse.json({ error: "Invalid content type." }, { status: 415 });

  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_BODY_BYTES)
    return NextResponse.json({ error: "Request too large." }, { status: 413 });

  let body: { messages?: unknown; system?: unknown; sessionId?: unknown; role?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const { messages, system, sessionId, role } = body;

  // Validate role
  if (typeof role !== "string" || !VALID_ROLES.includes(role))
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });

  if (!validateMessages(messages))
    return NextResponse.json({ error: "Invalid messages format." }, { status: 400 });

  if (typeof system !== "string" || system.length > 10_000)
    return NextResponse.json({ error: "Invalid system prompt." }, { status: 400 });

  if (typeof sessionId !== "string" || !/^[a-z0-9]{6,32}$/.test(sessionId))
    return NextResponse.json({ error: "Invalid session." }, { status: 400 });

  // Per-role per-IP daily rate limiting
  const ip      = getIP(req);
  const today   = getToday();
  const usageKey = `${role}:${ip}:${today}`;
  const count    = usage.get(usageKey) ?? 0;

  if (count >= DAILY_LIMIT) {
    const roleLabel: Record<string,string> = {
      chapter_lead:"Chapter Lead", volunteer:"Volunteer",
      cohort_intern:"Cohort Intern", operations_manager:"Operations Manager", hq_lead:"HQ Lead",
    };
    return NextResponse.json({
      error: `Daily limit reached for ${roleLabel[role]}. You have ${DAILY_LIMIT} prompts per day. Your limit resets tomorrow — come back then!`,
      limitReached: true,
    }, { status: 429 });
  }

  usage.set(usageKey, count + 1);

  // Input validation
  const typedMessages = messages as Array<{ role: string; content: string }>;
  const lastMsg   = typedMessages[typedMessages.length - 1]?.content ?? "";
  const sanitized = sanitizeInput(lastMsg);
  const wc        = countWords(sanitized);

  if (wc > MAX_WORDS) {
    usage.set(usageKey, count); // undo increment
    return NextResponse.json(
      { error: `Message too long (${wc} words). Keep prompts under ${MAX_WORDS} words.` },
      { status: 400 }
    );
  }

  const safeMessages = typedMessages.map((m, i) =>
    i === typedMessages.length - 1 ? { ...m, content: sanitized } : m
  );

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  console.log(`[chat] role=${role} ip_hash=${Buffer.from(ip).toString("base64").slice(0,8)} words=${wc} count=${count+1}/${DAILY_LIMIT}`);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system,
      messages: safeMessages,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Anthropic error:", res.status, JSON.stringify(data).slice(0, 200));
    return NextResponse.json({ error: "AI service error. Please try again." }, { status: 502 });
  }

  // Continuation prompt on token limit
  const stopReason = data.stop_reason;
  if (stopReason === "max_tokens") {
    const textBlock = data.content?.find((b: { type: string; text?: string }) => b.type === "text");
    if (textBlock) {
      textBlock.text = textBlock.text.trimEnd() +
        "\n\n---\n✂️ **That's part one!** Reply **\"continue\"** and I'll pick up right where I left off.";
    }
  }

  const remaining = DAILY_LIMIT - (usage.get(usageKey) ?? 1);
  const response  = NextResponse.json(data);
  response.headers.set("X-Prompts-Remaining", String(remaining));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}