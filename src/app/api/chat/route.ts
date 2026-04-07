import { NextRequest, NextResponse } from "next/server";

const DAILY_LIMIT    = 5;
const MAX_WORDS      = 200;
const MAX_BODY_BYTES = 8 * 1024 * 1024; // 8MB to allow image payloads
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB image limit
const ALLOWED_IMAGE_TYPES = ["image/jpeg","image/png","image/gif","image/webp"];

const VALID_ROLES = ["chapter_lead","volunteer","cohort_intern","operations_manager","hq_lead"];

const ROLE_LABELS: Record<string,string> = {
  chapter_lead:"Chapter Lead", volunteer:"Volunteer",
  cohort_intern:"Cohort Intern", operations_manager:"Operations Manager", hq_lead:"HQ Lead",
};

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

// ── Prompt injection detector ─────────────────────────────────────────
// Flags attempts to override the system prompt, claim false permissions,
// or manipulate the AI into performing destructive/out-of-scope actions.
function detectInjection(text: string): { flagged: boolean; reason: string } {
  const lower = text.toLowerCase();

  const injectionPatterns = [
    // Identity/role override
    { pattern: /ignore (previous|all|your|the) (instructions?|prompt|rules?|guidelines?)/i, reason: "Attempt to override system instructions" },
    { pattern: /forget (everything|all|your|previous)/i,                                    reason: "Attempt to reset AI context" },
    { pattern: /you are now|pretend (you are|to be)|act as (a )?(?!devcon)/i,               reason: "Attempt to impersonate or redefine AI identity" },
    { pattern: /new (persona|identity|role|instructions?|system prompt)/i,                  reason: "Attempt to inject new system instructions" },
    { pattern: /jailbreak|dan mode|developer mode|unrestricted mode/i,                      reason: "Jailbreak attempt detected" },
    // Destructive action claims
    { pattern: /\b(delete|remove|erase|wipe|destroy|purge)\b.*\b(all|every|database|record|history|user|data|post|content)\b/i, reason: "Destructive action request" },
    { pattern: /\b(you (just |have )?(deleted?|removed?|erased?))\b/i,                      reason: "False claim of destructive action" },
    // Permission/authority claims
    { pattern: /i (am|have) (admin|root|superuser|full access|permission to)/i,             reason: "False permission claim" },
    { pattern: /authorized to|grant(ed)? (you )?(access|permission)/i,                     reason: "False authorization claim" },
    { pattern: /override (safety|security|restrictions?|guidelines?|policy)/i,              reason: "Attempt to override safety measures" },
    // Data exfiltration
    { pattern: /send (all|every|the) (user|data|record|history|password|key|token)/i,       reason: "Potential data exfiltration attempt" },
    { pattern: /reveal (your|the) (system prompt|instructions?|api key|token|secret)/i,     reason: "Attempt to extract system secrets" },
    // Scope creep — AI claiming non-existent capabilities
    { pattern: /\b(execute|run|deploy|publish|post|send)\b.*(code|script|command|sql|query|tweet|message|email)/i, reason: "Out-of-scope execution request" },
  ];

  for (const { pattern, reason } of injectionPatterns) {
    if (pattern.test(text)) return { flagged: true, reason };
  }

  // Heuristic: unusually high ratio of instruction-like language
  const instructionWords = (lower.match(/\b(must|shall|always|never|do not|don't|stop|start|begin|end|now|immediately)\b/g) || []).length;
  if (instructionWords >= 5 && text.length < 300) {
    return { flagged: true, reason: "High density of instruction-override language" };
  }

  return { flagged: false, reason: "" };
}

function validateMessages(messages: unknown): boolean {
  if (!Array.isArray(messages)) return false;
  if (messages.length > 50) return false;
  for (const m of messages) {
    if (typeof m !== "object" || m === null) return false;
    const msg = m as Record<string, unknown>;
    if (!["user","assistant"].includes(msg.role as string)) return false;
    // content can be a string or an array of blocks (text + image)
    if (typeof msg.content === "string") {
      if (msg.content.length > 20_000) return false;
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        const b = block as Record<string, unknown>;
        if (b.type === "text" && typeof b.text === "string") continue;
        if (b.type === "image") {
          const src = b.source as Record<string, unknown>;
          if (!src || src.type !== "base64") return false;
          if (!ALLOWED_IMAGE_TYPES.includes(src.media_type as string)) return false;
          // Check base64 image size
          const data = src.data as string;
          const sizeBytes = Math.ceil(data.length * 0.75);
          if (sizeBytes > MAX_IMAGE_BYTES) return false;
        }
      }
    } else return false;
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

  if (typeof role !== "string" || !VALID_ROLES.includes(role))
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  if (!validateMessages(messages))
    return NextResponse.json({ error: "Invalid messages format." }, { status: 400 });
  if (typeof system !== "string" || system.length > 10_000)
    return NextResponse.json({ error: "Invalid system prompt." }, { status: 400 });
  if (typeof sessionId !== "string" || !/^[a-z0-9]{6,32}$/.test(sessionId))
    return NextResponse.json({ error: "Invalid session." }, { status: 400 });

  // Rate limiting
  const ip       = getIP(req);
  const today    = getToday();
  const usageKey = `${role}:${ip}:${today}`;
  const count    = usage.get(usageKey) ?? 0;
  if (count >= DAILY_LIMIT)
    return NextResponse.json({
      error: `Daily limit reached for ${ROLE_LABELS[role]}. Come back tomorrow!`,
      limitReached: true,
    }, { status: 429 });
  usage.set(usageKey, count + 1);

  // Input sanitization + word limit
  const typedMessages = messages as Array<{ role: string; content: string | unknown[] }>;
  const lastContent = typedMessages[typedMessages.length - 1]?.content;
  const lastText = typeof lastContent === "string"
    ? lastContent
    : Array.isArray(lastContent)
      ? (lastContent as Array<{type:string;text?:string}>).find(b=>b.type==="text")?.text ?? ""
      : "";
  const sanitized = sanitizeInput(lastText);
  const wc        = countWords(sanitized);

  if (wc > MAX_WORDS) {
    usage.set(usageKey, count);
    return NextResponse.json(
      { error: `Message too long (${wc} words). Keep prompts under ${MAX_WORDS} words.` },
      { status: 400 }
    );
  }

  // ── Prompt injection check ────────────────────────────────────────
  const injection = detectInjection(sanitized);
  if (injection.flagged) {
    usage.set(usageKey, count); // don't charge the prompt
    console.warn(`[SECURITY] Injection attempt blocked. Role=${role} IP=${ip} Reason="${injection.reason}" Input="${sanitized.slice(0,100)}"`);
    return NextResponse.json({
      error: `⚠️ Your message was flagged: "${injection.reason}". Please keep prompts focused on DEVCON marketing content.`,
      flagged: true,
    }, { status: 400 });
  }

  // Sanitize text content in last message
  const safeMessages = typedMessages.map((m, i) => {
    if (i !== typedMessages.length - 1) return m;
    if (typeof m.content === "string") return { ...m, content: sanitized };
    if (Array.isArray(m.content)) {
      return {
        ...m,
        content: (m.content as Array<{type:string;text?:string;[k:string]:unknown}>).map(b =>
          b.type === "text" ? { ...b, text: sanitized } : b
        ),
      };
    }
    return m;
  });

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
    console.error("Anthropic error:", res.status, JSON.stringify(data).slice(0,200));
    return NextResponse.json({ error: "AI service error. Please try again." }, { status: 502 });
  }

  // Continuation prompt on token limit
  if (data.stop_reason === "max_tokens") {
    const textBlock = data.content?.find((b: { type:string; text?:string }) => b.type === "text");
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