"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

// ── DEVCON 16 Palette ────────────────────────────────────────────────
const C = {
  skyBlue:  "#4DC8E8", brightBlue:"#2B7DE9", coral:"#E8574A",
  purple:   "#8B4FD8", gold:"#F5C842",       teal:"#1BA8A0",
  navy:     "#1A2A4A", navyDark:"#111B2E",   navyDeep:"#0C1220",
  white:    "#F0F4FF", muted:"#7A92B8",      border:"#1E2E48",
  cardBg:   "#141E30", inputBg:"#0F1828",
};

// ── 4-circle logo ────────────────────────────────────────────────────
function DevconCircles({ size = 28 }: { size?: number }) {
  const r = size * 0.23, cx = size / 2, cy = size / 2, off = size * 0.165;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx-off} cy={cy-off} r={r} fill={C.gold}    />
      <circle cx={cx+off} cy={cy-off} r={r} fill={C.coral}   />
      <circle cx={cx-off} cy={cy+off} r={r} fill={C.purple}  />
      <circle cx={cx+off} cy={cy+off} r={r} fill={C.skyBlue} />
    </svg>
  );
}

// ── Loading screen ───────────────────────────────────────────────────
function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => setPhase(2), 1300);
    const t3 = setTimeout(() => setPhase(3), 2100);
    const t4 = setTimeout(() => onDone(), 2700);
    return () => [t1,t2,t3,t4].forEach(clearTimeout);
  }, [onDone]);
  const sz = 100, r = 15, cx = sz/2, cy = sz/2, off = 19;
  const circles = [
    { cx:cx-off, cy:cy-off, fill:C.gold    },
    { cx:cx+off, cy:cy-off, fill:C.coral   },
    { cx:cx-off, cy:cy+off, fill:C.purple  },
    { cx:cx+off, cy:cy+off, fill:C.skyBlue },
  ];
  return (
    <div style={{position:"fixed",inset:0,background:C.navyDeep,zIndex:999,
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      gap:24,opacity:phase===3?0:1,transition:"opacity .6s ease"}}>
      <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{overflow:"visible"}}>
        {phase===0 && <circle cx={cx} cy={cy} r={r} fill={C.white}/>}
        {phase>=1 && circles.map((c,i)=>(
          <circle key={i}
            cx={phase>=2?c.cx:cx} cy={phase>=2?c.cy:cy}
            r={r} fill={phase>=2?c.fill:C.white}
            style={{transition:`cx .55s cubic-bezier(.34,1.56,.64,1) ${i*.07}s,cy .55s cubic-bezier(.34,1.56,.64,1) ${i*.07}s,fill .35s ease ${i*.08}s`}}
          />
        ))}
      </svg>
      <div style={{opacity:phase>=2?1:0,transition:"opacity .5s ease",textAlign:"center"}}>
        <div style={{fontWeight:900,fontSize:26,letterSpacing:6,color:C.white}}>DEVCON</div>
        <div style={{fontSize:11,color:C.muted,letterSpacing:3,marginTop:4}}>STUDIOS MARKETING AGENT</div>
      </div>
    </div>
  );
}

// ── Onboarding Tour ──────────────────────────────────────────────────
const TOUR_STEPS = [
  { icon:"👋", title:"Welcome to DEVCON Studios Marketing Agent", body:"Your AI-powered workspace for generating high-impact content across all DEVCON platforms. This quick tour will get you started in under a minute." },
  { icon:"✦",  title:"Step 1 — Pick a Workflow Mode", body:"In the left sidebar, select a mode that matches what you need: Generate Content, Repurpose, Chapter Post, Intern Brief, Buffer Schedule, or Strategy Alignment. This tells the AI exactly what to produce." },
  { icon:"◷",  title:"Step 2 — Select Your Channels", body:"Choose which platforms you're targeting — Facebook, Instagram, TikTok, LinkedIn, or Buffer. The AI automatically adjusts tone, format, and hashtags per platform." },
  { icon:"◈",  title:"Step 3 — Choose a Chapter (Optional)", body:"If creating content for a specific chapter like Cebu or Davao, pick it from the Chapter dropdown. The AI localizes content while keeping the national brand voice." },
  { icon:"▶",  title:"Step 4 — Type Your Prompt", body:"Describe what you need in the input bar at the bottom. Be specific — include event names, dates, or themes. You get 5 prompts per day with a 200-word limit per message." },
  { icon:"✕",  title:"Step 5 — Deselect Anytime", body:"Made a wrong selection? A red ✕ appears to the left of every active item. Click it to remove that selection instantly without losing the others." },
  { icon:"◑",  title:"Step 6 — View Prompt History", body:"Click 'Prompt History' in the sidebar to see all past prompts. Click any entry to reload that conversation into the chat. History is saved automatically." },
];

function OnboardingTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === TOUR_STEPS.length - 1;
  const s = TOUR_STEPS[step];
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.75)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.navyDark,border:`1px solid ${C.brightBlue}44`,borderRadius:16,padding:"32px 28px",maxWidth:460,width:"100%",boxShadow:`0 0 60px ${C.brightBlue}22`,animation:"fadeUp .3s ease"}}>
        <div style={{display:"flex",gap:6,marginBottom:24,justifyContent:"center"}}>
          {TOUR_STEPS.map((_,i)=>(
            <div key={i} onClick={()=>setStep(i)}
              style={{width:i===step?20:6,height:6,borderRadius:3,background:i===step?C.brightBlue:C.border,transition:"all .25s",cursor:"pointer"}}/>
          ))}
        </div>
        <div style={{fontSize:40,textAlign:"center",marginBottom:16}}>{s.icon}</div>
        <h2 style={{fontWeight:800,fontSize:16,color:C.white,marginBottom:10,textAlign:"center",lineHeight:1.3}}>{s.title}</h2>
        <p style={{color:C.muted,fontSize:13,lineHeight:1.75,textAlign:"center",marginBottom:28}}>{s.body}</p>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          {step>0&&(
            <button onClick={()=>setStep(p=>p-1)}
              style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13}}>← Back</button>
          )}
          <button onClick={isLast?onClose:()=>setStep(p=>p+1)}
            style={{background:`linear-gradient(135deg,${C.brightBlue},${C.purple})`,border:"none",color:C.white,borderRadius:8,padding:"9px 24px",cursor:"pointer",fontSize:13,fontWeight:700}}>
            {isLast?"Let's Go! ⚡":"Next →"}
          </button>
        </div>
        <button onClick={onClose} style={{display:"block",margin:"14px auto 0",background:"none",border:"none",color:"#3a4a6a",cursor:"pointer",fontSize:11}}>Skip tutorial</button>
      </div>
    </div>
  );
}

