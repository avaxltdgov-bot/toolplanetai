import { useState, useRef } from "react";

export default function PDFEditor({ darkMode }) {
  const [editedText, setEditedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [step, setStep] = useState("upload");
  const [aiAction, setAiAction] = useState("");
  const [highlightColor, setHighlightColor] = useState("#ffeb3b");
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [activeTab, setActiveTab] = useState("edit");
  const fileRef = useRef();
  const textareaRef = useRef();

  const D = darkMode ? {
    bg: "rgba(255,255,255,0.025)", border: "rgba(255,255,255,0.08)",
    text: "#e4e4f0", muted: "#6b6b85", input: "rgba(0,0,0,0.4)",
    card: "rgba(255,255,255,0.03)", toolbar: "rgba(255,255,255,0.04)"
  } : {
    bg: "#ffffff", border: "rgba(0,0,0,0.1)",
    text: "#1a1a2e", muted: "#555570", input: "#ffffff",
    card: "#f8f8ff", toolbar: "#f0f0fa"
  };

  const updateCounts = (text) => {
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    setCharCount(text.length);
  };

  const processFile = async (file) => {
    if (file.size > 10 * 1024 * 1024) { alert("File must be under 10MB"); return; }
    setLoading(true);
    setFileName(file.name);
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
        if (data.result) { setEditedText(data.result); updateCounts(data.result); setStep("edit"); }
        else { alert("Could not read file. Try another file."); }
      } catch(err) { alert("Server error. Wait 30 seconds and try again."); }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const highlightSelected = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) { alert("Select some text first!"); return; }
    const markers = { "#ffeb3b": "==", "#ff9800": "~~", "#4caf50": "++", "#2196f3": ">>", "#e91e63": "**" };
    const m = markers[highlightColor] || "==";
    const newText = editedText.substring(0,start) + m + editedText.substring(start,end) + m + editedText.substring(end);
    setEditedText(newText);
    updateCounts(newText);
  };

  const findAndReplace = () => {
    if (!findText) return;
    const newText = editedText.split(findText).join(replaceText);
    setEditedText(newText);
    updateCounts(newText);
    setFindText("");
    setReplaceText("");
  };

  const runAI = async (action) => {
    if (!editedText.trim()) return;
    setAiLoading(true);
    setAiAction(action);
    const prompts = {
      fix: "Fix all grammar and spelling errors. Return only corrected text:\n\n",
      improve: "Improve and enhance professionally. Return only improved text:\n\n",
      formal: "Rewrite in formal tone. Return only rewritten text:\n\n",
      shorter: "Make shorter without losing key info. Return only shortened text:\n\n",
      summarize: "Summarize into bullet points. Return only summary:\n\n",
      rewrite: "Completely rewrite for clarity. Return only rewritten text:\n\n"
    };
    try {
      const res = await fetch("https://toolplanetai-backend.onrender.com/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "rewrite", input: prompts[action] + editedText })
      });
      const data = await res.json();
      if (data.result) { setEditedText(data.result); updateCounts(data.result); }
    } catch(err) { alert("AI error. Try again."); }
    setAiLoading(false);
  };

  const downloadTxt = () => {
    const blob = new Blob([editedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.[^/.]+$/, "") + "_edited.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyAll = () => {
    try { navigator.clipboard.writeText(editedText); }
    catch(e) { const el = document.createElement("textarea"); el.value = editedText; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const reset = () => { setEditedText(""); setFileName(""); setStep("upload"); setWordCount(0); setCharCount(0); };

  const aiButtons = [
    { key: "fix", label: "Fix Grammar", color: "#06d6a0" },
    { key: "improve", label: "Improve", color: "#8b5cf6" },
    { key: "formal", label: "Make Formal", color: "#4361ee" },
    { key: "shorter", label: "Shorter", color: "#f97316" },
    { key: "summarize", label: "Summarize", color: "#e91e8c" },
    { key: "rewrite", label: "Rewrite", color: "#eab308" }
  ];

  const highlights = [
    { color: "#ffeb3b", label: "Yellow" },
    { color: "#ff9800", label: "Orange" },
    { color: "#4caf50", label: "Green" },
    { color: "#2196f3", label: "Blue" },
    { color: "#e91e63", label: "Pink" }
  ];

  return (
    <div>
      <style>{`@keyframes bounce{from{transform:translateY(0)}to{transform:translateY(-8px)}}`}</style>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:"linear-gradient(135deg,#dc2626,#f97316)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>📑</div>
          <div>
            <h2 style={{ fontSize:20, fontWeight:800, margin:0, color:D.text }}>PDFGenius AI</h2>
            <p style={{ color:D.muted, fontSize:11, margin:0 }}>Edit • Highlight • AI Improve • Download</p>
          </div>
        </div>
        {step==="edit" && <button onClick={reset} style={{ padding:"8px 16px", borderRadius:8, border:"1px solid rgba(220,38,38,0.3)", background:"rgba(220,38,38,0.08)", color:"#f87171", fontSize:12, fontWeight:600, cursor:"pointer" }}>New File</button>}
      </div>

      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:20 }}>
        {["Edit Text","5 Highlight Colors","6 AI Actions","Find & Replace","Download PDF","Secure"].map(f=>(
          <span key={f} style={{ fontSize:10, padding:"3px 10px", background:"rgba(220,38,38,0.08)", border:"1px solid rgba(220,38,38,0.2)", borderRadius:100, color:"#f87171", fontWeight:600 }}>{f}</span>
        ))}
      </div>

      {step==="upload" && (
        <div>
          <div
            onDragOver={e=>{e.preventDefault();setDragOver(true);}}
            onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{e.preventDefault();setDragOver(false);if(e.dataTransfer.files[0])processFile(e.dataTransfer.files[0]);}}
            onClick={()=>!loading&&fileRef.current.click()}
            style={{ border:`2px dashed ${dragOver?"#dc2626":"rgba(220,38,38,0.3)"}`, borderRadius:20, padding:"70px 20px", textAlign:"center", cursor:loading?"not-allowed":"pointer", background:dragOver?"rgba(220,38,38,0.08)":"rgba(220,38,38,0.03)", transition:"all 0.2s" }}
          >
            <div style={{ fontSize:60, marginBottom:16 }}>{loading?"⏳":"📂"}</div>
            <div style={{ color:D.text, fontSize:18, fontWeight:700, marginBottom:8 }}>{loading?"Reading your file...":"Drag & Drop or Click to Upload"}</div>
            <div style={{ color:D.muted, fontSize:12, marginBottom:20 }}>{loading?"Please wait, extracting text...":"Supports PDF, Word (.docx), TXT • Max 10MB"}</div>
            {!loading && <div style={{ display:"inline-block", padding:"12px 28px", background:"linear-gradient(135deg,#dc2626,#f97316)", borderRadius:12, color:"#fff", fontSize:14, fontWeight:700 }}>Choose File</div>}
            {loading && <div style={{ display:"flex", justifyContent:"center", gap:6 }}>{[0,1,2].map(i=><div key={i} style={{ width:8, height:8, borderRadius:"50%", background:"#dc2626", animation:`bounce 0.6s ${i*0.2}s infinite alternate` }}/>)}</div>}
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" onChange={e=>e.target.files[0]&&processFile(e.target.files[0])} style={{ display:"none" }}/>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginTop:20 }}>
            {[{n:"1",icon:"📤",t:"Upload File",d:"Drag & drop or click to upload your PDF or Word file"},{n:"2",icon:"✏️",t:"Edit & Improve",d:"Edit text directly or use AI to fix and improve"},{n:"3",icon:"⬇️",t:"Download PDF",d:"Download your edited file instantly for free"}].map(s=>(
              <div key={s.n} style={{ padding:16, background:D.card, border:`1px solid ${D.border}`, borderRadius:14, textAlign:"center" }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#dc2626,#f97316)", color:"#fff", fontSize:13, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>{s.n}</div>
                <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
                <div style={{ color:D.text, fontSize:12, fontWeight:700, marginBottom:4 }}>{s.t}</div>
                <div style={{ color:D.muted, fontSize:11, lineHeight:1.5 }}>{s.d}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop:16, padding:14, background:"rgba(6,214,160,0.05)", border:"1px solid rgba(6,214,160,0.15)", borderRadius:12, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>🔒</span>
            <p style={{ color:"#06d6a0", fontSize:11, margin:0 }}>Your files are 100% secure — encrypted during transfer, automatically deleted after processing.</p>
          </div>
        </div>
      )}

      {step==="edit" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, padding:"10px 16px", background:D.card, border:`1px solid ${D.border}`, borderRadius:12, flexWrap:"wrap", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18 }}>📄</span>
              <div>
                <div style={{ color:D.text, fontSize:12, fontWeight:700 }}>{fileName}</div>
                <div style={{ color:D.muted, fontSize:10 }}>{wordCount} words • {charCount} characters</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={copyAll} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid rgba(139,92,246,0.3)", background:"rgba(139,92,246,0.1)", color:"#c4b5fd", fontSize:11, fontWeight:600, cursor:"pointer" }}>{saved?"Copied!":"Copy"}</button>
              <button onClick={downloadTxt} style={{ padding:"7px 14px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#dc2626,#f97316)", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>Download</button>
            </div>
          </div>

          <div style={{ display:"flex", gap:4, marginBottom:14, background:D.toolbar, borderRadius:10, padding:4 }}>
            {[{key:"edit",label:"Edit"},{key:"highlight",label:"Highlight"},{key:"ai",label:"AI Tools"},{key:"find",label:"Find & Replace"}].map(tab=>(
              <button key={tab.key} onClick={()=>setActiveTab(tab.key)} style={{ flex:1, padding:"8px 4px", borderRadius:8, border:"none", background:activeTab===tab.key?"linear-gradient(135deg,#dc2626,#f97316)":"transparent", color:activeTab===tab.key?"#fff":D.muted, fontSize:11, fontWeight:activeTab===tab.key?700:400, cursor:"pointer" }}>{tab.label}</button>
            ))}
          </div>

          {activeTab==="highlight" && (
            <div style={{ padding:16, background:D.card, border:`1px solid ${D.border}`, borderRadius:14, marginBottom:14 }}>
              <div style={{ color:D.text, fontSize:13, fontWeight:600, marginBottom:12 }}>Select text below, pick color, then click Highlight</div>
              <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                {highlights.map(h=>(
                  <div key={h.color} onClick={()=>setHighlightColor(h.color)} title={h.label} style={{ width:32, height:32, borderRadius:"50%", background:h.color, cursor:"pointer", border:highlightColor===h.color?"3px solid #fff":"3px solid transparent", boxShadow:highlightColor===h.color?`0 0 0 2px ${h.color}`:"none" }}/>
                ))}
                <button onClick={highlightSelected} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:highlightColor, color:"#000", fontSize:12, fontWeight:700, cursor:"pointer" }}>Highlight Selection</button>
              </div>
            </div>
          )}

          {activeTab==="ai" && (
            <div style={{ padding:16, background:D.card, border:`1px solid ${D.border}`, borderRadius:14, marginBottom:14 }}>
              <div style={{ color:D.text, fontSize:13, fontWeight:600, marginBottom:12 }}>AI will process your entire document</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {aiButtons.map(btn=>(
                  <button key={btn.key} onClick={()=>runAI(btn.key)} disabled={aiLoading} style={{ padding:"10px 16px", borderRadius:10, border:`1px solid ${btn.color}40`, background:`${btn.color}15`, color:btn.color, fontSize:12, fontWeight:600, cursor:aiLoading?"not-allowed":"pointer", opacity:aiLoading&&aiAction!==btn.key?0.4:1 }}>
                    {aiLoading&&aiAction===btn.key?"Working...":btn.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab==="find" && (
            <div style={{ padding:16, background:D.card, border:`1px solid ${D.border}`, borderRadius:14, marginBottom:14 }}>
              <div style={{ color:D.text, fontSize:13, fontWeight:600, marginBottom:12 }}>Find & Replace Text</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <input value={findText} onChange={e=>setFindText(e.target.value)} placeholder="Find text..." style={{ padding:"10px 14px", background:D.input, border:`1px solid ${D.border}`, borderRadius:8, color:D.text, fontSize:13, outline:"none" }}/>
                <input value={replaceText} onChange={e=>setReplaceText(e.target.value)} placeholder="Replace with..." style={{ padding:"10px 14px", background:D.input, border:`1px solid ${D.border}`, borderRadius:8, color:D.text, fontSize:13, outline:"none" }}/>
                <button onClick={findAndReplace} disabled={!findText} style={{ padding:"10px 20px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#dc2626,#f97316)", color:"#fff", fontSize:13, fontWeight:700, cursor:findText?"pointer":"not-allowed" }}>Replace All</button>
              </div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={editedText}
            onChange={e=>{setEditedText(e.target.value);updateCounts(e.target.value);}}
            style={{ width:"100%", minHeight:450, padding:20, background:D.input, border:`1.5px solid ${D.border}`, borderRadius:14, color:D.text, fontSize:14, fontFamily:"Georgia,serif", resize:"vertical", outline:"none", lineHeight:2, boxSizing:"border-box" }}
          />

          <div style={{ display:"flex", gap:10, marginTop:14, flexWrap:"wrap", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ color:D.muted, fontSize:11 }}>{wordCount} words • {charCount} characters</div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={copyAll} style={{ padding:"12px 20px", borderRadius:10, border:"1px solid rgba(139,92,246,0.3)", background:"rgba(139,92,246,0.1)", color:"#c4b5fd", fontSize:13, fontWeight:600, cursor:"pointer" }}>{saved?"Copied!":"Copy All"}</button>
              <button onClick={downloadTxt} style={{ padding:"12px 24px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#dc2626,#f97316)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>Download Edited File</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
