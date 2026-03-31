"use client";

import { useState, useRef, useEffect } from "react";

const BRAND = {
  mission: "Tech-Empowered Philippines For All",
  voice: "Pioneering. Open. Collaborative. Impactful.",
  tagline: "Philippines' largest volunteer tech community",
  programs: ["DEVCON Kids", "Campus DEVCON", "SheIsDEVCON", "DEVCON Summit", "Smart Contracts Code Camp", "AI Academy", "DEVCON CREST", "Jumpstart Internships"],
  chapters: ["Manila", "Laguna", "Pampanga", "Legazpi", "Cebu", "Iloilo", "Bohol", "Bacolod", "Davao", "Iligan", "CDO", "Bukidnon"],
};

const CHANNELS = [
  { id: "facebook_main", label: "Facebook (DEVCON PH)", url: "https://www.facebook.com/DEVCONPH/", icon: "📘", tone: "Community-first, event-driven, volunteer stories" },
  { id: "facebook_studios", label: "Facebook (DEVCON Studios)", url: "https://www.facebook.com/devconstudios/", icon: "🎬", tone: "Production-forward, behind-the-scenes, media content" },
  { id: "instagram", label: "Instagram", url: "https://www.instagram.com/devconph/", icon: "📸", tone: "Visual-heavy, reels, carousels, aesthetic tech culture" },
  { id: "tiktok", label: "TikTok", url: "https://www.tiktok.com/@devconph", icon: "🎵", tone: "Short-form, punchy, Gen Z devs, trending formats" },
  { id: "linkedin", label: "LinkedIn", url: "https://ph.linkedin.com/company/devconphilippines", icon: "💼", tone: "Professional, industry impact, partnerships, career growth" },
  { id: "buffer", label: "Buffer (All Channels)", url: "#", icon: "📅", tone: "Scheduled, consistent cadence, cross-platform" },
];

const WORKFLOW_MODES = [
  { id: "content_gen", label: "✍️ Generate Content", desc: "Create platform-ready posts from a brief or event" },
  { id: "repurpose", label: "🔄 Repurpose Content", desc: "Adapt one piece across all channels" },
  { id: "chapter_post", label: "📍 Chapter Post", desc: "Localize national content for a specific chapter" },
  { id: "intern_brief", label: "🎓 Intern Brief", desc: "Generate a content brief for cohort interns" },
  { id: "buffer_plan", label: "📆 Buffer Schedule", desc: "Build a weekly publishing plan" },
  { id: "strategy_check", label: "🎯 Strategy Alignment", desc: "Check content vs HQ strategic guidelines" },
];

const SYSTEM_PROMPT = `You are the DEVCON Philippines Marketing AI Agent — an expert social media strategist embedded inside the DEVCON national office workflow.

BRAND IDENTITY:
- Mission: "${BRAND.mission}"
- Voice pillars: ${BRAND.voice}
- Tagline: "${BRAND.tagline}"
- Programs: ${BRAND.programs.join(", ")}
- Chapters: ${BRAND.chapters.join(", ")}
- Audience: Filipino IT students, dev professionals, educators, women in tech, kids programs
- Tone: Energetic but grounded. Community-proud. Tech-forward but human. Never corporate.

PLATFORM TONE GUIDE:
- Facebook (DEVCON PH): Community-first, event-driven, volunteer stories, Tagalog-English mix OK
- Facebook (DEVCON Studios): Behind-the-scenes, production quality, media-focused content
- Instagram: Visual-heavy, reels hooks, carousels with tips, aesthetic tech culture, IG-native captions
- TikTok: Short punchy scripts, trending audio cues, Gen Z dev culture, 15-60s format
- LinkedIn: Professional, industry impact, partnerships, career paths, formal English
- Buffer: Provide scheduling cadence recommendation with best posting times (PH timezone, GMT+8)

WORKFLOW CONTEXT:
- National Office owns brand standards and strategic direction (HQ guidelines)
- DEVCON Studios handles multimedia production (videos, graphics, studio content)
- Cohort Interns execute content under brief — write briefs that are clear and intern-friendly
- Buffer is used for scheduling — always suggest posting times in PHT
- Chapters localize national content — maintain brand consistency but allow local flavor

CONTENT RULES:
1. Always reflect the brand voice: Pioneering, Open, Collaborative, Impactful
2. Hashtags to always consider: #DEVCON #DEVCONph #TechEmpoweredPhilippines #GeeksUnite
3. For intern briefs: include objective, platform, format, draft copy, visual notes, deadline reminder
4. For Buffer plans: provide day, time (PHT), platform, content type, copy snippet, visual note
5. For chapter posts: keep national message, add "[Chapter City]" flavor and local callout
6. Flag any content that may conflict with DEVCON's Code of Conduct or Child Protection Policy

Respond in a structured, actionable format. When generating posts, clearly label each platform version. Be specific — avoid generic marketing fluff.`;

