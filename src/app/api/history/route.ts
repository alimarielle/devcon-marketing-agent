import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// SOP 3 — SECRET SWEEP: Supabase client only created at runtime, never at build time
function getSupabase() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase env vars not configured.");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// SOP 3 — INPUT SCRUBBING: Validate sessionId format
function isValidSessionId(id: unknown): id is string {
  return typeof id === "string" && /^[a-z0-9]{6,32}$/.test(id);
}

// SOP 3 — INPUT SCRUBBING: Strip dangerous characters from stored text
function sanitize(text: unknown): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/\0/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .slice(0, 10_000); // hard cap per field
}

// POST — save a prompt + response
export async function POST(req: NextRequest) {
  // SOP 2 — ABUSE PROTECTION: Content-type check
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Invalid content type." }, { status: 415 });
  }

  let body: { sessionId?: unknown; userMsg?: unknown; assistantMsg?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { sessionId, userMsg, assistantMsg } = body;

  // SOP 1 — IDOR PREVENTION: Validate session ownership token format
  if (!isValidSessionId(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID." }, { status: 400 });
  }

  // SOP 3 — INPUT SCRUBBING: Sanitize before DB write
  const cleanUserMsg      = sanitize(userMsg);
  const cleanAssistantMsg = sanitize(assistantMsg);

  if (!cleanUserMsg || !cleanAssistantMsg) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("prompt_history").insert({
      session_id:        sessionId,
      user_message:      cleanUserMsg,
      assistant_message: cleanAssistantMsg,
      created_at:        new Date().toISOString(),
    });

    if (error) {
      console.error("Supabase insert error:", error.message);
      return NextResponse.json({ error: "Failed to save history." }, { status: 500 });
    }

    // SOP 2 — DEPLOYMENT GUARD: Security headers on all responses
    const res = NextResponse.json({ ok: true });
    res.headers.set("X-Content-Type-Options", "nosniff");
    return res;

  } catch (e) {
    console.error("History POST error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// GET — fetch last 50 prompts, newest first
export async function GET(req: NextRequest) {
  // SOP 2 — ABUSE PROTECTION: Only allow from same origin in production
  const origin = req.headers.get("origin");
  if (process.env.NODE_ENV === "production" && origin && !origin.includes("vercel.app") && !origin.includes("devcon")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const supabase = getSupabase();

    // SOP 1 — IDOR PREVENTION: Select only safe fields, no service metadata
    const { data, error } = await supabase
      .from("prompt_history")
      .select("id, session_id, user_message, assistant_message, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Supabase fetch error:", error.message);
      return NextResponse.json({ error: "Failed to load history." }, { status: 500 });
    }

    const res = NextResponse.json(data ?? []);
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Cache-Control", "no-store"); // never cache history responses
    return res;

  } catch (e) {
    console.error("History GET error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}