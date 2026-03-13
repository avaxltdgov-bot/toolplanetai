import PDFEditor from "./PDFEditor";
import AssignmentChecker from "./AssignmentChecker";
import AIDetector from "./AIDetector";
import PlagiarismChecker from "./PlagiarismChecker";
import CoverLetterWriter from "./CoverLetterWriter";
import SEOOptimizer from "./SEOOptimizer";
import AITranslator from "./AITranslator";
import { useState } from "react";

const aiTools = [
  { id: "summarize", icon: "📋", label: "AI Summarizer", desc: "Condense any text into key points", color: "#8b5cf6", category: "Writing" },
  { id: "rewrite", icon: "✨", label: "AI Rewriter", desc: "Rewrite text in a better way", color: "#f97316", category: "Writing" },
  { id: "grammar", icon: "✅", label: "Grammar Fixer", desc: "Fix all grammar and spelling errors", color: "#06d6a0", category: "Writing" },
  { id: "expand", icon: "📐", label: "Text Expander", desc: "Expand short text into detailed content", color: "#e91e8c", category: "Writing" },
  { id: "tone", icon: "🎭", label: "Tone Changer", desc: "Rewrite in any tone you want", color: "#4361ee", category: "Writing" },
  { id: "translate", icon: "🌍", label: "AI Translator", desc: "Translate to any language", color: "#ff006e", category: "Writing" },
  { id: "prompt", icon: "⚡", label: "Prompt Generator", desc: "Generate powerful AI prompts", color: "#eab308", category: "AI" },
  { id: "email", icon: "📧", label: "Email Writer", desc: "Write professional emails", color: "#14b8a6", category: "Writing" },
  { id: "assignment", icon: "🎓", label: "Assignment Checker", desc: "Grade & get detailed feedback on your work", color: "#7c3aed", category: "Education" },
  { id: "aidetector", icon: "🔍", label: "AI Detector", desc: "Detect AI-written text sentence by sentence", color: "#dc2626", category: "AI" },
  { id: "plagiarism", icon: "📝", label: "Plagiarism Checker", desc: "Check originality and highlight risky sentences", color: "#f97316", category: "Education" },
  { id: "coverletter", icon: "📄", label: "Cover Letter Writer", desc: "AI cover letters that get you interviews", color: "#14b8a6", category: "Career" },
  { id: "seo", icon: "🎯", label: "SEO Optimizer", desc: "Optimize content to rank higher on Google", color: "#eab308", category: "Marketing" },
];

