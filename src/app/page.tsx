"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ── DEVCON 4-circle logo ──────────────────────────────────────────────
function DevconCircles({ size = 28 }: { size?: number }) {
  const r = size * 0.22;
  const cx = size / 2, cy = size / 2, off = size * 0.15;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx - off} cy={cy - off} r={r} fill="#f5a623" />
      <circle cx={cx + off} cy={cy - off} r={r} fill="#e94560" />
      <circle cx={cx - off} cy={cy + off} r={r} fill="#7c3aed" />
      <circle cx={cx + off} cy={cy + off} r={r} fill="#4caf50" />
    </svg>
  );
}

// ── Loading screen ───────────────────────────────────────────────────
function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0); // 0=one circle, 1=splitting, 2=four circles, 3=fade
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 700);
    const t2 = setTimeout(() => setPhase(2), 1400);
    const t3 = setTimeout(() => setPhase(3), 2200);
    const t4 = setTimeout(() => onDone(), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  const size = 120;
  const r = 18, cx = size / 2, cy = size / 2, off = 22;
  const circles = [
    { cx: cx - off, cy: cy - off, fill: "#f5a623" },
    { cx: cx + off, cy: cy - off, fill: "#e94560" },
    { cx: cx - off, cy: cy + off, fill: "#7c3aed" },
    { cx: cx + off, cy: cy + off, fill: "#4caf50" },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#0e0e11", zIndex: 999,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 28, opacity: phase === 3 ? 0 : 1, transition: "opacity .6s ease",
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {phase === 0 && (
          <circle cx={cx} cy={cy} r={r} fill="#fff"
            style={{ transition: "all .5s ease" }} />
        )}
        {phase >= 1 && circles.map((c, i) => (
          <circle key={i} cx={phase >= 2 ? c.cx : cx} cy={phase >= 2 ? c.cy : cy}
            r={r} fill={phase >= 2 ? c.fill : "#fff"}
            style={{ transition: `cx .6s ease ${i * 0.06}s, cy .6s ease ${i * 0.06}s, fill .4s ease ${i * 0.08}s` }}
          />
        ))}
      </svg>
      <div style={{ fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: 4, color: "#fff", opacity: phase >= 2 ? 1 : 0, transition: "opacity .5s ease" }}>
        DEVCON
      </div>
      <div style={{ fontSize: 12, color: "#555", letterSpacing: 2, opacity: phase >= 2 ? 1 : 0, transition: "opacity .6s .2s ease" }}>
        MARKETING AGENT
      </div>
    </div>
  );
}

