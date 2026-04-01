import { NextRequest, NextResponse } from "next/server";

// ── Config ────────────────────────────────────────────────────────────
const DAILY_LIMIT = 5;
const MAX_WORDS   = 200;
const MAX_BODY_BYTES = 32_768; // 32KB max request body

// ── In-memory rate limiter (per IP, resets daily) ─────────────────────
const usage = new Map<string, { count: number; date: string }>();

function getToday() { return new Date().toISOString().slice(0, 10); }

// SOP 1 — AUTH SHIELD: Extract real IP, never trust unverified headers blindly
function getIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim();
    // Basic IPv4/IPv6 validation
    if (/^[\d.a-fA-F:]+$/.test(ip)) return ip;
  }
  return req.headers.get("x-real-ip") || "unknown";
}

// SOP 3 — INPUT SCRUBBING: Word count + strip dangerous chars
function countWords(t: string): number {
  return t.trim().split(/\s+/).filter(Boolean).length;
}

function sanitizeInput(text: string): string {
  // Remove null bytes, control characters, and potential script injection
  return text
    .replace(/\0/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
}

function validateMessages(messages: unknown): boolean {
  if (!Array.isArray(messages)) return false;
  if (messages.length > 50) return false; // cap conversation history
  for (const m of messages) {
    if (typeof m !== "object" || m === null) return false;
    const msg = m as Record<string, unknown>;
    if (!["user", "assistant"].includes(msg.role as string)) return false;
    if (typeof msg.content !== "string") return false;
    if ((msg.content as string).length > 20_000) return false; // per-message cap
  }
  return true;
}

export async function POST(req: NextRequest) {
  // SOP 2 — DEPLOYMENT GUARD: Enforce HTTPS in production
  if (process.env.NODE_ENV === "production") {
    const proto = req.headers.get("x-forwarded-proto");
    if (proto && proto !== "https") {
      return NextResponse.json({ error: "HTTPS required." }, { status: 400 });
    }
  }

  // SOP 2 — ABUSE PROTECTION: Check content-type
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Invalid content type." }, { status: 415 });
  }

  // SOP 2 — ABUSE PROTECTION: Cap request body size
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }

  // SOP 1 — AUTH SHIELD: Rate limit by IP
  const ip    = getIP(req);
  const today = getToday();
  const record = usage.get(ip);
  if (record && record.date === today) {
    if (record.count >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: `Daily limit reached. You have ${DAILY_LIMIT} prompts per day. Come back tomorrow!` },
        { status: 429 }
      );
    }
    record.count += 1;
  } else {
    usage.set(ip, { count: 1, date: today });
  }

  // SOP 3 — INPUT SCRUBBING: Parse and validate body
  let body: { messages?: unknown; system?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    const r = usage.get(ip)!;
    r.count = Math.max(0, r.count - 1);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { messages, system, sessionId } = body;

  // Validate messages array structure
  if (!validateMessages(messages)) {
    const r = usage.get(ip)!;
    r.count = Math.max(0, r.count - 1);
    return NextResponse.json({ error: "Invalid messages format." }, { status: 400 });
  }

  // Validate system prompt is a string
  if (typeof system !== "string" || system.length > 10_000) {
    const r = usage.get(ip)!;
    r.count = Math.max(0, r.count - 1);
    return NextResponse.json({ error: "Invalid system prompt." }, { status: 400 });
  }

  // Validate sessionId
  if (typeof sessionId !== "string" || !/^[a-z0-9]{6,32}$/.test(sessionId)) {
    const r = usage.get(ip)!;
    r.count = Math.max(0, r.count - 1);
    return NextResponse.json({ error: "Invalid session." }, { status: 400 });
  }

  // SOP 3 — INPUT SCRUBBING: Sanitize last user message + word limit
  const typedMessages = messages as Array<{ role: string; content: string }>;
  const lastMsg = typedMessages[typedMessages.length - 1]?.content ?? "";
  const sanitized = sanitizeInput(lastMsg);
  const wc = countWords(sanitized);

  if (wc > MAX_WORDS) {
    const r = usage.get(ip)!;
    r.count = Math.max(0, r.count - 1);
    return NextResponse.json(
      { error: `Message too long (${wc} words). Keep prompts under ${MAX_WORDS} words.` },
      { status: 400 }
    );
  }

  // Replace last message content with sanitized version
  const safeMessages = typedMessages.map((m, i) =>
    i === typedMessages.length - 1 ? { ...m, content: sanitized } : m
  );

  // SOP 3 — SECRET SWEEP: API key only from env, never from client
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  // SOP 2 — DEPLOYMENT GUARD: Log unusual traffic (no PII)
  console.log(`[chat] ip_hash=${Buffer.from(ip).toString("base64").slice(0,8)} words=${wc} msgs=${safeMessages.length}`);

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

  const remaining = DAILY_LIMIT - (usage.get(ip)?.count ?? 1);
  const response  = NextResponse.json(data);

  // SOP 2 — DEPLOYMENT GUARD: Security headers
  response.headers.set("X-Prompts-Remaining", String(remaining));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}