// ── Markdown renderer ────────────────────────────────────────────────
function MD({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  const inline = (s: string, k: string|number): React.ReactNode => {
    const parts = s.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return <span key={k}>{parts.map((p,j)=>{
      if (/^\*\*/.test(p)) return <strong key={j} style={{color:C.white,fontWeight:700}}>{p.slice(2,-2)}</strong>;
      if (/^\*/.test(p))   return <em key={j} style={{color:C.skyBlue}}>{p.slice(1,-1)}</em>;
      if (/^`/.test(p))    return <code key={j} style={{background:C.navyDark,padding:"1px 5px",borderRadius:4,fontSize:"0.87em",fontFamily:"monospace",color:C.gold}}>{p.slice(1,-1)}</code>;
      return p;
    })}</span>;
  };
  while (i < lines.length) {
    const l = lines[i];
    if      (/^### /.test(l)) nodes.push(<h3 key={i} style={{margin:"12px 0 4px",fontSize:13,fontWeight:700,color:C.skyBlue,letterSpacing:.5}}>{inline(l.slice(4),i)}</h3>);
    else if (/^## /.test(l))  nodes.push(<h2 key={i} style={{margin:"14px 0 6px",fontSize:15,fontWeight:800,color:C.white,borderBottom:`1px solid ${C.border}`,paddingBottom:4}}>{inline(l.slice(3),i)}</h2>);
    else if (/^# /.test(l))   nodes.push(<h1 key={i} style={{margin:"16px 0 8px",fontSize:17,fontWeight:900,color:C.white}}>{inline(l.slice(2),i)}</h1>);
    else if (/^---+$/.test(l.trim())) nodes.push(<hr key={i} style={{border:"none",borderTop:`1px solid ${C.border}`,margin:"10px 0"}}/>);
    else if (/^[*\-] /.test(l)) {
      const items: React.ReactNode[] = [];
      while (i<lines.length && /^[*\-] /.test(lines[i])) { items.push(<li key={i} style={{marginBottom:3,paddingLeft:4}}>{inline(lines[i].slice(2),i)}</li>); i++; }
      nodes.push(<ul key={`ul${i}`} style={{paddingLeft:18,margin:"6px 0",listStyleType:"'›  '"}}>{items}</ul>); continue;
    } else if (/^\d+\. /.test(l)) {
      const items: React.ReactNode[] = [];
      while (i<lines.length && /^\d+\. /.test(lines[i])) { items.push(<li key={i} style={{marginBottom:3}}>{inline(lines[i].replace(/^\d+\. /,""),i)}</li>); i++; }
      nodes.push(<ol key={`ol${i}`} style={{paddingLeft:20,margin:"6px 0"}}>{items}</ol>); continue;
    } else if (l.trim()==="") nodes.push(<div key={i} style={{height:6}}/>);
    else nodes.push(<p key={i} style={{margin:"2px 0",lineHeight:1.72}}>{inline(l,i)}</p>);
    i++;
  }
  return <div>{nodes}</div>;
}

// ── Config ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the DEVCON Philippines Marketing AI Agent — an expert social media strategist for DEVCON Studios.
BRAND: Mission: "Tech-Empowered Philippines For All" | Voice: Pioneering. Open. Collaborative. Impactful.
Programs: DEVCON Kids, Campus DEVCON, SheIsDEVCON, DEVCON Summit, Smart Contracts Code Camp, AI Academy, DEVCON CREST, Jumpstart Internships
Chapters: Manila, Laguna, Pampanga, Legazpi, Cebu, Iloilo, Bohol, Bacolod, Davao, Iligan, CDO, Bukidnon
AUDIENCE: Filipino IT students, dev professionals, educators, women in tech, kids programs.
TONE: Energetic but grounded. Community-proud. Tech-forward but human. Never corporate.
OUTPUT RULES: Always complete your full response — never cut off mid-sentence or mid-list. Be concise but complete. For multi-platform requests, give 1 strong version per platform. Do not truncate.
FORMAT: Use **bold** for platform names, CTAs, key info. Use ## for sections. Use ### for subsections. Use - for bullet lists. Use numbered lists for steps. Use --- to separate platform versions.
PLATFORMS: Facebook (community, Taglish OK) | Instagram (visual, reels, carousels) | TikTok (punchy, Gen Z, 15-60s scripts) | LinkedIn (professional, formal English) | Buffer (PHT scheduling)
RULES: 1) Reflect: Pioneering, Open, Collaborative, Impactful. 2) Hashtags: #DEVCON #DEVCONph #TechEmpoweredPhilippines #GeeksUnite 3) Intern briefs: objective, platform, format, draft, visual notes. 4) Buffer plans: day+PHT time+platform+copy+visual note. 5) Chapter posts: national message + local flavor. 6) Flag Code of Conduct or Child Protection Policy concerns.`;

const MODES = [
  {id:"content_gen",  label:"Generate Content",  icon:"✦"},
  {id:"repurpose",    label:"Repurpose Content",  icon:"⟳"},
  {id:"chapter_post", label:"Chapter Post",       icon:"◈"},
  {id:"intern_brief", label:"Intern Brief",       icon:"◉"},
  {id:"buffer_plan",  label:"Buffer Schedule",    icon:"◎"},
  {id:"strategy",     label:"Strategy Alignment", icon:"△"},
];
const CHANNELS = [
  {id:"fb_main",    label:"Facebook DEVCON PH",     icon:"▣"},
  {id:"fb_studios", label:"Facebook DEVCON Studios", icon:"▣"},
  {id:"instagram",  label:"Instagram",               icon:"◷"},
  {id:"tiktok",     label:"TikTok",                  icon:"▷"},
  {id:"linkedin",   label:"LinkedIn",                icon:"▦"},
  {id:"buffer",     label:"Buffer",                  icon:"◈"},
];
const CHAPTERS = ["Manila","Laguna","Pampanga","Legazpi","Cebu","Iloilo","Bohol","Bacolod","Davao","Iligan","CDO","Bukidnon"];
const STARTERS = [
  {icon:"◷", text:"Generate 5 Instagram posts for SheIsDEVCON 2026"},
  {icon:"◈", text:"Create a Buffer weekly schedule for the Cebu chapter"},
  {icon:"◉", text:"Write an intern brief for our TikTok campus events series"},
  {icon:"⟳", text:"Repurpose our DEVCON Summit recap for LinkedIn and TikTok"},
  {icon:"▣", text:"Draft a Facebook post for the AI Academy scholarship"},
];

type Msg     = {role:"user"|"assistant"; text:string};
type HI      = {role:"user"|"assistant"; content:string};
type HEntry  = {id:string; user_message:string; assistant_message:string; created_at:string};

// ── Sidebar style constants ──────────────────────────────────────────
const sLabel: React.CSSProperties = {fontSize:9,fontWeight:700,letterSpacing:2,color:"#3a4a6a",marginBottom:6,paddingLeft:8};
const sBtn:   React.CSSProperties = {width:"100%",display:"flex",alignItems:"center",gap:8,background:"transparent",border:"none",color:"#7a92b8",padding:"7px 8px",borderRadius:7,cursor:"pointer",fontSize:12,textAlign:"left"};
const sBtnA:  React.CSSProperties = {background:`${C.brightBlue}15`,color:C.white,borderLeft:`2px solid ${C.brightBlue}`};
const sBtnIcon: React.CSSProperties = {fontSize:12,width:16,textAlign:"center",flexShrink:0};
const xBtn:   React.CSSProperties = {background:"none",border:"none",color:C.coral,cursor:"pointer",fontSize:12,padding:"0 3px",lineHeight:1,flexShrink:0,width:16};
const tag:    React.CSSProperties = {borderRadius:20,padding:"2px 10px",fontSize:11};

// ── Main App ─────────────────────────────────────────────────────────
export default function App() {
  const [loaded,      setLoaded]      = useState(false);
  const [showTour,    setShowTour]    = useState(true);
  const [sideOpen,    setSideOpen]    = useState(false);
  const [histOpen,    setHistOpen]    = useState(false);
  const [mode,        setMode]        = useState<string|null>(null);
  const [channels,    setChannels]    = useState<string[]>([]);
  const [chapter,     setChapter]     = useState("");
  const [input,       setInput]       = useState("");
  const [msgs,        setMsgs]        = useState<Msg[]>([]);
  const [hist,        setHist]        = useState<HI[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [remaining,   setRemaining]   = useState<number|null>(null);
  const [history,     setHistory]     = useState<HEntry[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [sessionId]  = useState(()=>Math.random().toString(36).slice(2));
  const abortRef = useRef<AbortController|null>(null);
  const chatRef  = useRef<HTMLDivElement>(null);

  const MAX_WORDS = 200;
  const wc = input.trim().split(/\s+/).filter(Boolean).length;

  useEffect(()=>{
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  },[msgs,loading]);

  useEffect(()=>{
    const handler = (e:MouseEvent)=>{
      const t = e.target as HTMLElement;
      if (sideOpen && !t.closest("[data-sidebar]") && !t.closest("[data-menu-btn]")) setSideOpen(false);
    };
    document.addEventListener("mousedown",handler);
    return ()=>document.removeEventListener("mousedown",handler);
  },[sideOpen]);

  const loadHistory = useCallback(async()=>{
    setHistLoading(true);
    try {
      const res  = await fetch("/api/history");
      const data = await res.json();
      setHistory(Array.isArray(data)?data:[]);
    } catch { setHistory([]); }
    setHistLoading(false);
  },[]);

  const openHistory = ()=>{ setHistOpen(true); loadHistory(); };
  const toggleCh = (id:string)=>setChannels(p=>p.includes(id)?p.filter(c=>c!==id):[...p,id]);

  const buildPrompt = (t:string)=>{
    let c="";
    if (mode)          { const m=MODES.find(x=>x.id===mode);    c+=`MODE: ${m?.label}\n`; }
    if (channels.length) c+=`CHANNELS: ${CHANNELS.filter(x=>channels.includes(x.id)).map(x=>x.label).join(", ")}\n`;
    if (chapter)         c+=`CHAPTER: ${chapter}\n`;
    return c+`\nREQUEST:\n${t}`;
  };

  const send = async(text?:string)=>{
    const userText=(text||input).trim();
    if (!userText||loading) return;
    setMsgs(p=>[...p,{role:"user",text:userText}]);
    setInput(""); setLoading(true); setSideOpen(false);
    const newHist:HI[] = [...hist,{role:"user",content:buildPrompt(userText)}];
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/chat",{
        method:"POST",signal:ctrl.signal,
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({messages:newHist,system:SYSTEM_PROMPT,sessionId}),
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
        fetch("/api/history",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({sessionId,userMsg:userText,assistantMsg:reply}),
        }).then(r=>{if(!r.ok) r.json().then(e=>console.error("History save failed:",e));})
          .catch(e=>console.error("History save error:",e));
      }
    } catch(e:unknown){
      if (e instanceof Error && e.name!=="AbortError")
        setMsgs(p=>[...p,{role:"assistant",text:"⚠️ Connection error. Please try again."}]);
    }
    abortRef.current=null; setLoading(false);
  };

  const reset = ()=>{
    abortRef.current?.abort(); abortRef.current=null;
    setLoading(false); setMsgs([]); setHist([]);
    setMode(null); setChannels([]); setChapter(""); setInput(""); setSideOpen(false);
  };

  const activeMode = MODES.find(m=>m.id===mode);

  if (!loaded) return <LoadingScreen onDone={()=>setLoaded(true)}/>;

  // ── Sidebar inner content (used in both desktop + mobile overlay) ──
  const SideInner = (
    <>
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden",padding:"20px 12px 12px"}}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:28}}>
          <DevconCircles size={36}/>
          <div>
            <div style={{fontWeight:900,fontSize:12,color:C.white,letterSpacing:1.5,lineHeight:1.3}}>DEVCON Studios</div>
            <div style={{fontSize:10,color:C.skyBlue,marginTop:2,fontWeight:600,letterSpacing:.5}}>Marketing Agent</div>
          </div>
        </div>

        {/* Workflow Mode */}
        <div style={sLabel}>WORKFLOW MODE</div>
        {MODES.map(m=>(
          <div key={m.id} style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
            <button onClick={()=>setMode(null)} style={{...xBtn,visibility:mode===m.id?"visible":"hidden"}}>✕</button>
            <button onClick={()=>setMode(mode===m.id?null:m.id)} style={{...sBtn,...(mode===m.id?sBtnA:{}),flex:1}}>
              <span style={sBtnIcon}>{m.icon}</span>{m.label}
            </button>
          </div>
        ))}

        {/* Channels */}
        <div style={{...sLabel,marginTop:20}}>CHANNEL</div>
        {CHANNELS.map(c=>(
          <div key={c.id} style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
            <button onClick={()=>toggleCh(c.id)} style={{...xBtn,visibility:channels.includes(c.id)?"visible":"hidden"}}>✕</button>
            <button onClick={()=>toggleCh(c.id)} style={{...sBtn,...(channels.includes(c.id)?sBtnA:{}),flex:1}}>
              <span style={sBtnIcon}>{c.icon}</span>{c.label}
            </button>
          </div>
        ))}

        {/* Chapter */}
        <div style={{...sLabel,marginTop:20}}>CHAPTER</div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <button onClick={()=>setChapter("")} style={{...xBtn,visibility:chapter?"visible":"hidden"}}>✕</button>
          <select value={chapter} onChange={e=>setChapter(e.target.value)}
            style={{flex:1,background:C.inputBg,border:`1px solid ${chapter?C.brightBlue:C.border}`,color:chapter?C.white:C.muted,borderRadius:7,padding:"7px 10px",fontSize:12,cursor:"pointer",transition:"border-color .15s"}}>
            <option value="">National</option>
            {CHAPTERS.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Bottom actions */}
      <div style={{padding:"12px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
        <button onClick={openHistory} style={{...sBtn,...(histOpen?sBtnA:{}),marginBottom:4}}>
          <span style={sBtnIcon}>◑</span>Prompt History
        </button>
        <button onClick={()=>setShowTour(true)} style={{...sBtn,marginBottom:6}}>
          <span style={sBtnIcon}>?</span>How to Use
        </button>
        {remaining!==null&&(
          <div style={{fontSize:10,fontWeight:600,borderRadius:20,padding:"3px 10px",marginBottom:6,display:"inline-flex",
            background:remaining<=1?"#3a1010":remaining<=2?"#2a1e08":"#0a1e14",
            color:remaining<=1?C.coral:remaining<=2?C.gold:C.teal}}>
            {remaining}/5 prompts left today
          </div>
        )}
        <button onClick={reset} style={{width:"100%",background:C.navyDark,border:`1px solid ${C.border}`,color:C.muted,borderRadius:7,padding:"8px",cursor:"pointer",fontSize:12}}>
          ↺ Reset Session
        </button>
      </div>
    </>
  );

  return (
    <div style={{display:"flex",height:"100vh",background:C.navyDeep,color:C.white,overflow:"hidden"}}>

      {showTour && <OnboardingTour onClose={()=>setShowTour(false)}/>}

      {/* Desktop sidebar */}
      <aside data-sidebar className="desktop-sidebar"
        style={{width:238,background:C.navyDark,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
        {SideInner}
      </aside>

      {/* Mobile sidebar overlay */}
      {sideOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:50,display:"flex"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(2px)"}} onClick={()=>setSideOpen(false)}/>
          <aside data-sidebar style={{position:"relative",zIndex:51,width:260,background:C.navyDark,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",height:"100vh",overflowY:"auto"}}>
            {SideInner}
          </aside>
        </div>
      )}

      {/* History panel */}
      {histOpen&&(
        <div className="history-panel"
          style={{width:270,background:C.navyDark,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden",position:"fixed",left:238,top:0,bottom:0,zIndex:40}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 14px 12px",borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontWeight:700,fontSize:13}}>Prompt History</span>
            <button onClick={()=>setHistOpen(false)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16}}>✕</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"8px"}}>
            {histLoading?(
              <div style={{color:C.muted,fontSize:12,padding:16,textAlign:"center"}}>Loading...</div>
            ):history.length===0?(
              <div style={{color:C.muted,fontSize:12,padding:16,textAlign:"center"}}>
                No history found.<br/>
                <span style={{fontSize:10,color:"#3a4a6a"}}>Check Supabase env vars in Vercel.</span>
              </div>
            ):history.map(h=>(
              <div key={h.id} className="hist-item"
                onClick={()=>{ setMsgs([{role:"user",text:h.user_message},{role:"assistant",text:h.assistant_message}]); setHistOpen(false); }}
                style={{padding:"10px",borderRadius:8,cursor:"pointer",marginBottom:4,border:`1px solid ${C.border}`,background:C.navyDeep}}>
                <div style={{fontSize:12,color:"#b0c4e0",lineHeight:1.5}}>
                  <span style={{color:C.skyBlue,marginRight:6}}>▸</span>
                  {h.user_message.slice(0,72)}{h.user_message.length>72?"…":""}
                </div>
                <div style={{fontSize:10,color:"#3a4a6a",marginTop:4}}>
                  {new Date(h.created_at).toLocaleString("en-PH",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main */}
      <main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>

        {/* Mobile topbar */}
        <div className="mobile-topbar"
          style={{display:"none",padding:"10px 14px",background:C.navyDark,borderBottom:`1px solid ${C.border}`,alignItems:"center",gap:12,flexShrink:0}}>
          <button data-menu-btn onClick={()=>setSideOpen(p=>!p)}
            style={{background:"none",border:"none",color:C.white,fontSize:22,cursor:"pointer",lineHeight:1,padding:"2px 4px"}}>☰</button>
          <DevconCircles size={24}/>
          <span style={{fontWeight:800,fontSize:13,letterSpacing:2}}>DEVCON Studios</span>
          {remaining!==null&&(
            <span style={{marginLeft:"auto",fontSize:10,color:remaining<=1?C.coral:remaining<=2?C.gold:C.teal}}>
              {remaining}/5 left
            </span>
          )}
        </div>

        {/* Chat area */}
        <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:"0 0 8px"}}>
          {msgs.length===0?(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100%",padding:"32px 20px",textAlign:"center"}}>
              <div style={{fontSize:10,letterSpacing:3,color:C.muted,border:`1px solid ${C.border}`,borderRadius:20,padding:"4px 14px",marginBottom:24}}>
                · AI POWERED STRATEGIC ENGINE ·
              </div>
              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16,flexWrap:"wrap",justifyContent:"center"}}>
                <DevconCircles size={56}/>
                <h1 style={{fontSize:"clamp(28px,5vw,60px)",fontWeight:900,lineHeight:1.05,textAlign:"left",whiteSpace:"pre-line"}}>
                  <span style={{color:C.white}}>DEVCON Studios </span>
                  <span style={{color:C.skyBlue,fontStyle:"italic"}}>{"Marketing\nAgent"}</span>
                </h1>
              </div>
              <p style={{color:C.muted,fontSize:14,lineHeight:1.7,marginBottom:28,maxWidth:540}}>
                Your intelligent workspace for engineering National and Chapter content.<br/>
                Select a workflow mode to begin generating high-impact marketing materials.
              </p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,width:"100%",maxWidth:820}}>
                {STARTERS.map((s,i)=>(
                  <button key={i} onClick={()=>send(s.text)} className="starter-card"
                    style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"flex-start",gap:12,animation:`fadeUp .3s ease ${i*.07}s both`}}>
                    <span style={{fontSize:16,color:C.brightBlue,flexShrink:0,marginTop:2}}>{s.icon}</span>
                    <span style={{color:"#b0c4e0",fontSize:13,lineHeight:1.5}}>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:16,padding:"20px 16px 8px"}}>
              {msgs.map((m,i)=>(
                <div key={i} className="msg-bubble"
                  style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",alignItems:"flex-start",gap:8,animationDelay:`${i===msgs.length-1?.05:0}s`}}>
                  {m.role==="assistant"&&(
                    <div style={{width:30,height:30,borderRadius:8,background:C.navyDark,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <DevconCircles size={20}/>
                    </div>
                  )}
                  <div style={{
                    maxWidth:"min(76%,640px)",padding:"11px 15px",fontSize:13,lineHeight:1.72,wordBreak:"break-word",
                    ...(m.role==="user"
                      ?{background:C.navy,border:`1px solid ${C.brightBlue}33`,borderRadius:"12px 12px 4px 12px",color:"#d8e8ff"}
                      :{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:"4px 12px 12px 12px",color:"#c0d4ee"})
                  }}>
                    {m.role==="assistant"?<MD text={m.text}/>:m.text}
                  </div>
                </div>
              ))}
              {loading&&(
                <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                  <div style={{width:30,height:30,borderRadius:8,background:C.navyDark,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <DevconCircles size={20}/>
                  </div>
                  <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:"4px 12px 12px 12px",padding:"14px 18px",display:"flex",gap:6,alignItems:"center"}}>
                    {[0,1,2].map(i=><span key={i} style={{width:7,height:7,borderRadius:"50%",background:C.brightBlue,display:"inline-block",animation:"blink 1.2s infinite",animationDelay:`${i*.2}s`}}/>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input bar */}
        <div style={{padding:"10px 14px 12px",background:C.navyDark,borderTop:`1px solid ${C.border}`,flexShrink:0}}>
          {(mode||channels.length>0||chapter)&&(
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              {mode&&<span style={{...tag,background:`${C.purple}22`,border:`1px solid ${C.purple}55`,color:C.skyBlue}}>{activeMode?.icon} {activeMode?.label}</span>}
              {channels.map(id=>{const c=CHANNELS.find(x=>x.id===id);return<span key={id} style={{...tag,background:`${C.teal}18`,border:`1px solid ${C.teal}44`,color:C.teal}}>{c?.icon} {c?.label}</span>;})}
              {chapter&&<span style={{...tag,background:`${C.gold}18`,border:`1px solid ${C.gold}44`,color:C.gold}}>◈ {chapter}</span>}
            </div>
          )}
          <div style={{display:"flex",gap:8,background:C.inputBg,border:`1px solid ${wc>MAX_WORDS?C.coral:C.border}`,borderRadius:14,padding:"8px 8px 8px 14px",alignItems:"flex-end",transition:"border-color .2s"}}>
            <textarea value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
              placeholder="Engineer your next strategy..."
              style={{flex:1,background:"transparent",border:"none",color:C.white,fontSize:13,resize:"none",height:50,lineHeight:1.6,paddingTop:4,fontFamily:"inherit"}}/>
            <button onClick={()=>send()} disabled={loading||!input.trim()||wc>MAX_WORDS} className="send-btn-pulse"
              style={{background:loading||!input.trim()||wc>MAX_WORDS?C.navyDeep:`linear-gradient(135deg,${C.brightBlue},${C.purple})`,border:"none",color:C.white,borderRadius:10,width:38,height:38,cursor:loading||!input.trim()||wc>MAX_WORDS?"not-allowed":"pointer",fontSize:14,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"background .2s"}}>▶</button>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6,paddingLeft:2}}>
            <span style={{fontSize:10,color:"#2a3a5a"}}>Shift+Enter for new line · Brand guidelines auto-applied</span>
            <span style={{fontSize:11,color:wc>MAX_WORDS?C.coral:wc>160?C.gold:"#2a3a5a"}}>{wc}/{MAX_WORDS}w</span>
          </div>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');
        @keyframes blink   {0%,80%,100%{opacity:.15}40%{opacity:1}}
        @keyframes fadeUp  {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn  {from{opacity:0}to{opacity:1}}
        @keyframes slideIn {from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        *{box-sizing:border-box;font-family:'Proxima Nova','Montserrat',system-ui,sans-serif}
        textarea:focus{outline:none!important}
        button:hover{opacity:.82}
        select:focus{outline:none}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:${C.navy}}
        .msg-bubble{animation:fadeUp .25s ease forwards}
        .starter-card:hover{border-color:${C.brightBlue}!important;transform:translateY(-2px)!important;background:#1a2840!important}
        .hist-item:hover{background:${C.navy}!important;border-color:${C.brightBlue}44!important}
        .send-btn-pulse:not(:disabled):hover{transform:scale(1.06)}
        @media(max-width:768px){
          .desktop-sidebar{display:none!important}
          .mobile-topbar{display:flex!important}
          .history-panel{left:0!important;width:100vw!important;z-index:45!important}
        }
      `}</style>
    </div>
  );
}