// ── Markdown renderer ─────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  const inlineFormat = (s: string, key: string | number): React.ReactNode => {
    const parts = s.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|__[^_]+__)/g);
    return (
      <span key={key}>
        {parts.map((p, j) => {
          if (/^\*\*/.test(p) || /^__/.test(p)) return <strong key={j}>{p.slice(2, -2)}</strong>;
          if (/^\*/.test(p)) return <em key={j}>{p.slice(1, -1)}</em>;
          if (/^`/.test(p)) return <code key={j} style={{ background: "#1e1e2e", padding: "1px 5px", borderRadius: 4, fontSize: "0.88em", fontFamily: "monospace" }}>{p.slice(1, -1)}</code>;
          return p;
        })}
      </span>
    );
  };

  while (i < lines.length) {
    const line = lines[i];
    if (/^### /.test(line)) {
      nodes.push(<h3 key={i} style={{ margin: "14px 0 4px", fontSize: 14, fontWeight: 700, color: "#e0e0f0", letterSpacing: .3 }}>{inlineFormat(line.slice(4), i)}</h3>);
    } else if (/^## /.test(line)) {
      nodes.push(<h2 key={i} style={{ margin: "16px 0 6px", fontSize: 16, fontWeight: 700, color: "#fff" }}>{inlineFormat(line.slice(3), i)}</h2>);
    } else if (/^# /.test(line)) {
      nodes.push(<h1 key={i} style={{ margin: "16px 0 8px", fontSize: 18, fontWeight: 800, color: "#fff" }}>{inlineFormat(line.slice(2), i)}</h1>);
    } else if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={i} style={{ border: "none", borderTop: "1px solid #2a2a3a", margin: "12px 0" }} />);
    } else if (/^[*\-] /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[*\-] /.test(lines[i])) {
        items.push(<li key={i} style={{ marginBottom: 4 }}>{inlineFormat(lines[i].slice(2), i)}</li>);
        i++;
      }
      nodes.push(<ul key={`ul${i}`} style={{ paddingLeft: 20, margin: "6px 0" }}>{items}</ul>);
      continue;
    } else if (/^\d+\. /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i} style={{ marginBottom: 4 }}>{inlineFormat(lines[i].replace(/^\d+\. /, ""), i)}</li>);
        i++;
      }
      nodes.push(<ol key={`ol${i}`} style={{ paddingLeft: 20, margin: "6px 0" }}>{items}</ol>);
      continue;
    } else if (line.trim() === "") {
      nodes.push(<div key={i} style={{ height: 8 }} />);
    } else {
      nodes.push(<p key={i} style={{ margin: "3px 0", lineHeight: 1.7 }}>{inlineFormat(line, i)}</p>);
    }
    i++;
  }
  return nodes;
}

// ── Brand + config ───────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the DEVCON Philippines Marketing AI Agent — an expert social media strategist embedded inside the DEVCON national office workflow.
BRAND: Mission: "Tech-Empowered Philippines For All" | Voice: Pioneering. Open. Collaborative. Impactful.
Programs: DEVCON Kids, Campus DEVCON, SheIsDEVCON, DEVCON Summit, Smart Contracts Code Camp, AI Academy, DEVCON CREST, Jumpstart Internships
Chapters: Manila, Laguna, Pampanga, Legazpi, Cebu, Iloilo, Bohol, Bacolod, Davao, Iligan, CDO, Bukidnon
AUDIENCE: Filipino IT students, dev professionals, educators, women in tech, kids programs.
TONE: Energetic but grounded. Community-proud. Tech-forward but human. Never corporate.
FORMAT: Always use markdown. Use **bold** for platform names, key actions, and important phrases. Use ## for section headers. Use bullet lists for multi-item content. Use numbered lists for steps.
PLATFORMS: Facebook (community, Taglish OK) | Instagram (visual, reels, carousels) | TikTok (punchy, Gen Z, 15-60s scripts) | LinkedIn (professional, formal English) | Buffer (PHT scheduling)
RULES: 1) Reflect: Pioneering, Open, Collaborative, Impactful. 2) Hashtags: #DEVCON #DEVCONph #TechEmpoweredPhilippines #GeeksUnite 3) Intern briefs: objective, platform, format, draft copy, visual notes. 4) Buffer plans: day + PHT time + platform + copy + visual note. 5) Chapter posts: national message + local flavor. 6) Flag Code of Conduct or Child Protection Policy conflicts.`;

const MODES = [
  { id:"content_gen",  label:"Generate Content",   icon:"✦" },
  { id:"repurpose",    label:"Repurpose Content",   icon:"⟳" },
  { id:"chapter_post", label:"Chapter Post",        icon:"◈" },
  { id:"intern_brief", label:"Intern Brief",        icon:"◉" },
  { id:"buffer_plan",  label:"Buffer Schedule",     icon:"◎" },
  { id:"strategy",     label:"Strategy Alignment",  icon:"△" },
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

const STARTERS = [
  { icon:"◷", text:"Generate 5 Instagram posts for SheIsDEVCON 2026" },
  { icon:"◈", text:"Create a Buffer weekly schedule for the Cebu chapter" },
  { icon:"◉", text:"Write an intern content brief for our TikTok series on campus events" },
  { icon:"⟳", text:"Repurpose our DEVCON Summit recap for LinkedIn and TikTok" },
  { icon:"▣", text:"Draft a Facebook post announcing the AI Academy scholarship" },
];

type Msg = { role:"user"|"assistant"; text:string };
type HistItem = { role:"user"|"assistant"; content:string };
type HistoryEntry = { id:string; user_message:string; assistant_message:string; created_at:string };

export default function App() {
  const [loaded,   setLoaded]   = useState(false);
  const [mode,     setMode]     = useState<string|null>(null);
  const [channels, setChannels] = useState<string[]>([]);
  const [chapter,  setChapter]  = useState("");
  const [input,    setInput]    = useState("");
  const [msgs,     setMsgs]     = useState<Msg[]>([]);
  const [hist,     setHist]     = useState<HistItem[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [remaining, setRemaining] = useState<number|null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history,  setHistory]  = useState<HistoryEntry[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2));
  const abortRef = useRef<AbortController|null>(null);
  const chatRef  = useRef<HTMLDivElement>(null);

  const MAX_WORDS = 200;
  const wc = input.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [msgs, loading]);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const res = await fetch(`/api/history?sessionId=${sessionId}`);
      const data = await res.json();
      if (Array.isArray(data)) setHistory(data);
    } catch {}
    setHistLoading(false);
  }, [sessionId]);

  const toggleHistory = () => {
    if (!showHistory) loadHistory();
    setShowHistory(p => !p);
  };

  const toggleCh = (id:string) =>
    setChannels(p => p.includes(id) ? p.filter(c=>c!==id) : [...p,id]);

  const buildPrompt = (t:string) => {
    let c = "";
    if (mode) { const m=MODES.find(x=>x.id===mode); c+=`MODE: ${m?.label}\n`; }
    if (channels.length) c+=`CHANNELS: ${CHANNELS.filter(x=>channels.includes(x.id)).map(x=>x.label).join(", ")}\n`;
    if (chapter) c+=`CHAPTER: ${chapter}\n`;
    return c+`\nREQUEST:\n${t}`;
  };

  const send = async (text?:string) => {
    const userText = (text||input).trim();
    if (!userText||loading) return;
    setMsgs(p=>[...p,{role:"user",text:userText}]);
    setInput("");
    setLoading(true);

    const newHist:HistItem[] = [...hist,{role:"user",content:buildPrompt(userText)}];
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/chat",{
        method:"POST", signal:ctrl.signal,
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({messages:newHist, system:SYSTEM_PROMPT, sessionId}),
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
        await fetch("/api/history",{
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({sessionId, userMsg:userText, assistantMsg:reply}),
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

  if (!loaded) return <LoadingScreen onDone={()=>setLoaded(true)} />;

  return (
    <div style={S.root}>
      {/* ── SIDEBAR ── */}
      <aside style={S.sidebar}>
        <div style={S.sideTop}>
          {/* Logo */}
          <div style={S.logo}>
            <DevconCircles size={36} />
            <div>
              <div style={S.logoTitle}>DEVCON</div>
              <div style={S.logoSub}>Marketing Agent</div>
            </div>
          </div>

          <div style={S.sectionLabel}>WORKFLOW MODE</div>
          {MODES.map(m=>(
            <button key={m.id} onClick={()=>setMode(mode===m.id?null:m.id)}
              style={{...S.sideBtn,...(mode===m.id?S.sideBtnActive:{})}}>
              <span style={S.sideBtnIcon}>{m.icon}</span>{m.label}
            </button>
          ))}

          <div style={{...S.sectionLabel,marginTop:20}}>CHANNEL</div>
          {CHANNELS.map(c=>(
            <button key={c.id} onClick={()=>toggleCh(c.id)}
              style={{...S.sideBtn,...(channels.includes(c.id)?S.sideBtnActive:{})}}>
              <span style={S.sideBtnIcon}>{c.icon}</span>{c.label}
            </button>
          ))}

          <div style={{...S.sectionLabel,marginTop:20}}>CHAPTER</div>
          <select value={chapter} onChange={e=>setChapter(e.target.value)} style={S.select}>
            <option value="">National</option>
            {CHAPTERS.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={S.sideBottom}>
          <button onClick={toggleHistory} style={{...S.sideBtn,...(showHistory?S.sideBtnActive:{}), marginBottom:6}}>
            <span style={S.sideBtnIcon}>◑</span>Prompt History
          </button>
          {remaining!==null&&(
            <div style={{...S.pill,
              background:remaining<=1?"#3a1a1a":remaining<=2?"#2a2010":"#0f1a10",
              color:remaining<=1?"#ff6b6b":remaining<=2?"#ffaa4a":"#6bcb77",
              marginBottom:6}}>
              {remaining}/5 prompts left today
            </div>
          )}
          <button onClick={reset} style={S.resetBtn}>↺ Reset Session</button>
        </div>
      </aside>

      {/* ── HISTORY PANEL ── */}
      {showHistory && (
        <div style={S.histPanel}>
          <div style={S.histHeader}>
            <span style={{fontWeight:700,fontSize:13}}>Prompt History</span>
            <button onClick={()=>setShowHistory(false)} style={S.histClose}>✕</button>
          </div>
          <div style={S.histList}>
            {histLoading ? (
              <div style={{color:"#555",fontSize:12,padding:16}}>Loading...</div>
            ) : history.length===0 ? (
              <div style={{color:"#555",fontSize:12,padding:16}}>No history yet for this session.</div>
            ) : [...history].reverse().map(h=>(
              <div key={h.id} style={S.histItem} onClick={()=>{
                setMsgs([{role:"user",text:h.user_message},{role:"assistant",text:h.assistant_message}]);
                setShowHistory(false);
              }}>
                <div style={S.histQ}>
                  <span style={{color:"#7c3aed",marginRight:6}}>▸</span>
                  {h.user_message.slice(0,80)}{h.user_message.length>80?"…":""}
                </div>
                <div style={S.histMeta}>{new Date(h.created_at).toLocaleString("en-PH",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <main style={S.main}>
        <div ref={chatRef} style={S.chatArea}>
          {msgs.length===0 ? (
            <div style={S.empty}>
              <div style={S.emptyBadge}>· AI POWERED STRATEGIC ENGINE ·</div>
              <div style={S.emptyLogoWrap}>
                <DevconCircles size={64} />
                <h1 style={S.emptyTitle}>
                  <span style={S.emptyBold}>DEVCON </span>
                  <span style={S.emptyItalic}>Marketing{"\n"}Agent</span>
                </h1>
              </div>
              <p style={S.emptyDesc}>
                Your intelligent workspace for engineering National and Chapter content.<br/>
                Select a workflow mode to begin generating high-impact marketing materials.
              </p>
              <div style={S.cards}>
                {STARTERS.map((c,i)=>(
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
                <div key={i} style={{...S.msgRow,justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                  {m.role==="assistant"&&(
                    <div style={S.avatar}><DevconCircles size={22}/></div>
                  )}
                  <div style={{...S.bubble,...(m.role==="user"?S.bubbleUser:S.bubbleAI)}}>
                    {m.role==="assistant" ? renderMarkdown(m.text) : m.text}
                  </div>
                </div>
              ))}
              {loading&&(
                <div style={{...S.msgRow,justifyContent:"flex-start"}}>
                  <div style={S.avatar}><DevconCircles size={22}/></div>
                  <div style={{...S.bubble,...S.bubbleAI,...S.bubbleLoading}}>
                    {[0,1,2].map(i=>(
                      <span key={i} style={{...S.dot,animationDelay:`${i*.2}s`}}/>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div style={S.inputWrap}>
          {(mode||channels.length||chapter)&&(
            <div style={S.tags}>
              {mode&&<span style={S.tag}>{activeMode?.icon} {activeMode?.label}</span>}
              {channels.map(id=>{const c=CHANNELS.find(x=>x.id===id);return<span key={id} style={{...S.tag,...S.tagGreen}}>{c?.icon} {c?.label}</span>;})}
              {chapter&&<span style={{...S.tag,...S.tagOrange}}>◈ {chapter}</span>}
            </div>
          )}
          <div style={S.inputRow}>
            <textarea value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
              placeholder="Engineer your next strategy..."
              style={{...S.textarea,borderColor:wc>MAX_WORDS?"#e94560":"transparent"}}
            />
            <button onClick={()=>send()} disabled={loading||!input.trim()||wc>MAX_WORDS} style={S.sendBtn}>▶</button>
          </div>
          <div style={S.inputMeta}>
            <span style={S.metaHint}>Shift+Enter for new line · Brand guidelines auto-applied</span>
            <span style={{color:wc>MAX_WORDS?"#e94560":wc>160?"#ffaa4a":"#444",fontSize:11}}>{wc}/{MAX_WORDS}w</span>
          </div>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');
        @keyframes blink{0%,80%,100%{opacity:.15}40%{opacity:1}}
        *{box-sizing:border-box;font-family:'Proxima Nova','Montserrat',system-ui,sans-serif}
        textarea:focus{outline:none!important}
        button:hover{opacity:.82}
        select:focus{outline:none}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#2a2a3a;border-radius:3px}
      `}</style>
    </div>
  );
}

const S: Record<string,React.CSSProperties> = {
  root:       {display:"flex",height:"100vh",background:"#0e0e11",color:"#e0e0e8",overflow:"hidden"},
  sidebar:    {width:238,background:"#0a0a0d",borderRight:"1px solid #1c1c22",display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"},
  sideTop:    {flex:1,overflowY:"auto",overflowX:"hidden",padding:"20px 12px 12px"},
  sideBottom: {padding:"12px",borderTop:"1px solid #1c1c22",flexShrink:0},
  logo:       {display:"flex",alignItems:"center",gap:10,marginBottom:28},
  logoTitle:  {fontWeight:800,fontSize:13,color:"#fff",letterSpacing:2},
  logoSub:    {fontSize:10,color:"#555",marginTop:1},
  sectionLabel:{fontSize:9,fontWeight:700,letterSpacing:2,color:"#444",marginBottom:6,paddingLeft:8},
  sideBtn:    {width:"100%",display:"flex",alignItems:"center",gap:8,background:"transparent",border:"none",color:"#666",padding:"7px 8px",borderRadius:7,cursor:"pointer",fontSize:12,textAlign:"left"},
  sideBtnActive:{background:"#1a1a22",color:"#e0e0f0",borderLeft:"2px solid #7c3aed"},
  sideBtnIcon:{fontSize:12,width:16,textAlign:"center",flexShrink:0},
  select:     {width:"100%",background:"#13131a",border:"1px solid #2a2a35",color:"#999",borderRadius:7,padding:"7px 10px",fontSize:12,cursor:"pointer"},
  resetBtn:   {width:"100%",background:"#1a1a22",border:"1px solid #2a2a35",color:"#666",borderRadius:7,padding:"8px",cursor:"pointer",fontSize:12,marginTop:4},
  pill:       {display:"inline-flex",alignItems:"center",background:"#1a1a22",color:"#666",borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:600},
  // History panel
  histPanel:  {width:280,background:"#0c0c10",borderRight:"1px solid #1c1c22",display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"},
  histHeader: {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 14px 12px",borderBottom:"1px solid #1c1c22"},
  histClose:  {background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:14,padding:4},
  histList:   {flex:1,overflowY:"auto",padding:"8px"},
  histItem:   {padding:"10px 10px",borderRadius:8,cursor:"pointer",marginBottom:4,border:"1px solid #1c1c22",background:"#0e0e12"},
  histQ:      {fontSize:12,color:"#bbb",lineHeight:1.5},
  histMeta:   {fontSize:10,color:"#444",marginTop:4},
  // Main
  main:       {flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0},
  chatArea:   {flex:1,overflowY:"auto",padding:"0 0 8px"},
  empty:      {display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100%",padding:"40px 24px",textAlign:"center"},
  emptyBadge: {fontSize:10,letterSpacing:3,color:"#555",border:"1px solid #2a2a35",borderRadius:20,padding:"4px 14px",marginBottom:28},
  emptyLogoWrap:{display:"flex",alignItems:"center",gap:20,marginBottom:20},
  emptyTitle: {fontSize:"clamp(36px,5vw,70px)",fontWeight:900,lineHeight:1.05,whiteSpace:"pre-line",textAlign:"left"},
  emptyBold:  {color:"#fff"},
  emptyItalic:{color:"#fff",fontStyle:"italic"},
  emptyDesc:  {color:"#555",fontSize:14,lineHeight:1.7,marginBottom:32,maxWidth:580},
  cards:      {display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12,width:"100%",maxWidth:860},
  card:       {background:"#13131a",border:"1px solid #1e1e28",borderRadius:12,padding:"18px 18px",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"flex-start",gap:12},
  cardIcon:   {fontSize:16,color:"#7c3aed",flexShrink:0,marginTop:2},
  cardText:   {color:"#bbb",fontSize:13,lineHeight:1.5},
  msgList:    {display:"flex",flexDirection:"column",gap:16,padding:"24px 24px 8px"},
  msgRow:     {display:"flex",alignItems:"flex-start",gap:10},
  avatar:     {width:30,height:30,borderRadius:8,background:"#1a1a22",border:"1px solid #2a2a3a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  bubble:     {maxWidth:"76%",borderRadius:12,padding:"12px 16px",fontSize:13,lineHeight:1.7,wordBreak:"break-word"},
  bubbleUser: {background:"#1a1a28",border:"1px solid #2a2a3a",borderRadius:"12px 12px 4px 12px",color:"#d0d0e8"},
  bubbleAI:   {background:"#13131a",border:"1px solid #1e1e28",borderRadius:"4px 12px 12px 12px",color:"#c8c8d8"},
  bubbleLoading:{display:"flex",gap:6,alignItems:"center",padding:"14px 18px"},
  dot:        {width:7,height:7,borderRadius:"50%",background:"#7c3aed",display:"inline-block",animation:"blink 1.2s infinite"},
  inputWrap:  {padding:"12px 16px 14px",background:"#0a0a0d",borderTop:"1px solid #1c1c22",flexShrink:0},
  tags:       {display:"flex",gap:6,flexWrap:"wrap",marginBottom:8},
  tag:        {background:"#1a1a28",border:"1px solid #2a2a3a",color:"#9090c0",borderRadius:20,padding:"2px 10px",fontSize:11},
  tagGreen:   {background:"#0f1a10",border:"1px solid #1a3a1a",color:"#6bcb77"},
  tagOrange:  {background:"#1f1508",border:"1px solid #3a2a08",color:"#ffaa4a"},
  inputRow:   {display:"flex",gap:8,background:"#13131a",border:"1px solid #1e1e28",borderRadius:14,padding:"8px 8px 8px 16px",alignItems:"flex-end"},
  textarea:   {flex:1,background:"transparent",border:"none",color:"#e0e0e8",fontSize:13,resize:"none",height:52,lineHeight:1.6,paddingTop:6},
  sendBtn:    {background:"linear-gradient(135deg,#7c3aed,#e94560)",border:"none",color:"#fff",borderRadius:10,width:40,height:40,cursor:"pointer",fontSize:14,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"},
  inputMeta:  {display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6,paddingLeft:2},
  metaHint:   {fontSize:10,color:"#333"},
};