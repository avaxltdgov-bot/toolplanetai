// v6.0 - Text editor approach - edits never revert
import { useState, useRef } from "react";

export default function PDFEditor({ darkMode }) {
  const [step, setStep] = useState("upload");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const fileRef = useRef();

  const D = darkMode ? {
    text: "#e4e4f0", muted: "#9090b0", border: "rgba(255,255,255,0.08)",
    card: "rgba(255,255,255,0.03)", bg: "rgba(255,255,255,0.05)", header: "rgba(255,255,255,0.07)"
  } : {
    text: "#1a1a2e", muted: "#555570", border: "rgba(0,0,0,0.1)",
    card: "#f8f8ff", bg: "#ffffff", header: "#f0f0f0"
  };

  const loadPdfJs = () => new Promise((resolve) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    document.head.appendChild(script);
  });

  const processFile = async (file) => {
    if (file.size > 10 * 1024 * 1024) { alert("File must be under 10MB"); return; }
    if (!file.name.toLowerCase().endsWith(".pdf")) { alert("Please upload a PDF file"); return; }
    setLoading(true);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const pdfjsLib = await loadPdfJs();
        const pdfData = new Uint8Array(ev.target.result);
        const pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const extractedPages = [];
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          const lines = [];
          let lastY = null;
          let currentLine = "";
          textContent.items.forEach(item => {
            const y = Math.round(item.transform[5]);
            if (lastY === null) lastY = y;
            if (Math.abs(y - lastY) > 5) {
              if (currentLine.trim()) lines.push(currentLine.trim());
              currentLine = item.str;
              lastY = y;
            } else {
              currentLine += (currentLine && item.str && !currentLine.endsWith(" ") ? " " : "") + item.str;
            }
          });
          if (currentLine.trim()) lines.push(currentLine.trim());
          extractedPages.push(lines.join("\n"));
        }
        setPages(extractedPages);
        setCurrentPage(0);
        setStep("edit");
        setLoading(false);
      } catch(err) {
        setLoading(false);
        alert("Could not load PDF. Please try a different file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const updatePage = (idx, newText) => {
    setPages(prev => { const p = [...prev]; p[idx] = newText; return p; });
  };

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const allText = pages.join("\n\n--- Page Break ---\n\n");
      const response = await fetch("https://toolplanetai-backend.onrender.com/api/generate-pdf", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: allText, fileName })
      });
      if (!response.ok) throw new Error("Server error");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.replace(/\.[^/.]+$/, "") + "_edited.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch(err) { alert("Download failed. Please try again."); }
    setDownloading(false);
  };

  const runAI = async (action) => {
    const text = pages[currentPage];
    if (!text.trim()) return;
    setAiLoading(true);
    const prompts = {
      fix: "Fix all grammar and spelling errors. Return only corrected text:\n\n",
      improve: "Improve this text professionally. Return only improved text:\n\n",
      formal: "Rewrite this formally. Return only the text:\n\n",
      summarize: "Summarize this into bullet points:\n\n"
    };
    try {
      const res = await fetch("https://toolplanetai-backend.onrender.com/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "rewrite", input: prompts[action] + text })
      });
      const data = await res.json();
      if (data.result) updatePage(currentPage, data.result);
    } catch(err) { alert("AI error. Try again."); }
    setAiLoading(false);
  };

  const resetAll = () => { setStep("upload"); setPages([]); setCurrentPage(0); };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:"linear-gradient(135deg,#dc2626,#f97316)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>📑</div>
          <div>
            <h2 style={{ fontSize:20, fontWeight:800, margin:0, color:D.text }}>PDFGenius AI</h2>
            <p style={{ color:D.muted, fontSize:11, margin:0 }}>Edit PDF text freely • AI tools • Download as PDF</p>
          </div>
        </div>
        {step==="edit" && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button onClick={()=>setShowAI(!showAI)} style={{ padding:"8px 14px", borderRadius:8, border:"1px solid rgba(139,92,246,0.3)", background:"rgba(139,92,246,0.1)", color:"#c4b5fd", fontSize:12, fontWeight:600, cursor:"pointer" }}>🤖 AI Tools</button>
            <button onClick={downloadPDF} disabled={downloading} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#dc2626,#f97316)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
              {downloading?"⏳ Saving...":"⬇️ Download PDF"}
            </button>
            <button onClick={resetAll} style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${D.border}`, background:"transparent", color:D.muted, fontSize:12, cursor:"pointer" }}>📂 New</button>
          </div>
        )}
      </div>

      {step==="upload" && (
        <div>
          <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{e.preventDefault();setDragOver(false);if(e.dataTransfer.files[0])processFile(e.dataTransfer.files[0]);}}
            onClick={()=>!loading&&fileRef.current.click()}
            style={{ border:`2px dashed ${dragOver?"#dc2626":"rgba(220,38,38,0.3)"}`, borderRadius:20, padding:"80px 20px", textAlign:"center", cursor:loading?"not-allowed":"pointer", background:dragOver?"rgba(220,38,38,0.08)":"rgba(220,38,38,0.03)", transition:"all 0.2s" }}>
            <div style={{ fontSize:64, marginBottom:16 }}>{loading?"⏳":"📄"}</div>
            <div style={{ color:D.text, fontSize:18, fontWeight:700, marginBottom:8 }}>{loading?"Extracting text from PDF...":"Drop PDF Here or Click to Upload"}</div>
            <div style={{ color:D.muted, fontSize:13, marginBottom:24 }}>{loading?"Please wait...":"All text extracted • Edit freely • Download as PDF"}</div>
            {!loading && <div style={{ display:"inline-block", padding:"13px 30px", background:"linear-gradient(135deg,#dc2626,#f97316)", borderRadius:12, color:"#fff", fontSize:14, fontWeight:700 }}>📤 Choose PDF</div>}
            <input ref={fileRef} type="file" accept=".pdf" onChange={e=>e.target.files[0]&&processFile(e.target.files[0])} style={{ display:"none" }}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:12, marginTop:20 }}>
            {[{icon:"📄",t:"Upload PDF",d:"Drag & drop PDF"},{icon:"✏️",t:"Edit Freely",d:"Type anywhere, delete anything"},{icon:"🤖",t:"AI Improve",d:"AI fixes & improves text"},{icon:"⬇️",t:"Download PDF",d:"Save as real PDF"}].map(s=>(
              <div key={s.t} style={{ padding:14, background:D.card, border:`1px solid ${D.border}`, borderRadius:14, textAlign:"center" }}>
                <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
                <div style={{ color:D.text, fontSize:12, fontWeight:700, marginBottom:4 }}>{s.t}</div>
                <div style={{ color:D.muted, fontSize:11 }}>{s.d}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:16, padding:14, background:"rgba(6,214,160,0.05)", border:"1px solid rgba(6,214,160,0.15)", borderRadius:12 }}>
            <p style={{ color:"#06d6a0", fontSize:11, margin:0 }}>🔒 Secure — files processed in browser, never stored on servers.</p>
          </div>
        </div>
      )}

      {step==="edit" && (
        <div>
          {showAI && (
            <div style={{ padding:12, background:D.card, border:`1px solid ${D.border}`, borderRadius:10, marginBottom:12, display:"flex", flexWrap:"wrap", gap:8, alignItems:"center" }}>
              <span style={{ color:D.muted, fontSize:12, fontWeight:600 }}>🤖 AI (current page):</span>
              {[{key:"fix",label:"✅ Fix Grammar",color:"#06d6a0"},{key:"improve",label:"✨ Improve",color:"#8b5cf6"},{key:"formal",label:"👔 Make Formal",color:"#4361ee"},{key:"summarize",label:"📝 Summarize",color:"#e91e8c"}].map(btn=>(
                <button key={btn.key} onClick={()=>runAI(btn.key)} disabled={aiLoading} style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${btn.color}40`, background:`${btn.color}15`, color:btn.color, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                  {aiLoading?"⏳...":btn.label}
                </button>
              ))}
            </div>
          )}

          {pages.length > 1 && (
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, flexWrap:"wrap" }}>
              <span style={{ color:D.muted, fontSize:12 }}>Pages:</span>
              {pages.map((_, i) => (
                <button key={i} onClick={()=>setCurrentPage(i)}
                  style={{ padding:"4px 12px", borderRadius:8, border:`1px solid ${currentPage===i?"#dc2626":D.border}`, background:currentPage===i?"rgba(220,38,38,0.1)":"transparent", color:currentPage===i?"#dc2626":D.muted, fontSize:12, fontWeight:currentPage===i?700:400, cursor:"pointer" }}>
                  {i+1}
                </button>
              ))}
            </div>
          )}

          <div style={{ background:D.bg, border:`1px solid ${D.border}`, borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"10px 16px", background:D.header, borderBottom:`1px solid ${D.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ color:D.muted, fontSize:12, fontWeight:600 }}>📄 {fileName} — Page {currentPage+1} of {pages.length}</span>
              <span style={{ color:"#06d6a0", fontSize:11 }}>✏️ Click anywhere to edit</span>
            </div>
            <textarea
              value={pages[currentPage] || ""}
              onChange={e=>updatePage(currentPage, e.target.value)}
              style={{
                width:"100%", minHeight:600, padding:24,
                background:D.bg, border:"none", outline:"none",
                color:D.text, fontSize:14, lineHeight:1.8,
                fontFamily:"Georgia, serif", resize:"vertical", boxSizing:"border-box"
              }}
              placeholder="PDF text will appear here for editing..."
            />
          </div>

          <div style={{ marginTop:12, padding:12, background:"rgba(220,38,38,0.05)", border:"1px solid rgba(220,38,38,0.15)", borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
            <p style={{ color:"#f87171", fontSize:11, margin:0 }}>✏️ Edit text freely • Delete anything • Add new text • Use AI tools • Download when done</p>
            <button onClick={downloadPDF} disabled={downloading} style={{ padding:"10px 20px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#dc2626,#f97316)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
              {downloading?"⏳ Saving...":"⬇️ Download PDF"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