export default function App() {
  const [activeTool, setActiveTool] = useState("home");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [swinging, setSwinging] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("unknown");
  const [loadingDots, setLoadingDots] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const wakeBackend = async () => {
    if (backendStatus === "ready") return;
    setBackendStatus("waking");
    let dots = 0;
    const interval = setInterval(() => { dots = (dots + 1) % 4; setLoadingDots(".".repeat(dots)); }, 500);
    try {
      await fetch("https://toolplanetai-backend.onrender.com/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "grammar", input: "test" })
      });
      setBackendStatus("ready");
    } catch(e) { setBackendStatus("ready"); }
    clearInterval(interval);
    setLoadingDots("");
  };

  const goToTool = (id) => {
    setActiveTool(id); setOutputText(""); setInputText("");
    setMobileMenuOpen(false); wakeBackend();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goHome = () => {
    setActiveTool("home"); setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setImageLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(",")[1];
      try {
        const res = await fetch("https://toolplanetai-backend.onrender.com/api/image", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mediaType: file.type })
        });
        const data = await res.json();
        if (data.result) setInputText(data.result);
      } catch(err) { setInputText("Could not read image."); }
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
        if (ext === "txt") {
          setInputText(ev.target.result);
        } else if (ext === "docx" || ext === "doc") {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ arrayBuffer: ev.target.result });
          setInputText(result.value || "Could not read file.");
        } else if (ext === "pdf") {
          const base64 = btoa(new Uint8Array(ev.target.result).reduce((d,b)=>d+String.fromCharCode(b),""));
          const res = await fetch("https://toolplanetai-backend.onrender.com/api/extract", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file: base64, mediaType: file.type, fileName: file.name })
          });
          const data = await res.json();
          setInputText(data.result || "Could not read PDF.");
        } else {
          setInputText("Unsupported file type. Please upload PDF, Word, or TXT.");
        }
      } catch(err) {
        console.error("File upload error:", err);
        setInputText("Could not read file. Please paste text manually.");
      }
      setFileLoading(false);
    };
    if (ext === "txt") reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  };

  const currentTool = aiTools.find(t => t.id === activeTool);

  const toggleTheme = () => { setSwinging(true); setTimeout(() => setSwinging(false), 600); setDarkMode(!darkMode); };

  const copyResult = () => {
    try { navigator.clipboard.writeText(outputText); }
    catch(e) { const el=document.createElement("textarea");el.value=outputText;document.body.appendChild(el);el.select();document.execCommand("copy");document.body.removeChild(el); }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const shareResult = () => {
    const text = "I used " + (currentTool && currentTool.label) + " on ToolPlanetAI! Check it out at https://toolplanetai.com";
    if (navigator.share) { navigator.share({ title: "ToolPlanetAI", text, url: "https://toolplanetai.com" }); }
    else {
      try { navigator.clipboard.writeText(text); }
      catch(e) { const el=document.createElement("textarea");el.value=text;document.body.appendChild(el);el.select();document.execCommand("copy");document.body.removeChild(el); }
      alert("Link copied! Share it with friends");
    }
  };

  const runTool = () => {
    if (!inputText.trim()) return;
    setLoading(true); setOutputText("");
    fetch("https://toolplanetai-backend.onrender.com/api/ai", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool: activeTool, input: inputText.trim() })
    })
    .then(r => r.json())
    .then(data => { setOutputText(data.result || data.error); setLoading(false); })
    .catch(() => { setOutputText("Could not connect to backend."); setLoading(false); });
  };

  const D = darkMode ? {
    bg: "#080810", header: "rgba(8,8,20,0.97)", card: "rgba(255,255,255,0.025)",
    border: "rgba(255,255,255,0.07)", text: "#e4e4f0", muted: "#6b6b85",
    dim: "#333348", input: "rgba(255,255,255,0.025)", inputBorder: "rgba(255,255,255,0.08)"
  } : {
    bg: "#f4f6ff", header: "rgba(255,255,255,0.97)", card: "#ffffff",
    border: "rgba(0,0,0,0.08)", text: "#1a1a2e", muted: "#555570",
    dim: "#888899", input: "#ffffff", inputBorder: "rgba(0,0,0,0.15)"
  };

  const categories = [...new Set(aiTools.map(t => t.category))];
  const specialTools = ["pdfeditor","assignment","aidetector","plagiarism","coverletter","seo"];

  return (
    <div style={{ minHeight: "100vh", background: D.bg, color: D.text, fontFamily: "Outfit,sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes swing{0%{transform:rotate(0)}25%{transform:rotate(15deg)}50%{transform:rotate(-15deg)}75%{transform:rotate(8deg)}100%{transform:rotate(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} @keyframes blob1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-20px) scale(1.06)}} @keyframes blob2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-25px,30px) scale(1.08)}}
        .swing{animation:swing 0.6s ease;transform-origin:top center;}
        .tool-card{transition:all 0.2s ease;}
        .tool-card:hover{transform:translateY(-3px);box-shadow:0 10px 30px rgba(139,92,246,0.15)!important;border-color:rgba(139,92,246,0.3)!important;}
        .nav-btn:hover{background:rgba(139,92,246,0.08)!important;color:#c4b5fd!important;}
        .mobile-item:hover{background:rgba(139,92,246,0.08)!important;}
        @media(max-width:768px){
          .desktop-nav{display:none!important;}
          .mobile-btn{display:flex!important;}
          .main-pad{padding-top:70px!important;}
        }
        @media(min-width:769px){
          .mobile-btn{display:none!important;}
          .mobile-drop{display:none!important;}
          .main-pad{padding-top:80px!important;}
        }
      `}</style>

      {/* HEADER */}
      <header style={{position:"fixed",top:0,left:0,right:0,zIndex:1000,background:D.header,borderBottom:"1px solid "+D.border,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",boxShadow:darkMode?"0 1px 30px rgba(0,0,0,0.5)":"0 1px 15px rgba(0,0,0,0.08)"}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px",height:64,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}>

          {/* Logo */}
          <div onClick={goHome} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",flexShrink:0}}>
            <div style={{width:38,height:38,borderRadius:11,background:"linear-gradient(135deg,#8b5cf6,#f97316)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,fontWeight:900,color:"#fff"}}>T</div>
            <div>
              <div style={{fontWeight:800,fontSize:16,color:D.text,lineHeight:1.1}}>ToolPlanetAI</div>
              <div style={{fontSize:9,color:"#06d6a0",fontFamily:"monospace",fontWeight:700,letterSpacing:1}}>13 FREE AI TOOLS</div>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="desktop-nav" style={{display:"flex",alignItems:"center",gap:2,flex:1,justifyContent:"center",overflowX:"auto",flexWrap:"nowrap"}}>
            <button className="nav-btn" onClick={goHome} style={{padding:"7px 14px",borderRadius:8,border:"none",background:activeTool==="home"?"rgba(139,92,246,0.12)":"transparent",color:activeTool==="home"?"#c4b5fd":D.muted,fontSize:13,fontWeight:activeTool==="home"?700:500,cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap"}}>🏠 Home</button>
            <div style={{position:"relative"}} onMouseEnter={e=>e.currentTarget.querySelector(".dropdown").style.display="block"} onMouseLeave={e=>e.currentTarget.querySelector(".dropdown").style.display="none"}>
              <button className="nav-btn" style={{padding:"7px 14px",borderRadius:8,border:"none",background:["summarize","rewrite","grammar","expand","tone","translate","email"].includes(activeTool)?"rgba(139,92,246,0.12)":"transparent",color:["summarize","rewrite","grammar","expand","tone","translate","email"].includes(activeTool)?"#c4b5fd":D.muted,fontSize:13,fontWeight:500,cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap"}}>✍️ Writing ▾</button>
              <div className="dropdown" style={{display:"none",position:"absolute",top:"100%",left:0,background:D.header,border:"1px solid "+D.border,borderRadius:12,padding:8,minWidth:200,zIndex:999,boxShadow:"0 8px 30px rgba(0,0,0,0.3)"}}>
                {aiTools.filter(t=>t.category==="Writing").map(t=>(
                  <button key={t.id} onClick={()=>goToTool(t.id)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",borderRadius:8,border:"none",background:activeTool===t.id?"rgba(139,92,246,0.1)":"transparent",color:activeTool===t.id?"#c4b5fd":D.text,fontSize:13,cursor:"pointer",textAlign:"left",whiteSpace:"nowrap"}}>{t.icon} {t.label}</button>
                ))}
              </div>
            </div>
            <div style={{position:"relative"}} onMouseEnter={e=>e.currentTarget.querySelector(".dropdown").style.display="block"} onMouseLeave={e=>e.currentTarget.querySelector(".dropdown").style.display="none"}>
              <button className="nav-btn" style={{padding:"7px 14px",borderRadius:8,border:"none",background:["aidetector","prompt"].includes(activeTool)?"rgba(139,92,246,0.12)":"transparent",color:["aidetector","prompt"].includes(activeTool)?"#c4b5fd":D.muted,fontSize:13,fontWeight:500,cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap"}}>🤖 AI Tools ▾</button>
              <div className="dropdown" style={{display:"none",position:"absolute",top:"100%",left:0,background:D.header,border:"1px solid "+D.border,borderRadius:12,padding:8,minWidth:200,zIndex:999,boxShadow:"0 8px 30px rgba(0,0,0,0.3)"}}>
                {aiTools.filter(t=>t.category==="AI").map(t=>(
                  <button key={t.id} onClick={()=>goToTool(t.id)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",borderRadius:8,border:"none",background:activeTool===t.id?"rgba(139,92,246,0.1)":"transparent",color:activeTool===t.id?"#c4b5fd":D.text,fontSize:13,cursor:"pointer",textAlign:"left",whiteSpace:"nowrap"}}>{t.icon} {t.label}</button>
                ))}
                <button onClick={()=>goToTool("plagiarism")} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",borderRadius:8,border:"none",background:activeTool==="plagiarism"?"rgba(139,92,246,0.1)":"transparent",color:activeTool==="plagiarism"?"#c4b5fd":D.text,fontSize:13,cursor:"pointer",textAlign:"left",whiteSpace:"nowrap"}}>📝 Plagiarism Checker</button>
              </div>
            </div>
            <div style={{position:"relative"}} onMouseEnter={e=>e.currentTarget.querySelector(".dropdown").style.display="block"} onMouseLeave={e=>e.currentTarget.querySelector(".dropdown").style.display="none"}>
              <button className="nav-btn" style={{padding:"7px 14px",borderRadius:8,border:"none",background:["assignment","plagiarism"].includes(activeTool)?"rgba(139,92,246,0.12)":"transparent",color:["assignment","plagiarism"].includes(activeTool)?"#c4b5fd":D.muted,fontSize:13,fontWeight:500,cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap"}}>🎓 Education ▾</button>
              <div className="dropdown" style={{display:"none",position:"absolute",top:"100%",left:0,background:D.header,border:"1px solid "+D.border,borderRadius:12,padding:8,minWidth:200,zIndex:999,boxShadow:"0 8px 30px rgba(0,0,0,0.3)"}}>
                {aiTools.filter(t=>t.category==="Education").map(t=>(
                  <button key={t.id} onClick={()=>goToTool(t.id)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",borderRadius:8,border:"none",background:activeTool===t.id?"rgba(139,92,246,0.1)":"transparent",color:activeTool===t.id?"#c4b5fd":D.text,fontSize:13,cursor:"pointer",textAlign:"left",whiteSpace:"nowrap"}}>{t.icon} {t.label}</button>
                ))}
              </div>
            </div>
            <div style={{position:"relative"}} onMouseEnter={e=>e.currentTarget.querySelector(".dropdown").style.display="block"} onMouseLeave={e=>e.currentTarget.querySelector(".dropdown").style.display="none"}>
              <button className="nav-btn" style={{padding:"7px 14px",borderRadius:8,border:"none",background:["coverletter","seo"].includes(activeTool)?"rgba(139,92,246,0.12)":"transparent",color:["coverletter","seo"].includes(activeTool)?"#c4b5fd":D.muted,fontSize:13,fontWeight:500,cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap"}}>💼 Career & SEO ▾</button>
              <div className="dropdown" style={{display:"none",position:"absolute",top:"100%",left:0,background:D.header,border:"1px solid "+D.border,borderRadius:12,padding:8,minWidth:200,zIndex:999,boxShadow:"0 8px 30px rgba(0,0,0,0.3)"}}>
                {aiTools.filter(t=>["Career","Marketing"].includes(t.category)).map(t=>(
                  <button key={t.id} onClick={()=>goToTool(t.id)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",borderRadius:8,border:"none",background:activeTool===t.id?"rgba(139,92,246,0.1)":"transparent",color:activeTool===t.id?"#c4b5fd":D.text,fontSize:13,cursor:"pointer",textAlign:"left",whiteSpace:"nowrap"}}>{t.icon} {t.label}</button>
                ))}
              </div>
            </div>
            <a href="/about.html" style={{padding:"7px 14px",borderRadius:8,color:D.muted,fontSize:13,fontWeight:500,textDecoration:"none",whiteSpace:"nowrap"}}>About</a>
            <a href="/contact.html" style={{padding:"7px 14px",borderRadius:8,color:D.muted,fontSize:13,fontWeight:500,textDecoration:"none",whiteSpace:"nowrap"}}>Contact</a>
          </nav>

          {/* Right controls */}
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <button onClick={toggleTheme} style={{width:38,height:38,borderRadius:10,border:"1px solid "+D.border,background:D.card,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>
              <span className={swinging?"swing":""} style={{display:"inline-block"}}>{darkMode?"🌙":"☀️"}</span>
            </button>
            <button className="mobile-btn" onClick={()=>setMobileMenuOpen(!mobileMenuOpen)} style={{display:"none",width:38,height:38,borderRadius:10,border:"1px solid "+D.border,background:D.card,cursor:"pointer",alignItems:"center",justifyContent:"center",fontSize:18,color:D.text}}>
              {mobileMenuOpen?"✕":"☰"}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="mobile-drop" style={{background:D.header,borderTop:"1px solid "+D.border,padding:"10px 14px 18px",maxHeight:"75vh",overflowY:"auto"}}>
            <button className="mobile-item" onClick={goHome} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",borderRadius:10,border:"none",background:activeTool==="home"?"rgba(139,92,246,0.1)":"transparent",color:activeTool==="home"?"#c4b5fd":D.text,fontSize:14,fontWeight:700,cursor:"pointer",textAlign:"left",marginBottom:4}}>
              🏠 Home
            </button>
            <div style={{fontSize:10,color:D.dim,textTransform:"uppercase",letterSpacing:1.5,padding:"8px 12px 6px",fontFamily:"monospace",fontWeight:700}}>All 13 Tools</div>
            {aiTools.map(t => (
              <button key={t.id} className="mobile-item" onClick={()=>goToTool(t.id)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",borderRadius:10,border:"none",background:activeTool===t.id?"rgba(139,92,246,0.1)":"transparent",color:activeTool===t.id?"#c4b5fd":D.text,fontSize:13,cursor:"pointer",textAlign:"left",marginBottom:2}}>
                <span style={{fontSize:18}}>{t.icon}</span>
                <div><div style={{fontWeight:600}}>{t.label}</div><div style={{fontSize:11,color:D.muted}}>{t.desc}</div></div>
              </button>
            ))}
            <div style={{borderTop:"1px solid "+D.border,marginTop:10,paddingTop:10,display:"flex",gap:16}}>
              <a href="/about.html" style={{fontSize:12,color:D.muted,textDecoration:"none"}}>About</a>
              <a href="/contact.html" style={{fontSize:12,color:D.muted,textDecoration:"none"}}>Contact</a>
              <a href="/privacy.html" style={{fontSize:12,color:D.muted,textDecoration:"none"}}>Privacy</a>
            </div>
          </div>
        )}
      </header>

      <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}><div style={{position:"absolute",top:"-20%",left:"-10%",width:"60vw",height:"60vw",borderRadius:"50%",background:darkMode?"radial-gradient(circle,rgba(139,92,246,0.14) 0%,transparent 70%)":"radial-gradient(circle,rgba(139,92,246,0.07) 0%,transparent 70%)",filter:"blur(60px)",animation:"blob1 8s ease-in-out infinite"}}/><div style={{position:"absolute",top:"40%",right:"-15%",width:"50vw",height:"50vw",borderRadius:"50%",background:darkMode?"radial-gradient(circle,rgba(249,115,22,0.11) 0%,transparent 70%)":"radial-gradient(circle,rgba(249,115,22,0.05) 0%,transparent 70%)",filter:"blur(60px)",animation:"blob2 10s ease-in-out infinite"}}/><div style={{position:"absolute",bottom:"-10%",left:"20%",width:"40vw",height:"40vw",borderRadius:"50%",background:darkMode?"radial-gradient(circle,rgba(6,214,160,0.09) 0%,transparent 70%)":"radial-gradient(circle,rgba(6,214,160,0.04) 0%,transparent 70%)",filter:"blur(60px)",animation:"blob1 12s ease-in-out infinite reverse"}}/><div style={{position:"absolute",top:"65%",left:"55%",width:"30vw",height:"30vw",borderRadius:"50%",background:darkMode?"radial-gradient(circle,rgba(255,0,110,0.09) 0%,transparent 70%)":"radial-gradient(circle,rgba(255,0,110,0.04) 0%,transparent 70%)",filter:"blur(60px)",animation:"blob2 9s ease-in-out infinite reverse"}}/></div>
      {/* MAIN */}
      <main className="main-pad" style={{maxWidth:900,margin:"0 auto",padding:"80px 20px 60px",position:"relative",zIndex:1}}>

        {/* Backend banners */}
        {backendStatus==="waking" && (
          <div style={{padding:"10px 16px",background:"rgba(234,179,8,0.08)",border:"1px solid rgba(234,179,8,0.2)",borderRadius:10,marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#eab308",animation:"pulse 1s infinite",flexShrink:0}}/>
            <p style={{color:"#eab308",fontSize:12,margin:0,fontWeight:600}}>AI server is waking up{loadingDots} — may take up to 30 seconds on first use.</p>
          </div>
        )}
        {backendStatus==="ready" && activeTool!=="home" && (
          <div style={{padding:"8px 16px",background:"rgba(6,214,160,0.06)",border:"1px solid rgba(6,214,160,0.15)",borderRadius:10,marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#06d6a0",flexShrink:0}}/>
            <p style={{color:"#06d6a0",fontSize:12,margin:0,fontWeight:600}}>AI server ready — results will be fast!</p>
          </div>
        )}

        {/* BACK BUTTON */}
        {activeTool!=="home" && (
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20,animation:"fadeIn 0.3s ease"}}>
            <button onClick={goHome} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:10,border:"1px solid "+D.border,background:D.card,color:D.muted,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>
              ← Back to Home
            </button>
            <span style={{color:D.dim,fontSize:13}}>›</span>
            <span style={{fontSize:16}}>{currentTool&&currentTool.icon}</span>
            <span style={{color:D.text,fontSize:13,fontWeight:700}}>{currentTool&&currentTool.label}</span>
          </div>
        )}

        {/* HOME */}
        {activeTool==="home" && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{textAlign:"center",padding:"40px 0 50px"}}>
              <div style={{display:"inline-flex",background:"rgba(6,214,160,0.1)",border:"1px solid rgba(6,214,160,0.2)",borderRadius:100,padding:"5px 16px",fontSize:11,fontWeight:700,color:"#06d6a0",fontFamily:"monospace",marginBottom:18,letterSpacing:1}}>
                LIVE • REAL AI • FREE • NO SIGNUP NEEDED
              </div>
              <h1 style={{fontSize:"clamp(32px,6vw,54px)",fontWeight:900,background:"linear-gradient(135deg,#fff 0%,#c4b5fd 50%,#f97316 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1.1,marginBottom:16}}>
                Your AI Tools Planet
              </h1>
              <p style={{color:D.muted,fontSize:15,maxWidth:520,margin:"0 auto 32px",lineHeight:1.7}}>
                13 powerful AI tools — detect AI content, check plagiarism, optimize for SEO, write cover letters, fix grammar and more. Instant results, completely free.
              </p>
              <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
                {["🔍 AI Detector","📝 Plagiarism","🎯 SEO","📄 Cover Letter","🎓 Assignment","✅ Grammar"].map(tag=>(
                  <span key={tag} style={{padding:"5px 12px",background:D.card,border:"1px solid "+D.border,borderRadius:99,fontSize:11,color:D.muted}}>{tag}</span>
                ))}
              </div>

              <div style={{maxWidth:520,margin:"24px auto 0",position:"relative"}}><div style={{display:"flex",alignItems:"center",gap:10,padding:"13px 18px",background:darkMode?"rgba(255,255,255,0.05)":"#fff",border:"1.5px solid "+(searchFocused?"#8b5cf6":D.border),borderRadius:16,boxShadow:searchFocused?"0 0 0 3px rgba(139,92,246,0.15),0 4px 24px rgba(0,0,0,0.2)":"0 4px 20px rgba(0,0,0,0.12)",transition:"all 0.2s"}}><span style={{fontSize:18,opacity:0.7}}>🔍</span><input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onFocus={()=>setSearchFocused(true)} onBlur={()=>setTimeout(()=>setSearchFocused(false),150)} placeholder="Search 13 AI tools..." style={{flex:1,background:"none",border:"none",outline:"none",color:D.text,fontSize:15,fontFamily:"Outfit,sans-serif"}}/>{searchQuery && <button onClick={()=>setSearchQuery("")} style={{background:"none",border:"none",color:D.muted,cursor:"pointer",fontSize:16}}>x</button>}</div>{searchQuery && searchFocused && (<div style={{position:"absolute",top:"calc(100% + 8px)",left:0,right:0,background:darkMode?"#0d0d1f":"#fff",border:"1px solid "+D.border,borderRadius:14,zIndex:999,boxShadow:"0 12px 40px rgba(0,0,0,0.35)",overflow:"hidden",padding:8}}>{aiTools.filter(t=>t.label.toLowerCase().includes(searchQuery.toLowerCase())||t.desc.toLowerCase().includes(searchQuery.toLowerCase())).length===0?<div style={{padding:"14px 16px",color:D.muted,fontSize:13,textAlign:"center"}}>No tools found</div>:aiTools.filter(t=>t.label.toLowerCase().includes(searchQuery.toLowerCase())||t.desc.toLowerCase().includes(searchQuery.toLowerCase())).map(t=>(<button key={t.id} onMouseDown={()=>{goToTool(t.id);setSearchQuery("");}} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"11px 14px",borderRadius:10,border:"none",background:"transparent",cursor:"pointer",textAlign:"left"}} onMouseEnter={e=>e.currentTarget.style.background=darkMode?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><div style={{width:36,height:36,borderRadius:10,background:t.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{t.icon}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:D.text}}>{t.label}</div><div style={{fontSize:11,color:D.muted}}>{t.desc}</div></div><span style={{fontSize:11,color:D.muted}}>arrow</span></button>))}</div>)}</div>
            </div>
            {categories.map(cat=>(
              <div key={cat} style={{marginBottom:36}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                  <h2 style={{fontSize:11,fontWeight:700,color:D.dim,textTransform:"uppercase",letterSpacing:2,fontFamily:"monospace",whiteSpace:"nowrap"}}>{cat}</h2>
                  <div style={{flex:1,height:1,background:D.border}}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:12}}>
                  {aiTools.filter(t=>t.category===cat).map(t=>(
                    <button key={t.id} className="tool-card" onClick={()=>goToTool(t.id)} style={{padding:"18px 16px",background:D.card,border:"1px solid "+D.border,borderRadius:16,cursor:"pointer",textAlign:"left",boxShadow:darkMode?"none":"0 2px 8px rgba(0,0,0,0.05)"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                        <span style={{fontSize:26}}>{t.icon}</span>
                        <div style={{width:7,height:7,borderRadius:"50%",background:"#06d6a0"}}/>
                      </div>
                      <div style={{color:D.text,fontSize:13,fontWeight:700,marginBottom:5}}>{t.label}</div>
                      <div style={{color:D.muted,fontSize:11,lineHeight:1.5,marginBottom:10}}>{t.desc}</div>
                      <div style={{fontSize:11,color:t.color,fontWeight:600}}>Try free →</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SPECIAL TOOLS */}
        {activeTool==="pdfeditor" && <div style={{animation:"fadeIn 0.3s ease"}}><PDFEditor darkMode={darkMode}/></div>}
        {activeTool==="assignment" && <div style={{animation:"fadeIn 0.3s ease"}}><AssignmentChecker darkMode={darkMode}/></div>}
        {activeTool==="aidetector" && <div style={{animation:"fadeIn 0.3s ease"}}><AIDetector darkMode={darkMode}/></div>}
        {activeTool==="plagiarism" && <div style={{animation:"fadeIn 0.3s ease"}}><PlagiarismChecker darkMode={darkMode}/></div>}
        {activeTool==="coverletter" && <div style={{animation:"fadeIn 0.3s ease"}}><CoverLetterWriter darkMode={darkMode}/></div>}
        {activeTool==="seo" && <div style={{animation:"fadeIn 0.3s ease"}}><SEOOptimizer darkMode={darkMode}/></div>}
        {activeTool==="translate" && <div style={{animation:"fadeIn 0.3s ease"}}><AITranslator darkMode={darkMode}/></div>}

        {/* GENERIC TOOLS */}
        {currentTool && !specialTools.includes(activeTool) && activeTool !== "translate" && (
          <div style={{animation:"fadeIn 0.3s ease"}}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24,padding:"20px 22px",background:D.card,border:"1px solid "+D.border,borderRadius:16}}>
              <div style={{width:54,height:54,borderRadius:14,background:currentTool.color+"18",border:"1px solid "+currentTool.color+"30",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{currentTool.icon}</div>
              <div style={{flex:1}}>
                <h2 style={{fontSize:22,fontWeight:800,margin:"0 0 4px",color:D.text}}>{currentTool.label}</h2>
                <p style={{color:D.muted,fontSize:13,margin:0}}>{currentTool.desc}</p>
              </div>
              <div style={{padding:"4px 12px",background:"rgba(6,214,160,0.1)",border:"1px solid rgba(6,214,160,0.2)",borderRadius:99,fontSize:10,color:"#06d6a0",fontWeight:700,fontFamily:"monospace",flexShrink:0}}>FREE</div>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
              <label style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:600,color:"#c4b5fd"}}>
                {imageLoading?"⏳ Reading...":"📸 Upload Image"}
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{display:"none"}}/>
              </label>
              <label style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"rgba(124,58,237,0.1)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:600,color:"#a78bfa"}}>
                {fileLoading?"⏳ Reading...":"📄 Upload PDF/Word"}
                <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileUpload} style={{display:"none"}}/>
              </label>
              <span style={{fontSize:11,color:D.muted,display:"flex",alignItems:"center"}}>or type below</span>
            </div>
            <textarea value={inputText} onChange={e=>setInputText(e.target.value)} placeholder={activeTool==="prompt"?"Enter your topic or idea...":"Type or paste your text here..."} style={{width:"100%",minHeight:160,padding:16,background:D.input,border:"1.5px solid "+D.inputBorder,borderRadius:14,color:D.text,fontSize:14,fontFamily:"Outfit,sans-serif",resize:"vertical",outline:"none",lineHeight:1.6}}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:6,padding:"0 4px",marginBottom:14}}>
              <span style={{fontSize:11,color:D.muted}}>{inputText.trim()?inputText.trim().split(/\s+/).length+" words • "+inputText.length+" characters":"0 words • 0 characters"}</span>
              <button onClick={()=>setInputText("")} style={{fontSize:11,color:D.muted,background:"none",border:"none",cursor:"pointer",padding:0}}>🗑 Clear</button>
            </div>
            <button onClick={runTool} disabled={!inputText.trim()||loading} style={{width:"100%",padding:16,border:"none",borderRadius:12,background:!inputText.trim()?(darkMode?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.06)"):"linear-gradient(135deg,"+currentTool.color+",#f97316)",color:!inputText.trim()?D.dim:"#fff",fontSize:15,fontWeight:700,cursor:!inputText.trim()||loading?"not-allowed":"pointer"}}>
              {loading?"⏳ Processing...":"🧠 Run "+currentTool.label}
            </button>
            {outputText && (
              <div style={{marginTop:20,background:D.card,border:"1px solid rgba(139,92,246,0.2)",borderRadius:16,padding:22,animation:"fadeIn 0.3s ease"}}>
                <div style={{fontSize:11,fontWeight:700,color:D.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:14,fontFamily:"monospace"}}>✨ AI Result</div>
                <div style={{background:darkMode?"rgba(0,0,0,0.3)":"rgba(0,0,0,0.03)",borderRadius:12,padding:18,fontSize:14,lineHeight:1.8,color:D.text,whiteSpace:"pre-wrap"}}>{outputText}</div>
                <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
                  <button onClick={copyResult} style={{padding:"10px 18px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,background:copied?"rgba(6,214,160,0.12)":"rgba(139,92,246,0.12)",border:copied?"1px solid rgba(6,214,160,0.25)":"1px solid rgba(139,92,246,0.25)",color:copied?"#06d6a0":"#a78bfa"}}>
                    {copied?"✓ Copied!":"📋 Copy Result"}
                  </button>
                  <button onClick={shareResult} style={{padding:"10px 18px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,background:"rgba(6,214,160,0.08)",border:"1px solid rgba(6,214,160,0.2)",color:"#06d6a0"}}>
                    🔗 Share Tool
                  </button>
                  <button onClick={()=>{setInputText("");setOutputText("");}} style={{padding:"10px 18px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,background:"transparent",border:"1px solid "+D.border,color:D.muted}}>
                    🔄 Start Over
                  </button>
                </div>
              </div>
            )}
            <div style={{marginTop:32,paddingTop:24,borderTop:"1px solid "+D.border}}>
              <div style={{fontSize:11,fontWeight:700,color:D.dim,textTransform:"uppercase",letterSpacing:1.5,marginBottom:12,fontFamily:"monospace"}}>Other Tools</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {aiTools.filter(t=>t.id!==activeTool).slice(0,6).map(t=>(
                  <button key={t.id} onClick={()=>goToTool(t.id)} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:D.card,border:"1px solid "+D.border,borderRadius:10,cursor:"pointer",fontSize:12,color:D.muted,fontWeight:500,transition:"all 0.15s"}}>
                    <span>{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer style={{textAlign:"center",marginTop:60,paddingTop:24,borderTop:"1px solid "+D.border}}>
          <div style={{marginBottom:10,display:"flex",justifyContent:"center",gap:20,flexWrap:"wrap"}}>
            <a href="/about.html" style={{fontSize:12,color:D.muted,textDecoration:"none"}}>About</a>
            <a href="/contact.html" style={{fontSize:12,color:D.muted,textDecoration:"none"}}>Contact</a>
            <a href="/privacy.html" style={{fontSize:12,color:D.muted,textDecoration:"none"}}>Privacy Policy</a>
            <a href="/sitemap.xml" style={{fontSize:12,color:D.muted,textDecoration:"none"}}>Sitemap</a>
          </div>
          <p style={{fontSize:11,color:D.dim,fontFamily:"monospace"}}>2025 ToolPlanetAI • 13 Free AI Tools • No signup required</p>
        </footer>
      </main>
    </div>
  );
}
