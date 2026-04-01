"use client";

import { useState, useRef, useEffect } from "react";

const BRAND = {
  mission: "Tech-Empowered Philippines For All",
  voice: "Pioneering. Open. Collaborative. Impactful.",
  programs: ["DEVCON Kids","Campus DEVCON","SheIsDEVCON","DEVCON Summit","Smart Contracts Code Camp","AI Academy","DEVCON CREST","Jumpstart Internships"],
  chapters: ["Manila","Laguna","Pampanga","Legazpi","Cebu","Iloilo","Bohol","Bacolod","Davao","Iligan","CDO","Bukidnon"],
};

const SYSTEM_PROMPT = `You are the DEVCON Philippines Marketing AI Agent — an expert social media strategist embedded inside the DEVCON national office workflow.
BRAND: Mission: "${BRAND.mission}" | Voice: ${BRAND.voice} | Programs: ${BRAND.programs.join(", ")} | Chapters: ${BRAND.chapters.join(", ")}
AUDIENCE: Filipino IT students, dev professionals, educators, women in tech, kids programs.
TONE: Energetic but grounded. Community-proud. Tech-forward but human. Never corporate.
PLATFORMS: Facebook (community, Taglish OK) | Instagram (visual, reels, carousels) | TikTok (punchy, Gen Z, 15-60s scripts) | LinkedIn (professional, formal English) | Buffer (PHT scheduling)
RULES: 1) Always reflect: Pioneering, Open, Collaborative, Impactful. 2) Hashtags: #DEVCON #DEVCONph #TechEmpoweredPhilippines #GeeksUnite 3) Intern briefs: include objective, platform, format, draft copy, visual notes. 4) Buffer plans: day + PHT time + platform + copy + visual note. 5) Chapter posts: keep national message, add local flavor. 6) Flag Code of Conduct or Child Protection Policy conflicts.
Respond in structured, actionable format. Label each platform version clearly.`;

const MODES = [
  { id:"content_gen", label:"Generate Content", icon:"✦" },
  { id:"repurpose",   label:"Repurpose Content", icon:"⟳" },
  { id:"chapter_post",label:"Chapter Post", icon:"◈" },
  { id:"intern_brief",label:"Intern Brief", icon:"◉" },
  { id:"buffer_plan", label:"Buffer Schedule", icon:"◎" },
  { id:"strategy",    label:"Strategy Alignment", icon:"△" },
];

const CHANNELS = [
  { id:"fb_main",    label:"Facebook DEVCON PH",     icon:"▣" },
  { id:"fb_studios", label:"Facebook DEVCON Studios", icon:"▣" },
  { id:"instagram",  label:"Instagram",               icon:"◷" },
  { id:"tiktok",     label:"TikTok",                  icon:"▷" },
  { id:"linkedin",   label:"LinkedIn",                icon:"▦" },
  { id:"buffer",     label:"Buffer",                  icon:"◈" },
];

const CHAPTERS = ["Manila","Laguna","Pampanga","Legazpi","Cebu","Iloilo","Bohol","Bacolod","Davao","Iligan","CDO","Bukidnon"];

const STARTER_CARDS = [
  { icon:"◷", text:"Generate 5 Instagram posts for SheIsDEVCON 2026" },
  { icon:"◈", text:"Create a Buffer weekly schedule for the Cebu chapter" },
  { icon:"◉", text:"Write an intern content brief for our TikTok series on campus events" },
  { icon:"⟳", text:"Repurpose our DEVCON Summit recap for LinkedIn and TikTok" },
  { icon:"▣", text:"Draft a Facebook post announcing the AI Academy scholarship" },
];

type Msg = { role:"user"|"assistant"; text:string };
type HistItem = { role:"user"|"assistant"; content:string };

