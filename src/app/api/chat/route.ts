import { NextRequest, NextResponse } from "next/server";

const DAILY_LIMIT = 5;
const MAX_WORDS = 200;

// In-memory store: { ip: { count, date } }
const usage = new Map<string, { count: number; date: string }>();

function getToday() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  const today = getToday();

  // Rate limit check
  const record = usage.get(ip);
  if (record && record.date === today) {
    if (record.count >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: `Daily limit reached. You can send ${DAILY_LIMIT} prompts per day. Come back tomorrow!` },
        { status: 429 }
      );
    }
    record.count += 1;
  } else {
    usage.set(ip, { count: 1, date: today });
  }

  const body = await req.json();
  const { messages, system } = body;

  // Word limit check on the latest user message
  const lastMessage = messages?.[messages.length - 1]?.content ?? "";
  const wordCount = countWords(lastMessage);
  if (wordCount > MAX_WORDS) {
    // Undo the count increment since request is rejected
    const r = usage.get(ip)!;
    r.count = Math.max(0, r.count - 1);
    return NextResponse.json(
      { error: `Your message is too long (${wordCount} words). Please keep prompts under ${MAX_WORDS} words.` },
      { status: 400 }
    );
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system,
      messages,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Anthropic API error:", JSON.stringify(data));
    return NextResponse.json({ error: data }, { status: res.status });
  }

  // Return remaining prompts in header so UI can display it
  const remaining = DAILY_LIMIT - (usage.get(ip)?.count ?? 1);
  const response = NextResponse.json(data);
  response.headers.set("X-Prompts-Remaining", String(remaining));
  return response;
}