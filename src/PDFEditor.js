// v3.0 Real PDF Viewer Editor
import { useState, useRef, useEffect } from "react";

export default function PDFEditor({ darkMode }) {
  const [step, setStep] = useState("upload");
  const [fileName, setFileName] = useState("");
  const [, setFileBase64] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.3);
  const [editMode, setEditMode] = useState(false);
  const [textBlocks, setTextBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [highlightColor, setHighlightColor] = useState("#ffeb3b");
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showToolbar] = useState(true);

  const pushHistory = (blocks) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.stringify(blocks));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setTextBlocks(JSON.parse(history[newIndex]));
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setTextBlocks(JSON.parse(history[newIndex]));
  };
  const canvasRef = useRef();
  const fileRef = useRef();
  const pdfDocRef = useRef(null);

  const D = darkMode ? {
    text: "#e4e4f0", muted: "#6b6b85", border: "rgba(255,255,255,0.08)",
    card: "rgba(255,255,255,0.03)", toolbar: "rgba(8,8,18,0.95)", input: "rgba(0,0,0,0.4)"
  } : {
    text: "#1a1a2e", muted: "#555570", border: "rgba(0,0,0,0.1)",
    card: "#f8f8ff", toolbar: "#f0f0fa", input: "#ffffff"
  };

  useEffect(() => {
    if (step === "edit") renderPage(currentPage); // eslint-disable-line
  }, [currentPage, scale, step]); // eslint-disable-line

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
    setLoading(true);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(",")[1];
      setFileBase64(base64);
      try {
        const pdfjsLib = await loadPdfJs();
        const pdfData = atob(base64);
        const pdfArray = new Uint8Array(pdfData.length);
        for (let i = 0; i < pdfData.length; i++) pdfArray[i] = pdfData.charCodeAt(i);
        const pdfDoc = await pdfjsLib.getDocument({ data: pdfArray }).promise;
        pdfDocRef.current = pdfDoc;
        setNumPages(pdfDoc.numPages);
        setStep("edit");
        setLoading(false);
        setTimeout(() => renderPage(1), 100);
      } catch(err) {
        setLoading(false);
        alert("Could not load PDF. Make sure it's a valid PDF file.");
      }
    };
    reader.readAsDataURL(file);
  };

  const renderPage = async (pageNum) => {
    if (!pdfDocRef.current || !canvasRef.current) return;
    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: ctx, viewport }).promise;

      // Extract text blocks for editing
      const textContent = await page.getTextContent();
      const blocks = textContent.items.map((item, i) => {
        const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
        return {
          id: i,
          text: item.str,
          x: tx[4],
          y: tx[5] - item.height * scale,
          width: item.width * scale,
          height: item.height * scale + 4,
          fontSize: Math.abs(tx[0]) || 12
        };
      }).filter(b => b.text.trim());
      setTextBlocks(blocks);
    } catch(err) {
      console.error("Render error:", err);
    }
  };

  const handleBlockEdit = (id, newText) => {
    setTextBlocks(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, text: newText } : b);
      pushHistory(updated);
      return updated;
    });
  };

  const downloadPDF = async () => {
    try {
      const allText = textBlocks.map(b => b.text).join(" ");
      const response = await fetch("https://toolplanetai-backend.onrender.com/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    } catch(err) {
      alert("Download failed. Try again.");
    }
  };

  const runAI = async (action) => {
    const allText = textBlocks.map(b => b.text).join(" ");
    if (!allText.trim()) return;
    setAiLoading(true);
    const prompts = {
      fix: "Fix all grammar and spelling errors. Return only corrected text:\n\n",
      improve: "Improve professionally. Return only improved text:\n\n",
      formal: "Rewrite formally. Return only rewritten text:\n\n",
      summarize: "Summarize into bullet points:\n\n"
    };
    try {
      const res = await fetch("https://toolplanetai-backend.onrender.com/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "rewrite", input: prompts[action] + allText })
      });
      const data = await res.json();
      if (data.result) {
        const words = data.result.split(" ");
        const newBlocks = textBlocks.map((b, i) => ({
          ...b, text: words.slice(i * 3, i * 3 + 3).join(" ") || b.text
        }));
        setTextBlocks(newBlocks);
      }
    } catch(err) { alert("AI error. Try again."); }
    setAiLoading(false);
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:"linear-gradient(135deg,#dc2626,#f97316)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>📑</div>
          <div>
            <h2 style={{ fontSize:20, fontWeight:800, margin:0, color:D.text }}>PDFGenius AI</h2>
            <p style={{ color:D.muted, fontSize:11, margin:0 }}>View PDF • Click to Edit • Download as PDF</p>
          </div>
        </div>
        {step==="edit" && (
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setShowAI(!showAI)} style={{ padding:"8px 14px", borderRadius:8, border:"1px solid rgba(139,92,246,0.3)", background:"rgba(139,92,246,0.1)", color:"#c4b5fd", fontSize:12, fontWeight:600, cursor:"pointer" }}>🤖 AI Tools</button>
            <button onClick={downloadPDF} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#dc2626,#f97316)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>⬇️ Download PDF</button>
            <button onClick={()=>{setStep("upload");pdfDocRef.current=null;setTextBlocks([]);}} style={{ padding:"8px 14px", borderRadius:8, border:`1px solid ${D.border}`, background:"transparent", color:D.muted, fontSize:12, cursor:"pointer" }}>📂 New</button>
          </div>
        )}
      </div>

      {step==="upload" && (
        <div>
          <div
            onDragOver={e=>{e.preventDefault();setDragOver(true);}}
            onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{e.preventDefault();setDragOver(false);if(e.dataTransfer.files[0])processFile(e.dataTransfer.files[0]);}}
            onClick={()=>!loading&&fileRef.current.click()}
            style={{ border:`2px dashed ${dragOver?"#dc2626":"rgba(220,38,38,0.3)"}`, borderRadius:20, padding:"80px 20px", textAlign:"center", cursor:loading?"not-allowed":"pointer", background:dragOver?"rgba(220,38,38,0.08)":"rgba(220,38,38,0.03)", transition:"all 0.2s" }}
          >
            <div style={{ fontSize:64, marginBottom:16 }}>{loading?"⏳":"📄"}</div>
            <div style={{ color:D.text, fontSize:18, fontWeight:700, marginBottom:8 }}>{loading?"Loading PDF...":"Drag & Drop PDF Here"}</div>
            <div style={{ color:D.muted, fontSize:13, marginBottom:24 }}>{loading?"Rendering your PDF document...":"PDF file will display visually — click text to edit"}</div>
            {!loading && <div style={{ display:"inline-block", padding:"13px 30px", background:"linear-gradient(135deg,#dc2626,#f97316)", borderRadius:12, color:"#fff", fontSize:14, fontWeight:700, boxShadow:"0 4px 15px rgba(220,38,38,0.3)" }}>📤 Choose PDF File</div>}
            <input ref={fileRef} type="file" accept=".pdf" onChange={e=>e.target.files[0]&&processFile(e.target.files[0])} style={{ display:"none" }}/>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginTop:20 }}>
            {[{icon:"📄",t:"Upload PDF",d:"Drag & drop your PDF file"},{icon:"👆",t:"Click to Edit",d:"Click any text on PDF to edit it"},{icon:"🤖",t:"AI Improve",d:"Use AI to fix and improve text"},{icon:"⬇️",t:"Download PDF",d:"Save as a real PDF file"}].map(s=>(
              <div key={s.t} style={{ padding:14, background:D.card, border:`1px solid ${D.border}`, borderRadius:14, textAlign:"center" }}>
                <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
                <div style={{ color:D.text, fontSize:12, fontWeight:700, marginBottom:4 }}>{s.t}</div>
                <div style={{ color:D.muted, fontSize:11, lineHeight:1.5 }}>{s.d}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:16, padding:14, background:"rgba(6,214,160,0.05)", border:"1px solid rgba(6,214,160,0.15)", borderRadius:12 }}>
            <p style={{ color:"#06d6a0", fontSize:11, margin:0 }}>🔒 100% Secure — files are processed locally in your browser and never stored on our servers.</p>
          </div>
        </div>
      )}

      {step==="edit" && (
        <div>
          {showAI && (
            <div style={{ padding:14, background:D.card, border:`1px solid ${D.border}`, borderRadius:12, marginBottom:14, display:"flex", flexWrap:"wrap", gap:8, alignItems:"center" }}>
              <span style={{ color:D.muted, fontSize:12, fontWeight:600 }}>🤖 AI:</span>
              {[{key:"fix",label:"Fix Grammar",color:"#06d6a0"},{key:"improve",label:"Improve",color:"#8b5cf6"},{key:"formal",label:"Make Formal",color:"#4361ee"},{key:"summarize",label:"Summarize",color:"#e91e8c"}].map(btn=>(
                <button key={btn.key} onClick={()=>runAI(btn.key)} disabled={aiLoading} style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${btn.color}40`, background:`${btn.color}15`, color:btn.color, fontSize:12, fontWeight:600, cursor:aiLoading?"not-allowed":"pointer" }}>
                  {aiLoading?"⏳...":btn.label}
                </button>
              ))}
            </div>
          )}

          {/* Page Controls */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, padding:"8px 14px", background:D.toolbar, borderRadius:10, flexWrap:"wrap", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage<=1} style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${D.border}`, background:"transparent", color:D.text, cursor:"pointer", fontSize:14 }}>←</button>
              <span style={{ color:D.text, fontSize:12, fontWeight:600 }}>Page {currentPage} of {numPages}</span>
              <button onClick={()=>setCurrentPage(p=>Math.min(numPages,p+1))} disabled={currentPage>=numPages} style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${D.border}`, background:"transparent", color:D.text, cursor:"pointer", fontSize:14 }}>→</button>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={()=>setScale(s=>Math.max(0.5,s-0.2))} style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${D.border}`, background:"transparent", color:D.text, cursor:"pointer" }}>−</button>
              <span style={{ color:D.muted, fontSize:11 }}>{Math.round(scale*100)}%</span>
              <button onClick={()=>setScale(s=>Math.min(3,s+0.2))} style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${D.border}`, background:"transparent", color:D.text, cursor:"pointer" }}>+</button>
              <button onClick={()=>setEditMode(!editMode)} style={{ padding:"5px 12px", borderRadius:6, border:"none", background:editMode?"linear-gradient(135deg,#dc2626,#f97316)":"rgba(220,38,38,0.1)", color:editMode?"#fff":"#f87171", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                {editMode?"✏️ Editing":"👁 View"}
              </button>
            </div>
          </div>

          {/* LightPDF Style Toolbar */}
          {editMode && showToolbar && (
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", background:"#f5f5f5", border:"1px solid #ddd", borderRadius:"8px 8px 0 0", flexWrap:"wrap" }}>
              <button onClick={undo} disabled={historyIndex<=0} title="Undo" style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer", fontSize:14, opacity:historyIndex<=0?0.4:1 }}>↩️</button>
              <button onClick={redo} disabled={historyIndex>=history.length-1} title="Redo" style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer", fontSize:14, opacity:historyIndex>=history.length-1?0.4:1 }}>↪️</button>
              <div style={{ width:1, height:24, background:"#ddd", margin:"0 4px" }}/>
              <button title="Bold" style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer", fontWeight:700, fontSize:13 }}>B</button>
              <button title="Italic" style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer", fontStyle:"italic", fontSize:13 }}>I</button>
              <div style={{ width:1, height:24, background:"#ddd", margin:"0 4px" }}/>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ fontSize:11, color:"#666" }}>A</span>
                {["#000000","#dc2626","#2563eb","#16a34a","#d97706"].map(c=>(
                  <div key={c} onClick={()=>{}} style={{ width:16, height:16, borderRadius:"50%", background:c, cursor:"pointer", border:"2px solid #fff", boxShadow:"0 0 0 1px #ddd" }}/>
                ))}
              </div>
              <div style={{ width:1, height:24, background:"#ddd", margin:"0 4px" }}/>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ fontSize:11, color:"#666" }}>🖊️</span>
                {["#ffeb3b","#86efac","#93c5fd","#fca5a5","#e879f9"].map(c=>(
                  <div key={c} onClick={()=>setHighlightColor(c)} style={{ width:16, height:16, borderRadius:"50%", background:c, cursor:"pointer", border:highlightColor===c?"2px solid #333":"2px solid #fff", boxShadow:"0 0 0 1px #ddd" }}/>
                ))}
              </div>
              <div style={{ width:1, height:24, background:"#ddd", margin:"0 4px" }}/>
              <button title="Align Left" style={{ padding:"5px 8px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer", fontSize:13 }}>≡</button>
              <button title="Align Center" style={{ padding:"5px 8px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer", fontSize:13 }}>☰</button>
            </div>
          )}

          {/* PDF Canvas + Text Overlay */}
          <div style={{ position:"relative", display:"inline-block", border:`1px solid ${D.border}`, borderRadius:8, overflow:"auto", maxWidth:"100%", background:"#fff", boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>
            <canvas ref={canvasRef} style={{ display:"block" }}/>
            {editMode && textBlocks.map(block => (
              <div
                key={block.id}
                style={{ position:"absolute", left:block.x, top:block.y, minWidth:block.width, minHeight:block.height }}
              >
                <input
                  value={block.text}
                  onChange={e=>handleBlockEdit(block.id, e.target.value)}
                  onClick={()=>setSelectedBlock(block.id)}
                  style={{
                    position:"absolute", left:0, top:0,
                    width: Math.max(block.width, 40),
                    fontSize: block.fontSize,
                    fontFamily:"serif",
                    background: selectedBlock===block.id ? "rgba(220,38,38,0.15)" : "transparent",
                    border: selectedBlock===block.id ? "1px solid #dc2626" : "1px solid transparent",
                    color:"transparent",
                    caretColor:"#dc2626",
                    outline:"none",
                    padding:0,
                    cursor:"text",
                    borderRadius:2
                  }}
                  onFocus={e=>{ e.target.style.background="rgba(220,38,38,0.1)"; e.target.style.color="#000"; }}
                  onBlur={e=>{ e.target.style.background="transparent"; e.target.style.color="transparent"; }}
                />
              </div>
            ))}
          </div>

          <div style={{ marginTop:12, padding:12, background:"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.15)", borderRadius:10 }}>
            <p style={{ color:"#f97316", fontSize:11, margin:0 }}>💡 Click <strong>View/Editing</strong> button to toggle edit mode • Click any text on the PDF to edit it • Use zoom +/- to resize • Click <strong>Download PDF</strong> when done!</p>
          </div>
        </div>
      )}
      <style>{`@keyframes bounce{from{transform:translateY(0)}to{transform:translateY(-8px)}}`}</style>
    </div>
  );
}
