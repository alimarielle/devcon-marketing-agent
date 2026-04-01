import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST — save a prompt + response
export async function POST(req: NextRequest) {
  const { sessionId, userMsg, assistantMsg } = await req.json();
  const { error } = await supabase.from("prompt_history").insert({
    session_id:    sessionId,
    user_message:  userMsg,
    assistant_message: assistantMsg,
    created_at:    new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// GET — fetch history for a session
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const { data, error } = await supabase
    .from("prompt_history")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}