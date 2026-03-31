import AssignmentChecker from "./AssignmentChecker";
import AIDetector from "./AIDetector";
import PlagiarismChecker from "./PlagiarismChecker";
import CoverLetterWriter from "./CoverLetterWriter";
import SEOOptimizer from "./SEOOptimizer";
import AITranslator from "./AITranslator";
import FileProcessor from "./FileProcessor";
import PDFTools from "./PDFTools";
import AdvancedPDFEditor from "./AdvancedPDFEditor";
import { useState, useEffect } from "react";

const BACKEND = "https://toolplanetai-backend.onrender.com/api/ai";

const aiTools = [
  { id:"summarize",  icon:"📋", label:"AI Summarizer",         desc:"Condense any text into key points",             color:"#8b5cf6", category:"Writing",   badge:"Popular" },
  { id:"rewrite",    icon:"✨", label:"AI Rewriter",            desc:"Rewrite text in a better style",               color:"#f97316", category:"Writing",   badge:null },
  { id:"grammar",    icon:"✅", label:"Grammar Fixer",          desc:"Fix all grammar and spelling errors",          color:"#06d6a0", category:"Writing",   badge:null },
  { id:"translate",  icon:"🌍", label:"AI Translator",          desc:"Translate to any language instantly",          color:"#ff006e", category:"Writing",   badge:null },
  { id:"humanize",   icon:"🧬", label:"AI Humanizer",           desc:"Make AI text sound 100% human",                color:"#ec4899", category:"Writing",   badge:"🔥 Hot" },
  { id:"pdf2word", icon:"📄", label:"PDF to Word", desc:"Convert PDF to editable Word document", color:"#4361ee", category:"PDF Tools", badge:"New" },
  { id:"word2pdf", icon:"📝", label:"Word to PDF", desc:"Convert Word or TXT to PDF format", color:"#06d6a0", category:"PDF Tools", badge:"New" },
  { id:"pdfeditor", icon:"✏️", label:"Advanced PDF Editor", desc:"Drag text and images onto PDF pages and export", color:"#e91e8c", category:"PDF Tools", badge:"🔥 Hot" },
  { id:"fileprocess", icon:"📂", label:"Smart File Processor",   desc:"Upload PDF/DOCX/TXT → process, edit & download", color:"#8b5cf6", category:"PDF Tools", badge:"🔥 Hot" },
  { id:"aidetector", icon:"🔍", label:"AI Detector",            desc:"Detect AI-written text sentence by sentence",  color:"#dc2626", category:"PDF Tools", badge:"Popular" },
  { id:"plagiarism", icon:"🛡", label:"Plagiarism Checker",     desc:"Check originality & highlight risky text",     color:"#f97316", category:"PDF Tools", badge:null },
  { id:"assignment", icon:"🎓", label:"Assignment Checker",     desc:"Grade & get feedback on your work",            color:"#7c3aed", category:"Education", badge:null },
  { id:"coverletter",icon:"📄", label:"Cover Letter Writer",    desc:"AI cover letters that get you interviews",     color:"#14b8a6", category:"Career",   badge:"Popular" },
  { id:"seo",        icon:"🎯", label:"SEO Optimizer",          desc:"Optimize content to rank higher on Google",    color:"#eab308", category:"Marketing", badge:null },
];

const CATS = ["All","Writing","PDF Tools","Education","Career","Marketing"];

const SPECIAL = ["pdf2word","word2pdf","pdfeditor","assignment","aidetector","plagiarism","coverletter","seo","translate","fileprocess"];

const toolPrompts = {
  paragraph: v => `Write a compelling ${v.type||"informative"} paragraph about: "${v.topic}". Length: ${v.length||"medium"}. Avoid clichés. Make it genuinely engaging.`,
  humanize:  v => `Rewrite this AI-generated text to sound 100% human. Style: ${v.style||"natural"}. Vary sentences, add personality, use contractions. Don't change the meaning.\n\n${v.text}`,
  resume:    v => `Build an ATS-optimized resume for ${v.name} targeting ${v.role}. Experience: ${v.exp}. Skills: ${v.skills}. Include professional summary, skills matrix, STAR-method bullets with quantified results, and strong action verbs.`,
  keywords:  v => `Comprehensive SEO keyword research for: "${v.seed}" in ${v.industry||"general"} industry. Include primary keywords, long-tail, LSI/semantic, question-based, and commercial intent keywords. Rate competition (Low/Med/High) and business value (1-5).`,
  instagram: v => `Write 3 high-performing Instagram captions for: "${v.desc}". Vibe: ${v.vibe||"inspirational"}. Include strong hook, story, CTA, emojis, and 15-20 hashtags each. Number each option.`,
  youtube:   v => `Full YouTube optimization for: "${v.topic}" (${v.niche||"general"} niche). Provide: 5 click-worthy title options, SEO description (250+ words), 10 tags, and thumbnail text overlay suggestion.`,
  hashtags:  v => `Generate ${v.count||"20"} powerful hashtags for ${v.platform||"Instagram"} about: "${v.topic}". Mix popular, medium, and niche hashtags. Group by tier with # symbols.`,
  bizname:   v => `Generate 20 unique business names for: "${v.desc}". Style: ${v.style||"modern"}. For each: name, why it works, .com availability likelihood, tagline. Rank top 5.`,
  code:      v => `Write ${v.style||"clean, well-commented"} ${v.lang||"JavaScript"} code for: ${v.task}. Follow best practices, handle edge cases, add inline comments. Make it copy-paste ready.`,
};