export default function App() {
  const [mode, setMode]     = useState<string|null>(null);
  const [channels, setChannels] = useState<string[]>([]);
  const [chapter, setChapter]   = useState("");
  const [input, setInput]       = useState("");
  const [msgs, setMsgs]         = useState<Msg[]>([]);
  const [hist, setHist]         = useState<HistItem[]>([]);
  const [loading, setLoading]   = useState(false);
  const [remaining, setRemaining] = useState<number|null>(null);
  const [sessionId]  = useState(() => Math.random().toString(36).slice(2));
  const abortRef = useRef<AbortController|null>(null);
  const chatRef  = useRef<HTMLDivElement>(null);

  const MAX_WORDS = 200;
  const wc = input.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [msgs, loading]);

  const toggleCh = (id:string) =>
    setChannels(p => p.includes(id) ? p.filter(c=>c!==id) : [...p,id]);

  const buildPrompt = (t:string) => {
    let c = "";
    if (mode) { const m=MODES.find(x=>x.id===mode); c+=`MODE: ${m?.label}\n`; }
    if (channels.length) {
      const ch=CHANNELS.filter(x=>channels.includes(x.id));
      c+=`CHANNELS: ${ch.map(x=>x.label).join(", ")}\n`;
    }
    if (chapter) c+=`CHAPTER: ${chapter}\n`;
    return c+`\nREQUEST:\n${t}`;
  };

  const send = async (text?:string) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setMsgs(p=>[...p,{role:"user",text:userText}]);
    setInput("");
    setLoading(true);

    const newHist:HistItem[] = [...hist,{role:"user",content:buildPrompt(userText)}];
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/chat", {
        method:"POST", signal:ctrl.signal,
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ messages:newHist, system:SYSTEM_PROMPT, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsgs(p=>[...p,{role:"assistant",text:`⚠️ ${data.error||"Something went wrong."}`}]);
      } else {
        const reply = data.content?.find((b:{type:string;text?:string})=>b.type==="text")?.text||"No response.";
        setHist([...newHist,{role:"assistant",content:reply}]);
        setMsgs(p=>[...p,{role:"assistant",text:reply}]);
        const rem = res.headers.get("X-Prompts-Remaining");
        if (rem!==null) setRemaining(Number(rem));

        // Save to Supabase history
        await fetch("/api/history", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({ sessionId, userMsg:userText, assistantMsg:reply }),
        }).catch(()=>{});
      }
    } catch(e:unknown) {
      if (e instanceof Error && e.name!=="AbortError")
        setMsgs(p=>[...p,{role:"assistant",text:"⚠️ Connection error. Please try again."}]);
    }
    abortRef.current=null; setLoading(false);
  };

  const reset = () => {
    abortRef.current?.abort(); abortRef.current=null;
    setLoading(false); setMsgs([]); setHist([]);
    setMode(null); setChannels([]); setChapter(""); setInput("");
  };

  const activeMode = MODES.find(m=>m.id===mode);

  return (
    <div style={S.root}>
      {/* ── SIDEBAR ── */}
      <aside style={S.sidebar}>
        <div style={S.sideTop}>
          <div style={S.logo}>
            <span style={S.logoIcon}>⚡</span>
            <div>
              <div style={S.logoTitle}>DEVCON</div>
              <div style={S.logoSub}>Marketing Agent</div>
            </div>
          </div>

          <div style={S.sectionLabel}>WORKFLOW MODE</div>
          {MODES.map(m=>(
            <button key={m.id} onClick={()=>setMode(mode===m.id?null:m.id)}
              style={{...S.sideBtn, ...(mode===m.id ? S.sideBtnActive : {})}}>
              <span style={S.sideBtnIcon}>{m.icon}</span>
              {m.label}
            </button>
          ))}

          <div style={{...S.sectionLabel, marginTop:20}}>CHANNEL</div>
          {CHANNELS.map(c=>(
            <button key={c.id} onClick={()=>toggleCh(c.id)}
              style={{...S.sideBtn, ...(channels.includes(c.id) ? S.sideBtnActive : {})}}>
              <span style={S.sideBtnIcon}>{c.icon}</span>
              {c.label}
            </button>
          ))}

          <div style={{...S.sectionLabel, marginTop:20}}>CHAPTER</div>
          <select value={chapter} onChange={e=>setChapter(e.target.value)} style={S.select}>
            <option value="">National</option>
            {CHAPTERS.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={S.sideBottom}>
          {remaining!==null && (
            <div style={{...S.pill, background: remaining<=1?"#3a1a1a": remaining<=2?"#2a2010":"#0f1a10",
              color: remaining<=1?"#ff6b6b": remaining<=2?"#ffaa4a":"#6bcb77"}}>
              {remaining}/5 prompts left today
            </div>
          )}
          <button onClick={reset} style={S.resetBtn}>↺ Reset Session</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={S.main}>
        {/* Chat area */}
        <div ref={chatRef} style={S.chatArea}>
          {msgs.length===0 ? (
            <div style={S.empty}>
              <div style={S.emptyBadge}>· AI POWERED STRATEGIC ENGINE ·</div>
              <h1 style={S.emptyTitle}>
                <span style={S.emptyTitleBold}>DEVCON </span>
                <span style={S.emptyTitleItalic}>Marketing{"\n"}Agent</span>
              </h1>
              <p style={S.emptyDesc}>
                Your intelligent workspace for engineering National and Chapter content.<br/>
                Select a workflow mode to begin generating high-impact marketing materials.
              </p>
              <div style={S.cards}>
                {STARTER_CARDS.map((c,i)=>(
                  <button key={i} onClick={()=>send(c.text)} style={S.card}>
                    <span style={S.cardIcon}>{c.icon}</span>
                    <span style={S.cardText}>{c.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={S.msgList}>
              {msgs.map((m,i)=>(
                <div key={i} style={{...S.msgRow, justifyContent: m.role==="user"?"flex-end":"flex-start"}}>
                  {m.role==="assistant" && <div style={S.avatar}>⚡</div>}
                  <div style={{...S.bubble, ...(m.role==="user"?S.bubbleUser:S.bubbleAssistant)}}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{...S.msgRow, justifyContent:"flex-start"}}>
                  <div style={S.avatar}>⚡</div>
                  <div style={{...S.bubble,...S.bubbleAssistant,...S.bubbleLoading}}>
                    <span style={S.dot}/><span style={{...S.dot,animationDelay:".2s"}}/><span style={{...S.dot,animationDelay:".4s"}}/>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input bar */}
        <div style={S.inputWrap}>
          {(mode||channels.length||chapter) && (
            <div style={S.tags}>
              {mode && <span style={S.tag}>{activeMode?.icon} {activeMode?.label}</span>}
              {channels.map(id=>{const c=CHANNELS.find(x=>x.id===id);return <span key={id} style={{...S.tag,...S.tagGreen}}>{c?.icon} {c?.label}</span>;})}
              {chapter && <span style={{...S.tag,...S.tagOrange}}>◈ {chapter}</span>}
            </div>
          )}
          <div style={S.inputRow}>
            <textarea value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
              placeholder="Engineer your next strategy..."
              style={{...S.textarea, borderColor: wc>MAX_WORDS?"#e94560":"transparent"}}
            />
            <button onClick={()=>send()} disabled={loading||!input.trim()||wc>MAX_WORDS} style={S.sendBtn}>▶</button>
          </div>
          <div style={S.inputMeta}>
            <span style={S.metaHint}>Shift+Enter for new line · Brand guidelines auto-applied</span>
            <div style={S.metaRight}>
              <span style={{color: wc>MAX_WORDS?"#e94560":wc>160?"#ffaa4a":"#444", fontSize:11}}>
                {wc}/{MAX_WORDS}w
              </span>
              {mode && <span style={{...S.pill, marginLeft:8}}>⚡ {activeMode?.label}</span>}
              {chapter && <span style={{...S.pill,...S.pillOrange, marginLeft:4}}>◈ {chapter}</span>}
            </div>
          </div>
        </div>
      </main>
      <style>{`
        @keyframes blink { 0%,80%,100%{opacity:.2} 40%{opacity:1} }
        textarea:focus { outline:none; border-color:#3a3a5a !important; }
        button:hover { opacity:.85; }
        select:focus { outline:none; }
        * { box-sizing:border-box; }
      `}</style>
    </div>
  );
}

// ── STYLES ──
const S: Record<string,React.CSSProperties> = {
  root:       { display:"flex", height:"100vh", background:"#0e0e11", color:"#e0e0e8", fontFamily:"'Inter','SF Pro Display',system-ui,sans-serif", overflow:"hidden" },
  sidebar:    { width:238, background:"#0a0a0d", borderRight:"1px solid #1c1c22", display:"flex", flexDirection:"column", flexShrink:0, overflow:"hidden" },
  sideTop:    { flex:1, overflowY:"auto", overflowX:"hidden", padding:"20px 12px 12px" },
  sideBottom: { padding:"12px", borderTop:"1px solid #1c1c22", flexShrink:0 },
  logo:       { display:"flex", alignItems:"center", gap:10, marginBottom:28 },
  logoIcon:   { fontSize:20, background:"linear-gradient(135deg,#e94560,#7c3aed)", borderRadius:8, width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  logoTitle:  { fontWeight:700, fontSize:13, color:"#fff", letterSpacing:1 },
  logoSub:    { fontSize:10, color:"#555", marginTop:1 },
  sectionLabel:{ fontSize:9, fontWeight:700, letterSpacing:2, color:"#444", marginBottom:6, paddingLeft:8 },
  sideBtn:    { width:"100%", display:"flex", alignItems:"center", gap:8, background:"transparent", border:"none", color:"#666", padding:"7px 8px", borderRadius:7, cursor:"pointer", fontSize:12, textAlign:"left", transition:"all .15s" },
  sideBtnActive:{ background:"#1a1a22", color:"#e0e0f0", borderLeft:"2px solid #7c3aed" },
  sideBtnIcon:{ fontSize:12, width:16, textAlign:"center", flexShrink:0 },
  select:     { width:"100%", background:"#13131a", border:"1px solid #2a2a35", color:"#999", borderRadius:7, padding:"7px 10px", fontSize:12, cursor:"pointer" },
  resetBtn:   { width:"100%", background:"#1a1a22", border:"1px solid #2a2a35", color:"#666", borderRadius:7, padding:"8px", cursor:"pointer", fontSize:12, marginTop:8 },
  pill:       { display:"inline-flex", alignItems:"center", background:"#1a1a22", color:"#666", borderRadius:20, padding:"3px 10px", fontSize:10, fontWeight:600 },
  pillOrange: { background:"#1f1508", color:"#ffaa4a" },
  main:       { flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 },
  chatArea:   { flex:1, overflowY:"auto", padding:"0 0 8px" },
  empty:      { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100%", padding:"40px 24px", textAlign:"center" },
  emptyBadge: { fontSize:10, letterSpacing:3, color:"#555", border:"1px solid #2a2a35", borderRadius:20, padding:"4px 14px", marginBottom:32 },
  emptyTitle: { fontSize:"clamp(42px,6vw,80px)", fontWeight:900, lineHeight:1.05, marginBottom:20, whiteSpace:"pre-line" },
  emptyTitleBold:  { color:"#fff" },
  emptyTitleItalic:{ color:"#fff", fontStyle:"italic" },
  emptyDesc:  { color:"#555", fontSize:14, lineHeight:1.7, marginBottom:36, maxWidth:600 },
  cards:      { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:12, width:"100%", maxWidth:900 },
  card:       { background:"#13131a", border:"1px solid #1e1e28", borderRadius:12, padding:"20px 20px", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"flex-start", gap:14, transition:"all .15s" },
  cardIcon:   { fontSize:18, color:"#7c3aed", flexShrink:0, marginTop:2 },
  cardText:   { color:"#bbb", fontSize:13, lineHeight:1.5 },
  msgList:    { display:"flex", flexDirection:"column", gap:16, padding:"24px 24px 8px" },
  msgRow:     { display:"flex", alignItems:"flex-start", gap:10 },
  avatar:     { width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#e94560,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 },
  bubble:     { maxWidth:"76%", borderRadius:12, padding:"12px 16px", fontSize:13, lineHeight:1.7, whiteSpace:"pre-wrap", wordBreak:"break-word" },
  bubbleUser: { background:"#1a1a28", border:"1px solid #2a2a3a", borderRadius:"12px 12px 4px 12px", color:"#d0d0e8" },
  bubbleAssistant:{ background:"#13131a", border:"1px solid #1e1e28", borderRadius:"4px 12px 12px 12px", color:"#c8c8d8" },
  bubbleLoading:  { display:"flex", gap:6, alignItems:"center", padding:"14px 18px" },
  dot:        { width:6, height:6, borderRadius:"50%", background:"#7c3aed", display:"inline-block", animation:"blink 1.2s infinite" },
  inputWrap:  { padding:"12px 16px 14px", background:"#0a0a0d", borderTop:"1px solid #1c1c22", flexShrink:0 },
  tags:       { display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 },
  tag:        { background:"#1a1a28", border:"1px solid #2a2a3a", color:"#9090c0", borderRadius:20, padding:"2px 10px", fontSize:11 },
  tagGreen:   { background:"#0f1a10", border:"1px solid #1a3a1a", color:"#6bcb77" },
  tagOrange:  { background:"#1f1508", border:"1px solid #3a2a08", color:"#ffaa4a" },
  inputRow:   { display:"flex", gap:8, background:"#13131a", border:"1px solid #1e1e28", borderRadius:14, padding:"8px 8px 8px 16px", alignItems:"flex-end" },
  textarea:   { flex:1, background:"transparent", border:"none", color:"#e0e0e8", fontSize:13, resize:"none", height:52, fontFamily:"inherit", lineHeight:1.6, paddingTop:6 },
  sendBtn:    { background:"linear-gradient(135deg,#7c3aed,#e94560)", border:"none", color:"#fff", borderRadius:10, width:40, height:40, cursor:"pointer", fontSize:14, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" },
  inputMeta:  { display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8, paddingLeft:4 },
  metaHint:   { fontSize:10, color:"#333" },
  metaRight:  { display:"flex", alignItems:"center" },
};