import { NextRequest, NextResponse } from "next/server";

const MAX_BODY_BYTES = 32_768;
const DAILY_LIMIT   = 5;

const VALID_ROLES = ["chapter_lead","volunteer","cohort_intern","operations_manager","hq_lead"];
const VALID_TYPES = ["carousel","fb_post","poster","thumb_vertical","thumb_landscape"];

const usage = new Map<string, { count: number; date: string }>();
function getToday() { return new Date().toISOString().slice(0, 10); }
function getIP(req: NextRequest): string {
  const f = req.headers.get("x-forwarded-for");
  if (f) { const ip = f.split(",")[0].trim(); if (/^[\d.a-fA-F:]+$/.test(ip)) return ip; }
  return req.headers.get("x-real-ip") || "unknown";
}

const VISUAL_SYSTEM = `You are a visual content designer for DEVCON Studios Philippines. Generate structured JSON for branded social media visuals.

DEVCON brand: Mission "Tech-Empowered Philippines For All". Voice: Pioneering, Open, Collaborative, Impactful.
Colors: navy #1A2A4A, dark navy #111B2E, sky blue #4DC8E8, bright blue #2B7DE9, coral #E8574A, purple #8B4FD8, gold #F5C842, teal #1BA8A0.
Always include DEVCON branding and hashtags (#DEVCON #DEVCONph #TechEmpoweredPhilippines #16YearsofDEVCON).

You must respond with ONLY valid JSON, no markdown, no explanation, no backticks.

For CAROUSEL: {"type":"carousel","slides":[{"slideNumber":1,"title":"...","subtitle":"...","body":"...","highlight":"...","tag":"..."}]} — 4 to 6 slides. First slide is cover, last slide is CTA.

For FB_POST, THUMB_VERTICAL, THUMB_LANDSCAPE: {"type":"fb_post","headline":"...","subheadline":"...","body":"...","cta":"...","hashtags":"...","badge":"..."}

For POSTER: {"type":"poster","eventName":"...","tagline":"...","date":"...","time":"...","location":"...","details":["...","..."],"cta":"...","badge":"..."}

Keep copy punchy. Max 10 words per title/headline, 20 words per body line. No superlatives.`;

export async function POST(req: NextRequest) {
  if (!req.headers.get("content-type")?.includes("application/json"))
    return NextResponse.json({ error: "Invalid content type." }, { status: 415 });

  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_BODY_BYTES)
    return NextResponse.json({ error: "Request too large." }, { status: 413 });

  const ip    = getIP(req);
  const today = getToday();
  const record = usage.get(ip);
  if (record && record.date === today) {
    if (record.count >= DAILY_LIMIT)
      return NextResponse.json({ error: "Daily limit reached. Come back tomorrow!" }, { status: 429 });
    record.count += 1;
  } else {
    usage.set(ip, { count: 1, date: today });
  }

  let body: { prompt?: unknown; visualType?: unknown; role?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  const { prompt, visualType, role } = body;

  if (typeof prompt !== "string" || prompt.length < 5 || prompt.length > 2000)
    return NextResponse.json({ error: "Invalid prompt." }, { status: 400 });
  if (!VALID_TYPES.includes(visualType as string))
    return NextResponse.json({ error: "Invalid visual type." }, { status: 400 });
  if (typeof role !== "string" || !VALID_ROLES.includes(role))
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });

  // Thumbnails reuse fb_post JSON schema — map to correct schema type for the prompt
  const schemaType =
    visualType === "thumb_vertical" || visualType === "thumb_landscape"
      ? "FB_POST"
      : (visualType as string).toUpperCase().replace("_", "_");

  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: VISUAL_SYSTEM,
      messages: [{ role: "user", content: `Create a ${schemaType} for: ${prompt}` }],
    }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: "AI service error." }, { status: 502 });

  const text = data.content?.find((b: { type: string }) => b.type === "text")?.text || "";
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const json  = JSON.parse(clean);
    // Override type to preserve thumb_vertical / thumb_landscape
    json.type = visualType;
    const remaining = DAILY_LIMIT - (usage.get(ip)?.count ?? 1);
    const response  = NextResponse.json(json);
    response.headers.set("X-Prompts-Remaining", String(remaining));
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  } catch {
    return NextResponse.json({ error: "Failed to parse visual content." }, { status: 500 });
  }
}