const toolInputs = {
  paragraph: [
    { id:"topic", label:"Topic", placeholder:"e.g. The future of remote work", type:"text" },
    { id:"type",  label:"Type",  type:"select", opts:["Informative","Argumentative","Descriptive","Persuasive","Introductory","Concluding"] },
    { id:"length",label:"Length",type:"select", opts:["Short (50-100 words)","Medium (150-200 words)","Long (250-300 words)"] },
  ],
  humanize: [
    { id:"text",  label:"Paste AI Text", placeholder:"Paste your AI-generated text here...", type:"textarea" },
    { id:"style", label:"Target Style", type:"select", opts:["Natural & Conversational","Professional","Academic","Creative"] },
  ],
  resume: [
    { id:"name",  label:"Full Name",        placeholder:"e.g. Alex Johnson",                          type:"text" },
    { id:"role",  label:"Target Role",      placeholder:"e.g. Senior Product Manager",                type:"text" },
    { id:"exp",   label:"Work Experience",  placeholder:"Describe your past roles & achievements...", type:"textarea" },
    { id:"skills",label:"Key Skills",       placeholder:"e.g. React, Python, Leadership",             type:"text" },
  ],
  keywords: [
    { id:"seed",     label:"Seed Keyword", placeholder:"e.g. project management software", type:"text" },
    { id:"industry", label:"Industry",     placeholder:"e.g. SaaS, E-commerce, Health",    type:"text" },
  ],
  instagram: [
    { id:"desc", label:"Describe Your Post", placeholder:"e.g. Sunset after hiking to mountain top", type:"text" },
    { id:"vibe", label:"Vibe", type:"select", opts:["Inspirational","Funny & Witty","Aesthetic","Promotional","Personal Story"] },
  ],
  youtube: [
    { id:"topic", label:"Video Topic", placeholder:"e.g. How I made $10K with AI tools in 30 days", type:"text" },
    { id:"niche", label:"Your Niche",  placeholder:"e.g. Finance, Tech, Gaming",                     type:"text" },
  ],
  hashtags: [
    { id:"topic",    label:"Topic / Niche", placeholder:"e.g. fitness motivation, travel photography", type:"text" },
    { id:"platform", label:"Platform", type:"select", opts:["Instagram","TikTok","Twitter/X","LinkedIn","YouTube"] },
    { id:"count",    label:"How many", type:"select", opts:["10 hashtags","20 hashtags","30 hashtags"] },
  ],
  bizname: [
    { id:"desc",  label:"Business Description", placeholder:"e.g. Eco-friendly packaging for small businesses", type:"text" },
    { id:"style", label:"Name Style", type:"select", opts:["Modern & Minimal","Creative & Catchy","Professional","Tech/Startup","Playful"] },
  ],
  code: [
    { id:"task", label:"What should the code do?", placeholder:"e.g. Build a React login form with email validation", type:"textarea" },
    { id:"lang", label:"Language", type:"select", opts:["JavaScript","TypeScript","Python","React","Node.js","Go","SQL","HTML/CSS","PHP"] },
    { id:"style",label:"Style",    type:"select", opts:["Clean & Commented","Production-Ready","With Error Handling","With Unit Tests"] },
  ],
};

const newToolIds = ["paragraph","humanize","resume","keywords","instagram","youtube","hashtags","bizname","code"];

