import PDFEditor from "./PDFEditor";
import AssignmentChecker from "./AssignmentChecker";
import AIDetector from "./AIDetector";
import PlagiarismChecker from "./PlagiarismChecker";
import CoverLetterWriter from "./CoverLetterWriter";
import SEOOptimizer from "./SEOOptimizer";
import { useState } from "react";
const aiTools = [
  { id: "summarize", icon: "📋", label: "AI Summarizer", desc: "Condense any text into key points", color: "#8b5cf6" },
  { id: "rewrite", icon: "✨", label: "AI Rewriter", desc: "Rewrite text in a better way", color: "#f97316" },
  { id: "grammar", icon: "✅", label: "Grammar Fixer", desc: "Fix all grammar and spelling errors", color: "#06d6a0" },
  { id: "expand", icon: "📐", label: "Text Expander", desc: "Expand short text into detailed content", color: "#e91e8c" },
  { id: "tone", icon: "🎭", label: "Tone Changer", desc: "Rewrite in any tone you want", color: "#4361ee" },
  { id: "translate", icon: "🌍", label: "AI Translator", desc: "Translate to any language", color: "#ff006e" },
  { id: "prompt", icon: "⚡", label: "Prompt Generator", desc: "Generate powerful AI prompts", color: "#eab308" },
  { id: "email", icon: "📧", label: "Email Writer", desc: "Write professional emails", color: "#14b8a6" },
  { id: "assignment", icon: "🎓", label: "Assignment Checker", desc: "Grade & get detailed feedback on your work", color: "#7c3aed" },
  { id: "aidetector", icon: "🔍", label: "AI Detector", desc: "Detect AI-written text sentence by sentence", color: "#dc2626" },
  { id: "plagiarism", icon: "📝", label: "Plagiarism Checker", desc: "Check originality and highlight risky sentences", color: "#f97316" },
  { id: "coverletter", icon: "📄", label: "Cover Letter Writer", desc: "AI cover letters that get you interviews", color: "#14b8a6" },
  { id: "seo", icon: "🎯", label: "SEO Optimizer", desc: "Optimize content to rank higher on Google", color: "#eab308" },
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(",")[1];
      try {
        const response = await fetch("https://toolplanetai-backend.onrender.com/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mediaType: file.type })
        });
        const data = await response.json();
        if (data.result) {
          setInputText(data.result);
        }
      } catch(err) {
        setInputText("❌ Could not read image. Please try again.");
      }
      setImageLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const currentTool = aiTools.find(t => t.id === activeTool);

  const toggleTheme = () => {
    setSwinging(true);
    setTimeout(() => setSwinging(false), 600);
    setDarkMode(!darkMode);
  };

  const copyResult = () => {
    try { navigator.clipboard.writeText(outputText); }
    catch(e) { const el = document.createElement("textarea"); el.value = outputText; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [fileLoading, setFileLoading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileLoading(true);
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(",")[1];
      try {
        const response = await fetch("https://toolplanetai-backend.onrender.com/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: base64, mediaType: file.type, fileName: file.name })
        });
        const data = await response.json();
        if (data.result) {
          setInputText(data.result);
        } else {
          setInputText("❌ Could not read file. Please try again.");
        }
      } catch(err) {
        setInputText("❌ Could not connect to server.");
      }
      setFileLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const runTool = () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setOutputText("");
    fetch("https://toolplanetai-backend.onrender.com/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool: activeTool, input: inputText.trim() })
    })
    .then(r => r.json())
    .then(data => { setOutputText(data.result || data.error); setLoading(false); })
    .catch(() => { setOutputText("❌ Could not connect to backend."); setLoading(false); });
  };

  const D = darkMode ? {
    bg: "#080810", sidebar: "rgba(8,8,18,0.97)", card: "rgba(255,255,255,0.025)",
    border: "rgba(255,255,255,0.06)", text: "#e4e4f0", muted: "#6b6b85",
    dim: "#333348", input: "rgba(255,255,255,0.025)", inputBorder: "rgba(255,255,255,0.08)"
  } : {
    bg: "#f0f2ff", sidebar: "#ffffff", card: "#ffffff",
    border: "rgba(0,0,0,0.08)", text: "#1a1a2e", muted: "#555570",
    dim: "#888899", input: "#ffffff", inputBorder: "rgba(0,0,0,0.15)"
  };

  const sidebarContent = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", marginBottom: 16 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#8b5cf6,#f97316)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff" }}>T</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: D.text }}>ToolPlanetAI</div>
          <div style={{ fontSize: 9, color: "#06d6a0", fontFamily: "monospace", fontWeight: 600 }}>FREE AI TOOLS</div>
        </div>
      </div>

      {/* Lamp */}
      <div onClick={toggleTheme} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", padding: "8px 0 12px", borderBottom: `1px solid ${D.border}`, marginBottom: 12 }}>
        <style>{`@keyframes swing{0%{transform:rotate(0deg)}25%{transform:rotate(15deg)}50%{transform:rotate(-15deg)}75%{transform:rotate(8deg)}100%{transform:rotate(0deg)}}.swing{animation:swing 0.6s ease;transform-origin:top center;}`}</style>
        <div className={swinging ? "swing" : ""} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 2, height: 24, background: darkMode ? "#444" : "#999", borderRadius: 2 }}></div>
          <div style={{ fontSize: 28 }}>💡</div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, marginTop: 4, color: darkMode ? "#6b6b85" : "#f5c518", textShadow: darkMode ? "none" : "0 0 10px #f5c518", fontFamily: "monospace" }}>
          {darkMode ? "🌙 NIGHT MODE" : "☀️ DAY MODE"}
        </div>
      </div>

      <div style={{ fontSize: 9, fontWeight: 700, color: D.dim, textTransform: "uppercase", letterSpacing: "1.5px", padding: "4px 10px 6px", fontFamily: "monospace" }}>Navigation</div>
      <button onClick={() => { setActiveTool("home"); setMobileMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px", background: activeTool === "home" ? "rgba(139,92,246,0.12)" : "transparent", border: activeTool === "home" ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent", borderRadius: 9, cursor: "pointer", color: activeTool === "home" ? "#c4b5fd" : D.muted, fontSize: 12, fontWeight: activeTool === "home" ? 600 : 400, textAlign: "left", marginBottom: 4 }}>
        <span style={{ fontSize: 15 }}>🏠</span><span>Home</span>
      </button>

      <div style={{ fontSize: 9, fontWeight: 700, color: D.dim, textTransform: "uppercase", letterSpacing: "1.5px", padding: "8px 10px 6px", fontFamily: "monospace" }}>AI Tools</div>
      {aiTools.map(t => (
        <button key={t.id} onClick={() => { setActiveTool(t.id); setOutputText(""); setInputText(""); setMobileMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px", background: activeTool === t.id ? "rgba(139,92,246,0.12)" : "transparent", border: activeTool === t.id ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent", borderRadius: 9, cursor: "pointer", color: activeTool === t.id ? "#c4b5fd" : D.muted, fontSize: 12, fontWeight: activeTool === t.id ? 600 : 400, textAlign: "left", marginBottom: 1 }}>
          <span style={{ fontSize: 15 }}>{t.icon}</span><span>{t.label}</span>
        </button>
      ))}

      <div style={{ marginTop: "auto", padding: "12px 10px 0", borderTop: `1px solid ${D.border}` }}>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
        <a href="/about.html" style={{ fontSize: 10, color: D.dim, textDecoration: "none" }}>About</a>
        <a href="/contact.html" style={{ fontSize: 10, color: D.dim, textDecoration: "none" }}>Contact</a>
        <a href="/privacy.html" style={{ fontSize: 10, color: D.dim, textDecoration: "none" }}>Privacy Policy</a>
      </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: D.bg, color: D.text, fontFamily: "'Outfit',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @media(max-width:768px){
          .desktop-sidebar{display:none!important;}
          .mobile-header{display:flex!important;}
          .main-content{margin-left:0!important;}
        }
        @media(min-width:769px){
          .mobile-header{display:none!important;}
          .mobile-overlay{display:none!important;}
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* Desktop Sidebar */}
      <div className="desktop-sidebar" style={{ width: 230, minHeight: "100vh", background: D.sidebar, borderRight: `1px solid ${D.border}`, padding: "18px 10px", position: "fixed", top: 0, bottom: 0, overflowY: "auto", zIndex: 100, boxShadow: darkMode ? "none" : "2px 0 10px rgba(0,0,0,0.08)" }}>
        {sidebarContent}
      </div>

      {/* Mobile Header */}
      <div className="mobile-header" style={{ display: "none", position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: D.sidebar, borderBottom: `1px solid ${D.border}`, padding: "12px 16px", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#8b5cf6,#f97316)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>T</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: D.text }}>ToolPlanetAI</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={toggleTheme} style={{ cursor: "pointer", fontSize: 20 }}>💡</div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#c4b5fd", fontSize: 18 }}>
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Overlay Menu */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" style={{ position: "fixed", top: 56, left: 0, right: 0, bottom: 0, background: D.sidebar, zIndex: 150, overflowY: "auto", padding: "16px 10px" }}>
          {sidebarContent}
        </div>
      )}

      {/* Main Content */}
      <div className="main-content" style={{ marginLeft: 230, flex: 1, position: "relative" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px 60px" }}>

          {/* Mobile top padding */}
          <div style={{ height: 0 }} className="mobile-pad" />

          {activeTool === "home" && (
            <div>
              <div style={{ textAlign: "center", padding: "36px 0 32px" }}>
                <div style={{ display: "inline-flex", background: "rgba(6,214,160,0.1)", border: "1px solid rgba(6,214,160,0.2)", borderRadius: 100, padding: "5px 14px", fontSize: 10, fontWeight: 700, color: "#06d6a0", fontFamily: "monospace", marginBottom: 14 }}>🔴 LIVE • REAL AI • FREE TO USE</div>
                <h1 style={{ fontSize: "clamp(28px,6vw,44px)", fontWeight: 800, background: "linear-gradient(135deg,#fff 20%,#8b5cf6,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.15, margin: "0 0 12px" }}>ToolPlanetAI</h1>
                <p style={{ color: D.muted, fontSize: 14, maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>13 free AI-powered tools that actually work. Real AI processing, real results. No signup needed.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
                {aiTools.map(t => (
                  <button key={t.id} onClick={() => { setActiveTool(t.id); setOutputText(""); setInputText(""); }} style={{ padding: "18px 14px", background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, cursor: "pointer", textAlign: "left", boxShadow: darkMode ? "none" : "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 24 }}>{t.icon}</span>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#06d6a0" }} />
                    </div>
                    <div style={{ color: D.text, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{t.label}</div>
                    <div style={{ color: D.muted, fontSize: 11, lineHeight: 1.5 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTool === "pdfeditor" && <PDFEditor darkMode={darkMode} />}
          {activeTool === "assignment" && <AssignmentChecker darkMode={darkMode} />}
          {activeTool === "aidetector" && <AIDetector darkMode={darkMode} />}
          {activeTool === "plagiarism" && <PlagiarismChecker darkMode={darkMode} />}
          {activeTool === "coverletter" && <CoverLetterWriter darkMode={darkMode} />}
          {activeTool === "seo" && <SEOOptimizer darkMode={darkMode} />}

          {currentTool && activeTool !== "pdfeditor" && activeTool !== "assignment" && activeTool !== "aidetector" && activeTool !== "plagiarism" && activeTool !== "coverletter" && activeTool !== "seo" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: 28 }}>{currentTool.icon}</span>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: D.text }}>{currentTool.label}</h2>
                  <p style={{ color: D.muted, fontSize: 12, margin: 0 }}>{currentTool.desc}</p>
                </div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: D.dim, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8, fontFamily: "monospace" }}>
                {activeTool === "prompt" ? "Enter topic or idea" : "Paste your text"}
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#c4b5fd" }}>
                  {imageLoading ? "⏳ Reading..." : "📸 Upload Image"}
                  <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} style={{ display: "none" }} />
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#a78bfa" }}>
                  {fileLoading ? "⏳ Reading..." : "📄 Upload PDF/Word"}
                  <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileUpload} style={{ display: "none" }} />
                </label>
                <div style={{ fontSize: 11, color: D.muted, display: "flex", alignItems: "center" }}>or type below</div>
              </div>
              <textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Type or paste your text here..." style={{ width: "100%", minHeight: 150, padding: 16, background: D.input, border: `1.5px solid ${D.inputBorder}`, borderRadius: 14, color: D.text, fontSize: 14, fontFamily: "'Outfit',sans-serif", resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6 }} />
              <button onClick={runTool} disabled={!inputText.trim() || loading} style={{ width: "100%", padding: 15, border: "none", borderRadius: 12, background: !inputText.trim() ? "rgba(255,255,255,0.04)" : `linear-gradient(135deg,${currentTool.color},#f97316)`, color: !inputText.trim() ? D.dim : "#fff", fontSize: 15, fontWeight: 700, cursor: !inputText.trim() || loading ? "not-allowed" : "pointer", marginTop: 16 }}>
                {loading ? "⏳ Processing..." : `🧠 Run ${currentTool.label}`}
              </button>
              {outputText && (
                <div style={{ marginTop: 20, background: D.card, border: `1px solid rgba(139,92,246,0.2)`, borderRadius: 16, padding: 22 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: D.muted, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 12, fontFamily: "monospace" }}>AI Result</div>
                  <div style={{ background: darkMode ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.04)", borderRadius: 12, padding: 18, fontSize: 13.5, lineHeight: 1.75, color: D.text, whiteSpace: "pre-wrap" }}>{outputText}</div>
                  <button onClick={copyResult} style={{ marginTop: 12, padding: "10px 18px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, background: copied ? "rgba(6,214,160,0.12)" : "rgba(139,92,246,0.12)", border: copied ? "1px solid rgba(6,214,160,0.25)" : "1px solid rgba(139,92,246,0.25)", color: copied ? "#06d6a0" : "#a78bfa" }}>
                    {copied ? "✓ Copied!" : "📋 Copy Result"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 48, paddingTop: 20, borderTop: `1px solid ${D.border}` }}>
            <p style={{ fontSize: 10, color: D.dim, fontFamily: "monospace" }}>ToolPlanetAI — 13 Free AI Tools • <a href="/about.html" style={{ color: "#8b5cf6", textDecoration: "none" }}>About</a> • <a href="/contact.html" style={{ color: "#8b5cf6", textDecoration: "none" }}>Contact</a> • <a href="/privacy.html" style={{ color: "#8b5cf6", textDecoration: "none" }}>Privacy Policy</a> • <a href="/sitemap.xml" style={{ color: "#8b5cf6", textDecoration: "none" }}>Sitemap</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
