import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST — save a prompt + response
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { sessionId, userMsg, assistantMsg } = await req.json();
    if (!userMsg || !assistantMsg)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    const { error } = await supabase.from("prompt_history").insert({
      session_id:        sessionId ?? "anonymous",
      user_message:      userMsg,
      assistant_message: assistantMsg,
      created_at:        new Date().toISOString(),
    });
    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("History POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET — fetch last 50 prompts across all sessions, newest first
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("prompt_history")
      .select("id, session_id, user_message, assistant_message, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("Supabase fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("History GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}