export default function App() {
  const [activeTool,    setActiveTool]    = useState("home");
  const [inputText,     setInputText]     = useState("");
  const [formVals,      setFormVals]      = useState({});
  const [outputText,    setOutputText]    = useState("");
  const [loading,       setLoading]       = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [darkMode,      setDarkMode]      = useState(true);
  const [mobileMenu,    setMobileMenu]    = useState(false);
  const [imageLoading,  setImageLoading]  = useState(false);
  const [fileLoading,   setFileLoading]   = useState(false);
  const [backendStatus, setBackendStatus] = useState("unknown");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeCat,     setActiveCat]     = useState("All");
  const [favorites,     setFavorites]     = useState(() => JSON.parse(localStorage.getItem("tpai_favs")||"[]"));
  const [showFavs,      setShowFavs]      = useState(false);
  const [error,         setError]         = useState("");
  const [retryCount,    setRetryCount]    = useState(0);
  const [charCount,     setCharCount]     = useState(0);

  useEffect(() => { localStorage.setItem("tpai_favs", JSON.stringify(favorites)); }, [favorites]);

  const wakeBackend = async () => {
    if (backendStatus === "ready") return;
    setBackendStatus("waking");
    try {
      await fetch(BACKEND, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({tool:"grammar",input:"test"}) });
      setBackendStatus("ready");
    } catch { setBackendStatus("ready"); }
  };

  const goToTool = (id) => {
    setActiveTool(id); setOutputText(""); setInputText(""); setFormVals({}); setError("");
    setMobileMenu(false); wakeBackend();
    window.scrollTo({ top:0, behavior:"smooth" });
  };

  const goHome = () => { setActiveTool("home"); setMobileMenu(false); window.scrollTo({ top:0, behavior:"smooth" }); };

  const toggleFav = (id, e) => {
    e.stopPropagation();
    setFavorites(f => f.includes(id) ? f.filter(x=>x!==id) : [...f, id]);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setImageLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(",")[1];
      try {
        const res = await fetch("https://toolplanetai-backend.onrender.com/api/image", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ image: base64, mediaType: file.type })
        });
        const data = await res.json();
        if (data.result) setInputText(data.result);
      } catch { setInputText("Could not read image."); }
      setImageLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setFileLoading(true);
    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        if (ext === "txt") { setInputText(ev.target.result); }
        else if (ext === "docx" || ext === "doc") {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ arrayBuffer: ev.target.result });
          setInputText(result.value || "Could not read file.");
        } else if (ext === "pdf") {
          const base64 = btoa(new Uint8Array(ev.target.result).reduce((d,b)=>d+String.fromCharCode(b),""));
          const res = await fetch("https://toolplanetai-backend.onrender.com/api/extract", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ file: base64, mediaType: file.type, fileName: file.name })
          });
          const data = await res.json();
          setInputText(data.result || "Could not read PDF.");
        } else { setInputText("Unsupported file type. Please upload PDF, Word, or TXT."); }
      } catch { setInputText("Could not read file. Please paste text manually."); }
      setFileLoading(false);
    };
    if (ext === "txt") reader.readAsText(file); else reader.readAsArrayBuffer(file);
  };

  const downloadAsWord = (text, filename) => {
    const html = `<html><head><meta charset="utf-8"></head><body><pre style="font-family:Arial;font-size:12pt;white-space:pre-wrap;">${text.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre></body></html>`;
    const blob = new Blob([html], {type:"application/msword"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename+".doc"; a.click();
    URL.revokeObjectURL(url);
  };

  const copyResult = () => {
    try { navigator.clipboard.writeText(outputText); }
    catch { const el=document.createElement("textarea");el.value=outputText;document.body.appendChild(el);el.select();document.execCommand("copy");document.body.removeChild(el); }
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  const runTool = async (retry = false) => {
    const isNewTool = newToolIds.includes(activeTool) && !["pdf2word","word2pdf","pdfeditor"].includes(activeTool);
    if (isNewTool) {
      const inputs = toolInputs[activeTool]||[];
      const firstEmpty = inputs.find(i => i.type!=="select" && !formVals[i.id]?.trim());
      if (firstEmpty) { setError(`Please fill in: ${firstEmpty.label}`); return; }
    } else {
      if (!inputText.trim()) return;
    }
    setLoading(true); setOutputText(""); setError("");
    try {
      let body;
      if (isNewTool) {
        const prompt = toolPrompts[activeTool](formVals);
        body = { tool: activeTool, input: prompt };
      } else {
        body = { tool: activeTool, input: inputText.trim() };
      }
      const res = await fetch(BACKEND, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setOutputText(data.result || data.error || "No result returned.");
    } catch(e) {
      if (!retry && retryCount < 2) {
        setRetryCount(r=>r+1);
        setTimeout(()=>runTool(true), 2000);
        setError("Connection issue — retrying automatically...");
        return;
      }
      setError("Could not connect to AI backend. Please try again.");
    }
    setLoading(false); setRetryCount(0);
  };

  const currentTool = aiTools.find(t => t.id === activeTool);
  const isNewTool = newToolIds.includes(activeTool) && !["pdf2word","word2pdf","pdfeditor"].includes(activeTool);

  const filteredTools = aiTools.filter(t => {
    const matchCat  = activeCat === "All" || t.category === activeCat;
    const matchFav  = !showFavs || favorites.includes(t.id);
    const matchSearch = !searchQuery || t.label.toLowerCase().includes(searchQuery.toLowerCase()) || t.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchFav && matchSearch;
  });

  const D = darkMode ? {
    bg:"#070714", header:"rgba(7,7,20,0.95)", card:"rgba(255,255,255,0.032)",
    cardHov:"rgba(255,255,255,0.06)", border:"rgba(255,255,255,0.08)",
    text:"#e4e4f0", muted:"#6b6b85", dim:"#333348",
    input:"rgba(255,255,255,0.032)", inputBorder:"rgba(255,255,255,0.1)",
    tag:"rgba(255,255,255,0.06)",
  } : {
    bg:"#f0f2ff", header:"rgba(255,255,255,0.97)", card:"#ffffff",
    cardHov:"#f8f7ff", border:"rgba(0,0,0,0.07)",
    text:"#1a1a2e", muted:"#5a5a78", dim:"#9090a8",
    input:"#ffffff", inputBorder:"rgba(0,0,0,0.13)",
    tag:"rgba(0,0,0,0.05)",
  };

  const gBtn = (col) => ({
    border:"none", borderRadius:12, color:"#fff", fontSize:15, fontWeight:700,
    cursor:"pointer", padding:"14px 22px", width:"100%", fontFamily:"Outfit,sans-serif",
    background:`linear-gradient(135deg,${col||"#8b5cf6"},${col?"#f97316":"#f97316"})`,
    boxShadow:`0 4px 20px ${col||"#8b5cf6"}50`, transition:"all .2s",
  });

  return (
    <div style={{minHeight:"100vh", background:D.bg, color:D.text, fontFamily:"Outfit,sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes blob1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-20px) scale(1.06)}}
        @keyframes blob2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-25px,30px) scale(1.08)}}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(139,92,246,0.3)}50%{box-shadow:0 0 40px rgba(139,92,246,0.6)}}
        .tc{transition:all .2s ease;}
        .tool-card{transition:all .22s ease;cursor:pointer;}
        .tool-card:hover{transform:translateY(-4px)!important;}
        .nav-btn:hover{background:rgba(139,92,246,0.1)!important;color:#c4b5fd!important;}
        .cat-pill:hover{background:rgba(139,92,246,0.1)!important;color:#c4b5fd!important;}
        .fav-btn:hover{transform:scale(1.2);}
        .shimmer-line{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.1) 50%,rgba(255,255,255,.04) 75%);background-size:400px 100%;animation:shimmer 1.4s infinite;border-radius:8px;}
        .copy-btn:hover{background:rgba(139,92,246,0.15)!important;border-color:rgba(139,92,246,0.4)!important;color:#c4b5fd!important;}
        .run-btn:hover{transform:translateY(-1px);filter:brightness(1.1);}
        .run-btn:active{transform:translateY(0);}
        textarea:focus,input:focus,select:focus{outline:none;border-color:rgba(139,92,246,0.6)!important;box-shadow:0 0 0 3px rgba(139,92,246,0.12)!important;}
        select option{background:#0d0d22;color:#e4e4f0;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.3);border-radius:3px;}
        @media(max-width:768px){.desktop-nav{display:none!important;}.mob-btn{display:flex!important;}.main-content{padding-top:72px!important;}}
        @media(min-width:769px){.mob-btn{display:none!important;}.mob-drop{display:none!important;}.main-content{padding-top:80px!important;}}
      `}</style>

      {/* ── AMBIENT BG ── */}
      <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
        {[["139,92,246","8%","blob1 8s","-20%","-10%","60vw"],["249,115,22","7%","blob2 10s","40%","-15%","50vw"],["6,214,160","5%","blob1 12s reverse","70%","20%","35vw"],["255,0,110","5%","blob2 9s reverse","10%","65%","28vw"]].map(([c,o,an,t,l,w],i)=>(
          <div key={i} style={{position:"absolute",top:t,left:l,width:w,height:w,borderRadius:"50%",background:`radial-gradient(circle,rgba(${c},${darkMode?o:"0.03"}) 0%,transparent 70%)`,filter:"blur(80px)",animation:an+" ease-in-out infinite"}}/>
        ))}
      </div>

      {/* ── HEADER ── */}
      <header style={{position:"fixed",top:0,left:0,right:0,zIndex:1000,background:D.header,borderBottom:"1px solid "+D.border,backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)"}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px",height:64,display:"flex",alignItems:"center",gap:14}}>

          {/* Logo */}
          <div onClick={goHome} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",flexShrink:0,userSelect:"none"}}>
            <div style={{width:38,height:38,borderRadius:11,background:"linear-gradient(135deg,#8b5cf6,#f97316)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,color:"#fff",fontSize:20,boxShadow:"0 4px 16px rgba(139,92,246,0.45)"}}>T</div>
            <div>
              <div style={{fontWeight:800,fontSize:16,lineHeight:1.1,color:D.text}}>ToolPlanetAI</div>
              <div style={{fontSize:9,color:"#06d6a0",fontFamily:"monospace",fontWeight:700,letterSpacing:1}}>AI WRITING + PDF TOOLS</div>
            </div>
          </div>

          {/* Search bar */}
          <div style={{flex:1,maxWidth:420,margin:"0 auto",position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:D.input,border:"1.5px solid "+(searchFocused?"rgba(139,92,246,0.6)":D.inputBorder),borderRadius:12,transition:"all .2s",boxShadow:searchFocused?"0 0 0 3px rgba(139,92,246,0.12)":"none"}}>
              <span style={{fontSize:14,opacity:.5}}>🔍</span>
              <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                onFocus={()=>{setSearchFocused(true);setActiveTool("home");}}
                onBlur={()=>setTimeout(()=>setSearchFocused(false),150)}
                placeholder={`Search ${aiTools.length} AI tools...`}
                style={{flex:1,background:"none",border:"none",outline:"none",color:D.text,fontSize:14,fontFamily:"Outfit,sans-serif"}}/>
              {searchQuery && <button onClick={()=>setSearchQuery("")} style={{background:"none",border:"none",color:D.muted,cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>}
            </div>
            {searchQuery && searchFocused && (
              <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:darkMode?"#0e0e22":"#fff",border:"1px solid "+D.border,borderRadius:14,zIndex:999,boxShadow:"0 16px 48px rgba(0,0,0,0.4)",overflow:"hidden",padding:8,animation:"slideDown .2s ease"}}>
                {aiTools.filter(t=>t.label.toLowerCase().includes(searchQuery.toLowerCase())||t.desc.toLowerCase().includes(searchQuery.toLowerCase())).slice(0,6).map(t=>(
                  <button key={t.id} onMouseDown={()=>{goToTool(t.id);setSearchQuery("");}}
                    style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"10px 12px",borderRadius:10,border:"none",background:"transparent",cursor:"pointer",textAlign:"left",transition:"all .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=darkMode?"rgba(139,92,246,0.08)":"rgba(139,92,246,0.05)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{width:36,height:36,borderRadius:10,background:t.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{t.icon}</div>
                    <div><div style={{fontSize:13,fontWeight:700,color:D.text}}>{t.label}</div><div style={{fontSize:11,color:D.muted}}>{t.desc}</div></div>
                    {t.badge&&<span style={{marginLeft:"auto",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,background:t.badge.includes("🔥")?"rgba(249,115,22,0.15)":t.badge==="New"?"rgba(6,214,160,0.12)":"rgba(139,92,246,0.12)",color:t.badge.includes("🔥")?"#f97316":t.badge==="New"?"#06d6a0":"#a78bfa"}}>{t.badge}</span>}
                  </button>
                ))}
                {aiTools.filter(t=>t.label.toLowerCase().includes(searchQuery.toLowerCase())).length===0&&<div style={{padding:"14px",color:D.muted,fontSize:13,textAlign:"center"}}>No tools found</div>}
              </div>
            )}
          </div>

          {/* Right controls */}
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <button onClick={()=>{setShowFavs(!showFavs);goHome();}} title="Favorites"
              style={{width:38,height:38,borderRadius:10,border:"1px solid "+D.border,background:showFavs?"rgba(234,179,8,0.12)":D.card,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,transition:"all .2s",color:showFavs?"#eab308":"inherit"}}>
              ★
            </button>
            <button onClick={()=>setDarkMode(!darkMode)}
              style={{width:38,height:38,borderRadius:10,border:"1px solid "+D.border,background:D.card,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>
              {darkMode?"🌙":"☀️"}
            </button>
            <button className="mob-btn" onClick={()=>setMobileMenu(!mobileMenu)}
              style={{display:"none",width:38,height:38,borderRadius:10,border:"1px solid "+D.border,background:D.card,cursor:"pointer",alignItems:"center",justifyContent:"center",fontSize:18,color:D.text}}>
              {mobileMenu?"✕":"☰"}
            </button>
          </div>
        </div>

        {/* Category pills */}
        {activeTool==="home"&&(
          <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px 12px",display:"flex",gap:6,overflowX:"auto",flexWrap:"nowrap"}} className="hide-scroll">
            {CATS.map(c=>(
              <button key={c} className="cat-pill tc"
                onClick={()=>{setActiveCat(c);setShowFavs(false);}}
                style={{padding:"5px 14px",borderRadius:99,border:"1px solid "+(activeCat===c?"rgba(139,92,246,0.5)":D.border),background:activeCat===c?"rgba(139,92,246,0.14)":D.tag,color:activeCat===c?"#c4b5fd":D.muted,fontSize:12,fontWeight:activeCat===c?700:500,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Mobile menu */}
        {mobileMenu&&(
          <div className="mob-drop" style={{background:D.header,borderTop:"1px solid "+D.border,padding:"10px 14px 16px",maxHeight:"75vh",overflowY:"auto",animation:"slideDown .2s ease"}}>
            <button onClick={goHome} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",borderRadius:10,border:"none",background:activeTool==="home"?"rgba(139,92,246,0.1)":"transparent",color:activeTool==="home"?"#c4b5fd":D.text,fontSize:14,fontWeight:700,cursor:"pointer",textAlign:"left",marginBottom:6}}>🏠 Home</button>
            <div style={{fontSize:10,color:D.dim,textTransform:"uppercase",letterSpacing:1.5,padding:"4px 12px 8px",fontFamily:"monospace",fontWeight:700}}>All {aiTools.length} Tools</div>
            {aiTools.map(t=>(
              <button key={t.id} onClick={()=>goToTool(t.id)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",borderRadius:10,border:"none",background:activeTool===t.id?"rgba(139,92,246,0.1)":"transparent",color:activeTool===t.id?"#c4b5fd":D.text,fontSize:13,cursor:"pointer",textAlign:"left",marginBottom:2}}>
                <span style={{fontSize:18}}>{t.icon}</span>
                <div style={{flex:1}}><div style={{fontWeight:600}}>{t.label}</div><div style={{fontSize:11,color:D.muted}}>{t.desc}</div></div>
                {t.badge&&<span style={{fontSize:10,padding:"2px 6px",borderRadius:99,background:"rgba(249,115,22,0.15)",color:"#f97316"}}>{t.badge}</span>}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── MAIN ── */}
      <main className="main-content" style={{maxWidth:920,margin:"0 auto",padding:"80px 20px 60px",position:"relative",zIndex:1}}>

        {/* Status banner */}
        {backendStatus==="waking"&&(
          <div style={{padding:"10px 16px",background:"rgba(234,179,8,0.08)",border:"1px solid rgba(234,179,8,0.2)",borderRadius:10,marginBottom:16,display:"flex",alignItems:"center",gap:10,animation:"fadeIn .3s ease"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#eab308",animation:"pulse 1s infinite",flexShrink:0}}/>
            <p style={{color:"#eab308",fontSize:12,margin:0,fontWeight:600}}>AI server warming up — first request may take up to 30 seconds.</p>
          </div>
        )}

        {/* Back button */}
        {activeTool!=="home"&&(
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:22,animation:"fadeIn .3s ease"}}>
            <button onClick={goHome} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:10,border:"1px solid "+D.border,background:D.card,color:D.muted,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .15s"}} className="tc">← Back</button>
            {currentTool&&<><span style={{color:D.dim}}>›</span><span style={{fontSize:17}}>{currentTool.icon}</span><span style={{color:D.text,fontSize:13,fontWeight:700}}>{currentTool.label}</span></>}
          </div>
        )}

        {/* ── HOME ── */}
        {activeTool==="home"&&(
          <div style={{animation:"fadeIn .4s ease"}}>

            {/* Hero */}
            <div style={{textAlign:"center",padding:"32px 0 48px"}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(6,214,160,0.08)",border:"1px solid rgba(6,214,160,0.2)",borderRadius:100,padding:"5px 16px",fontSize:11,fontWeight:700,color:"#06d6a0",fontFamily:"monospace",marginBottom:20,letterSpacing:.8}}>
                ● FREE TOOLS · PDF + AI WRITING · NO SIGNUP
              </div>
              <h1 style={{fontSize:"clamp(30px,6vw,52px)",fontWeight:900,background:"linear-gradient(135deg,#fff 0%,#c4b5fd 45%,#f97316 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1.1,marginBottom:14}}>
                AI Writing & PDF Tools That Save You Time
              </h1>
              <p style={{color:D.muted,fontSize:15,maxWidth:500,margin:"0 auto 28px",lineHeight:1.7}}>
                Rewrite text, humanize AI content, improve SEO, check assignments, and work with PDFs — all in one fast platform with no signup required.
              </p>

              {/* Stats */}
              <div style={{display:"inline-flex",gap:24,padding:"14px 28px",background:D.card,border:"1px solid "+D.border,borderRadius:16,marginBottom:20,flexWrap:"wrap",justifyContent:"center"}}>
                {[[aiTools.length+"+","Tools"],["100%","Free"],["0","Signup"],["PDF + AI","Focus"]].map(([n,l])=>(
                  <div key={l} style={{textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:800,background:"linear-gradient(135deg,#c4b5fd,#f97316)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{n}</div>
                    <div style={{fontSize:11,color:D.muted}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Favorites notice */}
            {showFavs&&(
              <div style={{padding:"10px 16px",background:"rgba(234,179,8,0.07)",border:"1px solid rgba(234,179,8,0.2)",borderRadius:10,marginBottom:20,fontSize:13,color:"#eab308",display:"flex",alignItems:"center",gap:8}}>
                ★ Showing your {favorites.length} saved tools — <button onClick={()=>setShowFavs(false)} style={{background:"none",border:"none",color:"#eab308",cursor:"pointer",fontFamily:"Outfit,sans-serif",fontSize:13,fontWeight:600}}>show all</button>
              </div>
            )}

            {/* Tools grid */}
            {CATS.filter(c=>c!=="All").map(cat=>{
              const tools = filteredTools.filter(t=>t.category===cat);
              if (!tools.length) return null;
              const isNew = cat === "Marketing" || cat === "Developer" || cat === "Business";
              return (
                <div key={cat} style={{marginBottom:40}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                    <h2 style={{fontSize:11,fontWeight:700,color:D.dim,textTransform:"uppercase",letterSpacing:2,fontFamily:"monospace",whiteSpace:"nowrap"}}>{cat}</h2>
                    {isNew&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:"rgba(6,214,160,0.12)",color:"#06d6a0",fontWeight:700}}>NEW TOOLS ADDED</span>}
                    <div style={{flex:1,height:"1px",background:D.border}}/>
                    <span style={{fontSize:11,color:D.dim,whiteSpace:"nowrap"}}>{tools.length} tools</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:12}}>
                    {tools.map(t=>(
                      <div key={t.id} className="tool-card" onClick={()=>goToTool(t.id)}
                        style={{padding:"18px 16px",background:D.card,border:"1px solid "+D.border,borderRadius:16,position:"relative",overflow:"hidden",boxShadow:darkMode?"none":"0 2px 10px rgba(0,0,0,0.06)"}}>
                        <div style={{position:"absolute",inset:0,background:`radial-gradient(circle at top left,${t.color}08,transparent 60%)`,pointerEvents:"none"}}/>
                        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
                          <div style={{width:42,height:42,borderRadius:12,background:t.color+"18",border:"1px solid "+t.color+"25",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{t.icon}</div>
                          <button className="fav-btn tc" onClick={e=>toggleFav(t.id,e)}
                            style={{background:"none",border:"none",cursor:"pointer",fontSize:15,color:favorites.includes(t.id)?"#eab308":"rgba(255,255,255,0.2)",padding:2,lineHeight:1}}>
                            {favorites.includes(t.id)?"★":"☆"}
                          </button>
                        </div>
                        <div style={{fontSize:13,fontWeight:700,color:D.text,marginBottom:5,lineHeight:1.3}}>{t.label}</div>
                        <div style={{fontSize:11,color:D.muted,lineHeight:1.5,marginBottom:12}}>{t.desc}</div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <span style={{fontSize:11,color:t.color,fontWeight:600}}>Try free →</span>
                          {t.badge&&<span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,background:t.badge.includes("🔥")?"rgba(249,115,22,0.15)":t.badge==="New"?"rgba(6,214,160,0.12)":t.badge==="Popular"?"rgba(139,92,246,0.12)":"rgba(255,255,255,0.06)",color:t.badge.includes("🔥")?"#f97316":t.badge==="New"?"#06d6a0":t.badge==="Popular"?"#a78bfa":D.muted}}>{t.badge}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredTools.length===0&&(
              <div style={{textAlign:"center",padding:"60px 0",color:D.muted}}>
                <div style={{fontSize:40,marginBottom:14}}>🔍</div>
                <p style={{fontSize:16,fontWeight:600}}>No tools found</p>
                <p style={{fontSize:13,marginTop:6}}>Try a different search or category</p>
                <button onClick={()=>{setSearchQuery("");setActiveCat("All");setShowFavs(false);}} style={{marginTop:16,padding:"9px 20px",borderRadius:10,border:"1px solid "+D.border,background:D.card,color:D.muted,cursor:"pointer",fontSize:13,fontFamily:"Outfit,sans-serif"}}>Clear filters</button>
              </div>
            )}
          </div>
        )}

        {/* ── SPECIAL TOOLS ── */}
        {activeTool==="pdf2word"&&<div style={{animation:"fadeIn .3s ease"}}><PDFTools key="pdf2word" darkMode={darkMode} activeTool="pdf2word"/></div>}
        {activeTool==="word2pdf"&&<div style={{animation:"fadeIn .3s ease"}}><PDFTools key="word2pdf" darkMode={darkMode} activeTool="word2pdf"/></div>}
        {activeTool==="pdfeditor"&&<div style={{animation:"fadeIn .3s ease"}}><AdvancedPDFEditor darkMode={darkMode}/></div>}
        
        
        
        {activeTool==="fileprocess"&&<div style={{animation:"fadeIn .3s ease"}}><FileProcessor darkMode={darkMode}/></div>}
        
        {activeTool==="assignment"&&<div style={{animation:"fadeIn .3s ease"}}><AssignmentChecker darkMode={darkMode} downloadAsWord={downloadAsWord}/></div>}
        {activeTool==="aidetector"&&<div style={{animation:"fadeIn .3s ease"}}><AIDetector darkMode={darkMode} downloadAsWord={downloadAsWord}/></div>}
        {activeTool==="plagiarism"&&<div style={{animation:"fadeIn .3s ease"}}><PlagiarismChecker darkMode={darkMode} downloadAsWord={downloadAsWord}/></div>}
        {activeTool==="coverletter"&&<div style={{animation:"fadeIn .3s ease"}}><CoverLetterWriter darkMode={darkMode} downloadAsWord={downloadAsWord}/></div>}
        {activeTool==="seo"&&<div style={{animation:"fadeIn .3s ease"}}><SEOOptimizer darkMode={darkMode} downloadAsWord={downloadAsWord}/></div>}
        {activeTool==="translate"&&<div style={{animation:"fadeIn .3s ease"}}><AITranslator darkMode={darkMode}/></div>}

        {/* ── NEW FORM-BASED TOOLS ── */}
        {currentTool && isNewTool && !["pdf2word","word2pdf","pdfeditor"].includes(activeTool) && (
          <div style={{animation:"fadeIn .3s ease"}}>
            {/* Tool header */}
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24,padding:"20px 22px",background:D.card,border:"1px solid "+D.border,borderRadius:16}}>
              <div style={{width:52,height:52,borderRadius:14,background:currentTool.color+"18",border:"1px solid "+currentTool.color+"28",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{currentTool.icon}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                  <h2 style={{fontSize:20,fontWeight:800,color:D.text}}>{currentTool.label}</h2>
                  {currentTool.badge&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:"rgba(6,214,160,0.12)",color:"#06d6a0"}}>{currentTool.badge}</span>}
                </div>
                <p style={{color:D.muted,fontSize:13,margin:0}}>{currentTool.desc}</p>
              </div>
              <div style={{padding:"4px 12px",background:"rgba(6,214,160,0.08)",border:"1px solid rgba(6,214,160,0.2)",borderRadius:99,fontSize:10,color:"#06d6a0",fontWeight:700,fontFamily:"monospace",flexShrink:0}}>FREE</div>
            </div>

            {/* Inputs */}
            <div style={{background:D.card,border:"1px solid "+D.border,borderRadius:16,padding:24,marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:D.dim,textTransform:"uppercase",letterSpacing:1.5,marginBottom:18,fontFamily:"monospace"}}>Configure Your Request</div>
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                {(toolInputs[activeTool]||[]).map(inp=>(
                  <div key={inp.id}>
                    <label style={{display:"block",fontSize:13,fontWeight:600,color:D.muted,marginBottom:7}}>{inp.label}</label>
                    {inp.type==="select"?(
                      <select value={formVals[inp.id]||""} onChange={e=>setFormVals(p=>({...p,[inp.id]:e.target.value}))}
                        style={{width:"100%",padding:"11px 14px",background:D.input,border:"1px solid "+D.inputBorder,borderRadius:11,color:D.text,fontSize:14,fontFamily:"Outfit,sans-serif",cursor:"pointer",appearance:"none"}}>
                        <option value="">Choose {inp.label}…</option>
                        {inp.opts.map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                    ):inp.type==="textarea"?(
                      <textarea value={formVals[inp.id]||""} onChange={e=>setFormVals(p=>({...p,[inp.id]:e.target.value}))}
                        placeholder={inp.placeholder} rows={4}
                        style={{width:"100%",padding:"12px 14px",background:D.input,border:"1px solid "+D.inputBorder,borderRadius:11,color:D.text,fontSize:14,fontFamily:"Outfit,sans-serif",resize:"vertical",lineHeight:1.6}}/>
                    ):(
                      <input value={formVals[inp.id]||""} onChange={e=>setFormVals(p=>({...p,[inp.id]:e.target.value}))}
                        placeholder={inp.placeholder}
                        style={{width:"100%",padding:"11px 14px",background:D.input,border:"1px solid "+D.inputBorder,borderRadius:11,color:D.text,fontSize:14,fontFamily:"Outfit,sans-serif"}}/>
                    )}
                  </div>
                ))}
              </div>

              {error&&(
                <div style={{marginTop:14,padding:"10px 14px",background:"rgba(220,38,38,0.08)",border:"1px solid rgba(220,38,38,0.2)",borderRadius:10,fontSize:13,color:"#fca5a5",display:"flex",alignItems:"center",gap:8}}>
                  ⚠️ {error}
                </div>
              )}

              <button onClick={()=>runTool(false)} disabled={loading} className="run-btn"
                style={{...gBtn(currentTool.color),marginTop:20,opacity:loading ? 0.7 : 1,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                {loading?(
                  <><span style={{display:"inline-block",animation:"spin 1s linear infinite",fontSize:16}}>⟳</span> Generating with AI...</>
                ):(
                  <>🧠 Generate {currentTool.label}</>
                )}
              </button>
            </div>

            {/* Loading skeleton */}
            {loading&&!outputText&&(
              <div style={{background:D.card,border:"1px solid "+D.border,borderRadius:16,padding:24}}>
                {[80,60,92,55,75,45,65].map((w,i)=>(
                  <div key={i} className="shimmer-line" style={{height:14,width:w+"%",marginBottom:14}}/>
                ))}
              </div>
            )}

            {/* Output */}
            {outputText&&!loading&&(
              <div style={{background:D.card,border:"1px solid rgba(139,92,246,0.2)",borderRadius:16,padding:24,animation:"fadeIn .4s ease"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:"#06d6a0",boxShadow:"0 0 8px #06d6a0"}}/>
                    <span style={{fontSize:13,fontWeight:700,color:"#06d6a0"}}>Generated Successfully</span>
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {[["📋 Copy",copyResult,copied?"✓ Copied!":null],["⬇️ Download",()=>downloadAsWord(outputText,currentTool.id+"-result"),null],["🔄 Retry",()=>runTool(false),null]].map(([label,fn,override])=>(
                      <button key={label} onClick={fn} className="copy-btn tc"
                        style={{padding:"8px 14px",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:600,background:D.tag,border:"1px solid "+D.border,color:D.muted,fontFamily:"Outfit,sans-serif"}}>
                        {override||label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{background:darkMode?"rgba(0,0,0,0.3)":"rgba(0,0,0,0.03)",borderRadius:12,padding:20,fontSize:14,lineHeight:1.85,color:D.text,whiteSpace:"pre-wrap",maxHeight:520,overflowY:"auto",fontFamily:activeTool==="code"?"monospace":undefined}}>
                  {outputText}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GENERIC TEXT TOOLS ── */}
        {currentTool && !SPECIAL.includes(activeTool) && !isNewTool && (
          <div style={{animation:"fadeIn .3s ease"}}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24,padding:"20px 22px",background:D.card,border:"1px solid "+D.border,borderRadius:16}}>
              <div style={{width:52,height:52,borderRadius:14,background:currentTool.color+"18",border:"1px solid "+currentTool.color+"28",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{currentTool.icon}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                  <h2 style={{fontSize:20,fontWeight:800,color:D.text}}>{currentTool.label}</h2>
                  {currentTool.badge&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:"rgba(6,214,160,0.12)",color:"#06d6a0"}}>{currentTool.badge}</span>}
                </div>
                <p style={{color:D.muted,fontSize:13,margin:0}}>{currentTool.desc}</p>
              </div>
              <div style={{padding:"4px 12px",background:"rgba(6,214,160,0.08)",border:"1px solid rgba(6,214,160,0.2)",borderRadius:99,fontSize:10,color:"#06d6a0",fontWeight:700,fontFamily:"monospace",flexShrink:0}}>FREE</div>
            </div>

            <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
              {[["📸 Upload Image","image/*",handleImageUpload,imageLoading],["📄 Upload PDF/Word",".pdf,.doc,.docx,.txt",handleFileUpload,fileLoading]].map(([label,accept,handler,ldg])=>(
                <label key={label} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"rgba(139,92,246,0.08)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:600,color:"#c4b5fd"}}>
                  {ldg?"⏳ Reading...":label}
                  <input type="file" accept={accept} onChange={handler} style={{display:"none"}}/>
                </label>
              ))}
              <span style={{fontSize:11,color:D.muted,display:"flex",alignItems:"center"}}>or type below</span>
            </div>

            <textarea value={inputText} onChange={e=>{setInputText(e.target.value);setCharCount(e.target.value.length);}}
              placeholder={activeTool==="prompt"?"Enter your topic or idea...":"Type or paste your text here..."}
              style={{width:"100%",minHeight:160,padding:16,background:D.input,border:"1.5px solid "+D.inputBorder,borderRadius:14,color:D.text,fontSize:14,fontFamily:"Outfit,sans-serif",resize:"vertical",lineHeight:1.7}}/>

            <div style={{display:"flex",justifyContent:"space-between",margin:"6px 4px 14px",flexWrap:"wrap",gap:6}}>
              <div style={{fontSize:11,color:D.muted}}>
                {inputText.trim()?`${inputText.trim().split(/\s+/).length} words · ${charCount} chars`:"0 words · 0 chars"}
                {charCount>5000&&<span style={{color:"#f97316",marginLeft:8}}>⚠ Long text may be truncated</span>}
              </div>
              <button onClick={()=>{setInputText("");setCharCount(0);setOutputText("");}} style={{fontSize:11,color:D.muted,background:"none",border:"none",cursor:"pointer",fontFamily:"Outfit,sans-serif"}}>🗑 Clear</button>
            </div>

            {error&&(
              <div style={{padding:"10px 14px",background:"rgba(220,38,38,0.08)",border:"1px solid rgba(220,38,38,0.2)",borderRadius:10,fontSize:13,color:"#fca5a5",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={()=>runTool(false)} disabled={!inputText.trim()||loading} className="run-btn"
              style={{...gBtn(currentTool.color),opacity:!inputText.trim()?0.45:1,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
              {loading?(
                <><span style={{display:"inline-block",animation:"spin 1s linear infinite",fontSize:16}}>⟳</span> Processing...</>
              ):(
                <>🧠 Run {currentTool.label}</>
              )}
            </button>

            {loading&&!outputText&&(
              <div style={{marginTop:16,background:D.card,border:"1px solid "+D.border,borderRadius:16,padding:22}}>
                {[75,55,88,50,70].map((w,i)=>(
                  <div key={i} className="shimmer-line" style={{height:14,width:w+"%",marginBottom:14}}/>
                ))}
              </div>
            )}

            {outputText&&!loading&&(
              <div style={{marginTop:16,background:D.card,border:"1px solid rgba(139,92,246,0.2)",borderRadius:16,padding:22,animation:"fadeIn .4s ease"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:"#06d6a0"}}/>
                    <span style={{fontSize:13,fontWeight:700,color:"#06d6a0"}}>✨ AI Result</span>
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button onClick={copyResult} className="copy-btn tc" style={{padding:"8px 14px",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:600,background:copied?"rgba(6,214,160,0.1)":"rgba(139,92,246,0.08)",border:copied?"1px solid rgba(6,214,160,0.3)":"1px solid rgba(139,92,246,0.2)",color:copied?"#06d6a0":"#a78bfa",fontFamily:"Outfit,sans-serif"}}>{copied?"✓ Copied!":"📋 Copy"}</button>
                    <button onClick={()=>downloadAsWord(outputText,activeTool+"-result")} className="copy-btn tc" style={{padding:"8px 14px",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:600,background:D.tag,border:"1px solid "+D.border,color:D.muted,fontFamily:"Outfit,sans-serif"}}>⬇️ Download</button>
                    <button onClick={()=>{setInputText("");setOutputText("");}} className="copy-btn tc" style={{padding:"8px 14px",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:600,background:D.tag,border:"1px solid "+D.border,color:D.muted,fontFamily:"Outfit,sans-serif"}}>🔄 New</button>
                  </div>
                </div>
                <div style={{background:darkMode?"rgba(0,0,0,0.25)":"rgba(0,0,0,0.03)",borderRadius:12,padding:18,fontSize:14,lineHeight:1.85,color:D.text,whiteSpace:"pre-wrap",maxHeight:500,overflowY:"auto"}}>
                  {outputText}
                </div>
              </div>
            )}

            {/* Related tools */}
            <div style={{marginTop:32,paddingTop:24,borderTop:"1px solid "+D.border}}>
              <div style={{fontSize:11,fontWeight:700,color:D.dim,textTransform:"uppercase",letterSpacing:1.5,marginBottom:12,fontFamily:"monospace"}}>You might also like</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {aiTools.filter(t=>t.id!==activeTool&&t.category===currentTool.category).slice(0,5).map(t=>(
                  <button key={t.id} onClick={()=>goToTool(t.id)} className="tc"
                    style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:D.card,border:"1px solid "+D.border,borderRadius:10,cursor:"pointer",fontSize:12,color:D.muted,fontWeight:500,fontFamily:"Outfit,sans-serif"}}>
                    <span>{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <footer style={{textAlign:"center",marginTop:64,paddingTop:24,borderTop:"1px solid "+D.border}}>
          <div style={{marginBottom:10,display:"flex",justifyContent:"center",gap:20,flexWrap:"wrap"}}>
            {[["About","/about.html"],["Contact","/contact.html"],["Privacy","/privacy.html"],["Sitemap","/sitemap.xml"]].map(([l,h])=>(
              <a key={l} href={h} style={{fontSize:12,color:D.muted,textDecoration:"none"}}>{l}</a>
            ))}
          </div>
          <p style={{fontSize:11,color:D.dim,fontFamily:"monospace"}}>© 2025 ToolPlanetAI · {aiTools.length} Free AI Tools · No signup required</p>
        </footer>
      </main>
    </div>
  );
}