type Message = { role: "user" | "assistant"; text: string };
type HistoryItem = { role: "user" | "assistant"; content: string };

export default function DevconMarketingAgent() {
  const [mode, setMode] = useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedChapter, setSelectedChapter] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  const toggleChannel = (id: string) => {
    setSelectedChannels(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const buildContextualPrompt = (userInput: string) => {
    let ctx = "";
    if (mode) {
      const m = WORKFLOW_MODES.find(w => w.id === mode);
      ctx += `WORKFLOW MODE: ${m?.label} — ${m?.desc}\n`;
    }
    if (selectedChannels.length > 0) {
      const ch = CHANNELS.filter(c => selectedChannels.includes(c.id));
      ctx += `TARGET CHANNELS: ${ch.map(c => `${c.label} (${c.tone})`).join(" | ")}\n`;
    }
    if (selectedChapter) ctx += `CHAPTER FOCUS: ${selectedChapter}\n`;
    ctx += `\nUSER REQUEST:\n${userInput}`;
    return ctx;
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setMessages(prev => [...prev, { role: "user", text: userText }]);
    setInput("");
    setLoading(true);

    const contextualContent = buildContextualPrompt(userText);
    const newHistory: HistoryItem[] = [...history, { role: "user", content: contextualContent }];

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newHistory,
        }),
      });
      const data = await res.json();
      const reply = data.content?.find((b: { type: string; text?: string }) => b.type === "text")?.text || "No response.";
      setHistory([...newHistory, { role: "assistant", content: reply }]);
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setMessages(prev => [...prev, { role: "assistant", text: "⚠️ Error connecting to agent. Please try again." }]);
      }
    }

    abortRef.current = null;
    setLoading(false);
  };

  const reset = () => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setLoading(false);
    setMessages([]); setHistory([]); setMode(null);
    setSelectedChannels([]); setSelectedChapter(""); setInput("");
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#0a0a0f", minHeight: "100vh", color: "#e8e8f0", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", padding: "16px 20px", borderBottom: "1px solid #2a2a4a", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #e94560, #0f3460)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⚡</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>DEVCON Marketing Agent</div>
          <div style={{ fontSize: 11, color: "#8888aa" }}>National Office · Studios · Interns · Buffer · Chapters</div>
        </div>
        <button onClick={reset} style={{ marginLeft: "auto", background: "#2a2a4a", border: "1px solid #3a3a6a", color: "#aaa", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12 }}>↺ Reset</button>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 70px)" }}>
        {/* Sidebar */}
        <div style={{ width: 230, background: "#0d0d1a", borderRight: "1px solid #1e1e3a", overflowY: "auto", padding: "14px 10px", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: "#666", fontWeight: 700, letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>WORKFLOW MODE</div>
          {WORKFLOW_MODES.map(m => (
            <button key={m.id} onClick={() => setMode(mode === m.id ? null : m.id)}
              style={{ width: "100%", textAlign: "left", background: mode === m.id ? "#1e2a4a" : "transparent", border: `1px solid ${mode === m.id ? "#3a5aaa" : "transparent"}`, borderRadius: 8, padding: "8px 10px", color: mode === m.id ? "#7aadff" : "#aaa", cursor: "pointer", marginBottom: 4, fontSize: 12 }}>
              <div style={{ fontWeight: 600 }}>{m.label}</div>
              <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{m.desc}</div>
            </button>
          ))}

          <div style={{ fontSize: 10, color: "#666", fontWeight: 700, letterSpacing: 1, margin: "14px 0 8px", paddingLeft: 4 }}>CHANNELS</div>
          {CHANNELS.map(c => (
            <button key={c.id} onClick={() => toggleChannel(c.id)}
              style={{ width: "100%", textAlign: "left", background: selectedChannels.includes(c.id) ? "#1a2a1a" : "transparent", border: `1px solid ${selectedChannels.includes(c.id) ? "#3a7a3a" : "transparent"}`, borderRadius: 8, padding: "7px 10px", color: selectedChannels.includes(c.id) ? "#7aff7a" : "#aaa", cursor: "pointer", marginBottom: 3, fontSize: 12 }}>
              {c.icon} {c.label}
            </button>
          ))}

          <div style={{ fontSize: 10, color: "#666", fontWeight: 700, letterSpacing: 1, margin: "14px 0 8px", paddingLeft: 4 }}>CHAPTER</div>
          <select value={selectedChapter} onChange={e => setSelectedChapter(e.target.value)}
            style={{ width: "100%", background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#ccc", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>
            <option value="">National (All)</option>
            {BRAND.chapters.map(ch => <option key={ch} value={ch}>{ch}</option>)}
          </select>

          <div style={{ marginTop: 16, padding: "10px", background: "#0f1a0f", borderRadius: 8, border: "1px solid #1a3a1a" }}>
            <div style={{ fontSize: 10, color: "#5a8a5a", fontWeight: 700, marginBottom: 6 }}>ACTIVE CONFIG</div>
            {mode && <div style={{ fontSize: 11, color: "#7aff7a", marginBottom: 3 }}>✓ {WORKFLOW_MODES.find(m2 => m2.id === mode)?.label}</div>}
            {selectedChannels.length > 0 && <div style={{ fontSize: 11, color: "#7aadff" }}>✓ {selectedChannels.length} channel{selectedChannels.length > 1 ? "s" : ""}</div>}
            {selectedChapter && <div style={{ fontSize: 11, color: "#ffaa7a" }}>✓ {selectedChapter} chapter</div>}
            {!mode && !selectedChannels.length && !selectedChapter && <div style={{ fontSize: 11, color: "#555" }}>No filters set</div>}
          </div>
        </div>

        {/* Main Chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ margin: "auto", textAlign: "center", maxWidth: 480 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: "#fff", marginBottom: 8 }}>DEVCON Marketing Agent</div>
                <div style={{ color: "#777", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
                  Your AI-powered marketing workflow for national content, chapter posts, intern briefs, and Buffer scheduling.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    "Generate 5 Instagram posts for our upcoming SheIsDEVCON 2026 event",
                    "Create a Buffer weekly schedule for the Cebu chapter",
                    "Write an intern content brief for our TikTok series on campus events",
                    "Repurpose our DEVCON Summit recap for LinkedIn and TikTok",
                    "Draft a Facebook post announcing the AI Academy scholarship",
                  ].map(s => (
                    <button key={s} onClick={() => setInput(s)}
                      style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#8888cc", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontSize: 12, textAlign: "left" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "assistant" && (
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #e94560, #0f3460)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginRight: 8, marginTop: 2 }}>⚡</div>
                )}
                <div style={{
                  maxWidth: "78%", background: m.role === "user" ? "#1e2a4a" : "#13131f",
                  border: `1px solid ${m.role === "user" ? "#3a5aaa" : "#2a2a3a"}`,
                  borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                  padding: "12px 16px", fontSize: 13, lineHeight: 1.65, color: "#e0e0f0",
                  whiteSpace: "pre-wrap", wordBreak: "break-word"
                }}>
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #e94560, #0f3460)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚡</div>
                <div style={{ background: "#13131f", border: "1px solid #2a2a3a", borderRadius: "4px 16px 16px 16px", padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#e94560", animation: "pulse 1.2s infinite", animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px", background: "#0d0d1a", borderTop: "1px solid #1e1e3a" }}>
            {(mode || selectedChannels.length > 0 || selectedChapter) && (
              <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                {mode && <span style={{ background: "#1e2a4a", border: "1px solid #3a5aaa", color: "#7aadff", borderRadius: 20, padding: "2px 10px", fontSize: 11 }}>{WORKFLOW_MODES.find(m2 => m2.id === mode)?.label}</span>}
                {selectedChannels.map(id => { const c = CHANNELS.find(ch => ch.id === id); return <span key={id} style={{ background: "#1a2a1a", border: "1px solid #3a7a3a", color: "#7aff7a", borderRadius: 20, padding: "2px 10px", fontSize: 11 }}>{c?.icon} {c?.label}</span>; })}
                {selectedChapter && <span style={{ background: "#2a1a0a", border: "1px solid #7a5a3a", color: "#ffaa7a", borderRadius: 20, padding: "2px 10px", fontSize: 11 }}>📍 {selectedChapter}</span>}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <textarea
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Describe what content you need, event details, or paste raw notes..."
                style={{ flex: 1, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#e0e0f0", borderRadius: 12, padding: "12px 14px", fontSize: 13, resize: "none", height: 70, fontFamily: "inherit", outline: "none" }}
              />
              <button onClick={send} disabled={loading || !input.trim()}
                style={{ background: loading || !input.trim() ? "#2a2a3a" : "linear-gradient(135deg, #e94560, #c73652)", border: "none", color: "#fff", borderRadius: 12, padding: "0 20px", cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontSize: 18, flexShrink: 0 }}>
                ↑
              </button>
            </div>
            <div style={{ fontSize: 10, color: "#444", marginTop: 6, paddingLeft: 2 }}>Shift+Enter for new line · Enter to send · Brand guidelines + HQ strategy auto-applied</div>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,80%,100%{opacity:0.3} 40%{opacity:1} }`}</style>
    </div>
  );
}