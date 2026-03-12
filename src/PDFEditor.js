// v4.0 Click-to-Edit PDF like LightPDF
import { useState, useRef, useEffect, useCallback } from "react";

export default function PDFEditor({ darkMode }) {
  const [step, setStep] = useState("upload");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.4);
  const [textBlocks, setTextBlocks] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [hasEdited, setHasEdited] = useState(false);
  const canvasRef = useRef();
  const fileRef = useRef();
  const pdfDocRef = useRef(null);

  const D = darkMode ? {
    text: "#e4e4f0", muted: "#6b6b85", border: "rgba(255,255,255,0.08)",
    card: "rgba(255,255,255,0.03)"
  } : {
    text: "#1a1a2e", muted: "#555570", border: "rgba(0,0,0,0.1)",
    card: "#f8f8ff"
  };

  const loadPdfJs = useCallback(() => new Promise((resolve) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    document.head.appendChild(script);
  }), []);

  const renderPage = useCallback(async (pageNum) => {
    if (!pdfDocRef.current || !canvasRef.current) return;
    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const textContent = await page.getTextContent();
      const blocks = [];
      textContent.items.forEach((item, i) => {
        if (!item.str.trim()) return;
        const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
        const fontHeight = Math.sqrt(tx[1]*tx[1] + tx[3]*tx[3]);
        blocks.push({
          id: i, text: item.str,
          x: tx[4], y: tx[5] - fontHeight,
          width: Math.max(item.width * scale, 20),
          height: fontHeight + 2,
          fontSize: Math.round(fontHeight)
        });
      });
      setTextBlocks(blocks);
    } catch(err) { console.error("Render error:", err); }
  }, [scale]);

  const renderedRef = useRef({});
  useEffect(() => {
    const key = `${currentPage}-${scale}`;
    if (step === "edit" && !hasEdited) {
      renderedRef.current[key] = true;
      renderPage(currentPage);
    }
  }, [currentPage, scale, step, renderPage, hasEdited]);

  const processFile = async (file) => {
    if (file.size > 10 * 1024 * 1024) { alert("File must be under 10MB"); return; }
    if (!file.name.toLowerCase().endsWith(".pdf")) { alert("Please upload a PDF file"); return; }
    setLoading(true);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(",")[1];
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
        setTimeout(() => renderPage(1), 200);
      } catch(err) {
        setLoading(false);
        alert("Could not load PDF. Please try a different file.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTextChange = (id, newText) => {
    setHasEdited(true);
    setTextBlocks(prev => prev.map(b => b.id === id ? { ...b, text: newText } : b));
  };

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const allText = textBlocks.map(b => b.text).join("\n");
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
    } catch(err) { alert("Download failed. Please try again."); }
    setDownloading(false);
  };

  const runAI = async (action) => {
    const allText = textBlocks.map(b => b.text).join(" ");
    if (!allText.trim()) return;
    setAiLoading(true);
    const prompts = {
      fix: "Fix all grammar and spelling errors. Return only corrected text:\n\n",
      improve: "Improve professionally. Return only improved text:\n\n",
      formal: "Rewrite formally. Return only text:\n\n",
      summarize: "Summarize into bullet points:\n\n"
    };
    try {
      const res = await fetch("https://toolplanetai-backend.onrender.com/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "rewrite", input: prompts[action] + allText })
      });
      const data = await res.json();
      if (data.result) {
        const sentences = data.result.match(/[^.!?]+[.!?]+/g) || [data.result];
        setTextBlocks(prev => prev.map((b, i) => ({ ...b, text: sentences[i] ? sentences[i].trim() : b.text })));
      }
    } catch(err) { alert("AI error. Try again."); }
    setAiLoading(false);
  };

  const resetAll = () => { setStep("upload"); setTextBlocks([]); setEditingId(null); setNumPages(0); setCurrentPage(1); pdfDocRef.current = null; };

  const handleOutsideClick = (e) => {
    if (!e.target.closest(".ptb")) {
      setEditingId(null);
    }
  };

  return (
    <div>
      <style>{`
        .ptb { position:absolute; cursor:text; border:1px solid transparent; border-radius:2px; box-sizing:border-box; }
        .ptb:hover { border-color:rgba(220,38,38,0.5); background:rgba(220,38,38,0.06); }
        .ptb.active { border-color:#dc2626!important; background:rgba(255,255,255,0.97)!important; z-index:10; box-shadow:0 2px 10px rgba(220,38,38,0.3); }
        .ptb textarea { width:100%; border:none; outline:none; background:transparent; padding:0; margin:0; font-family:serif; resize:none; overflow:hidden; display:block; color:#000; }
      `}</style>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:"linear-gradient(135deg,#dc2626,#f97316)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>📑</div>
          <div>
            <h2 style={{ fontSize:20, fontWeight:800, margin:0, color:D.text }}>PDFGenius AI</h2>
            <p style={{ color:D.muted, fontSize:11, margin:0 }}>Click any text on PDF to edit • Download as PDF</p>
          </div>
        </div>
        {step==="edit" && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button onClick={()=>setShowAI(!showAI)} style={{ padding:"8px 14px", borderRadius:8, border:"1px solid rgba(139,92,246,0.3)", background:"rgba(139,92,246,0.1)", color:"#c4b5fd", fontSize:12, fontWeight:600, cursor:"pointer" }}>🤖 AI</button>
            <button onClick={downloadPDF} disabled={downloading} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#dc2626,#f97316)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
              {downloading?"⏳ Saving...":"⬇️ Download PDF"}
            </button>
            <button onClick={resetAll} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:D.muted, fontSize:12, cursor:"pointer" }}>📂 New</button>
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
            <div style={{ color:D.text, fontSize:18, fontWeight:700, marginBottom:8 }}>{loading?"Loading PDF...":"Drop PDF Here or Click to Upload"}</div>
            <div style={{ color:D.muted, fontSize:13, marginBottom:24 }}>{loading?"Rendering PDF...":"PDF displays visually • Click any text to edit"}</div>
            {!loading && <div style={{ display:"inline-block", padding:"13px 30px", background:"linear-gradient(135deg,#dc2626,#f97316)", borderRadius:12, color:"#fff", fontSize:14, fontWeight:700 }}>📤 Choose PDF</div>}
            <input ref={fileRef} type="file" accept=".pdf" onChange={e=>e.target.files[0]&&processFile(e.target.files[0])} style={{ display:"none" }}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:12, marginTop:20 }}>
            {[{icon:"📄",t:"Upload PDF",d:"Drag & drop PDF"},{icon:"👆",t:"Click to Edit",d:"Click text on PDF"},{icon:"🤖",t:"AI Improve",d:"AI fixes text"},{icon:"⬇️",t:"Download PDF",d:"Save as PDF"}].map(s=>(
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
            <div style={{ padding:12, background:D.card, border:`1px solid ${D.border}`, borderRadius:10, marginBottom:12, display:"flex", flexWrap:"wrap", gap:8 }}>
              {[{key:"fix",label:"Fix Grammar",color:"#06d6a0"},{key:"improve",label:"Improve",color:"#8b5cf6"},{key:"formal",label:"Make Formal",color:"#4361ee"},{key:"summarize",label:"Summarize",color:"#e91e8c"}].map(btn=>(
                <button key={btn.key} onClick={()=>runAI(btn.key)} disabled={aiLoading} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${btn.color}40`, background:`${btn.color}15`, color:btn.color, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                  {aiLoading?"⏳...":btn.label}
                </button>
              ))}
            </div>
          )}

          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", background:"#f0f0f0", border:"1px solid #ddd", borderRadius:"10px 10px 0 0", flexWrap:"wrap" }}>
            <button onClick={()=>{setCurrentPage(p=>Math.max(1,p-1));setHasEdited(false);}} disabled={currentPage<=1} style={{ padding:"4px 10px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer" }}>←</button>
            <span style={{ fontSize:12, color:"#555" }}>Page {currentPage} / {numPages}</span>
            <button onClick={()=>{setCurrentPage(p=>Math.min(numPages,p+1));setHasEdited(false);}} disabled={currentPage>=numPages} style={{ padding:"4px 10px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer" }}>→</button>
            <div style={{ width:1, height:20, background:"#ddd", margin:"0 4px" }}/>
            <button onClick={()=>{setHasEdited(false);setScale(s=>Math.max(0.5,parseFloat((s-0.1).toFixed(1))));} } style={{ padding:"4px 10px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer", fontWeight:700 }}>−</button>
            <span style={{ fontSize:12, color:"#555", minWidth:36, textAlign:"center" }}>{Math.round(scale*100)}%</span>
            <button onClick={()=>{setHasEdited(false);setScale(s=>Math.min(3,parseFloat((s+0.1).toFixed(1))));} } style={{ padding:"4px 10px", borderRadius:6, border:"1px solid #ddd", background:"#fff", cursor:"pointer", fontWeight:700 }}>+</button>
            <div style={{ width:1, height:20, background:"#ddd", margin:"0 4px" }}/>
            <span style={{ fontSize:11, color:"#888" }}>👆 Click any text to edit</span>
          </div>

          <div onClick={handleOutsideClick} style={{ position:"relative", display:"inline-block", border:"1px solid #ddd", borderTop:"none", borderRadius:"0 0 8px 8px", background:"#fff", boxShadow:"0 4px 20px rgba(0,0,0,0.15)", maxWidth:"100%", overflowX:"auto" }}>
            <canvas ref={canvasRef} style={{ display:"block" }}/>
            {textBlocks.map(block => (
              <div key={block.id} className={`ptb${editingId===block.id?" active":""}`}
                style={{ left:block.x, top:block.y, width:Math.max(block.width+10,30), minHeight:Math.max(block.height+2,14) }}
                onClick={()=>setEditingId(block.id)}>
                {editingId===block.id ? (
                  <textarea autoFocus value={block.text}
                    onChange={e=>{ setHasEdited(true); handleTextChange(block.id,e.target.value); }}
                    onKeyDown={e=>{ 
                      e.stopPropagation();
                      if(e.key==="Enter" && !e.shiftKey){ 
                        e.preventDefault();
                        setEditingId(null); 
                      } 
                    }}
                    onClick={e=>e.stopPropagation()}
                    style={{ fontSize:block.fontSize, lineHeight:"1.2", minHeight:Math.max(block.height+2,14) }}
                    rows={1}/>
                ) : (
                  <span style={{ fontSize:block.fontSize, color:"transparent", whiteSpace:"nowrap", display:"block" }}>{block.text}</span>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop:12, padding:12, background:"rgba(220,38,38,0.05)", border:"1px solid rgba(220,38,38,0.15)", borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
            <p style={{ color:"#f87171", fontSize:11, margin:0 }}>💡 Click any text on the PDF to edit • Click outside to confirm • Download when done</p>
            <button onClick={downloadPDF} disabled={downloading} style={{ padding:"10px 20px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#dc2626,#f97316)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
              {downloading?"⏳ Saving...":"⬇️ Download PDF"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
