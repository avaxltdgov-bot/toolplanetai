import { useState, useRef, useCallback } from "react";

const BACKEND = "https://toolplanetai-backend.onrender.com/api/ai";

const ACTIONS = [
  { id:"plagiarism", icon:"🛡", label:"Check Plagiarism",   desc:"Detect copied content",  color:"#f97316", tool:"plagiarism" },
  { id:"aidetect",   icon:"🔍", label:"Detect AI Content",  desc:"Check if AI-written",    color:"#dc2626", tool:"aidetector" },
  { id:"grammar",    icon:"✅", label:"Fix Grammar",        desc:"Correct all errors",     color:"#06d6a0", tool:"grammar" },
  { id:"rewrite",    icon:"✨", label:"Rewrite & Improve",  desc:"Make it better",         color:"#8b5cf6", tool:"rewrite" },
  { id:"humanize",   icon:"🧬", label:"Humanize Text",      desc:"Sound 100% human",       color:"#ec4899", tool:"humanize" },
  { id:"summarize",  icon:"📋", label:"Summarize",          desc:"Key points only",        color:"#4361ee", tool:"summarize" },
];

const SUGGESTIONS = [
  { id:"readability", icon:"👁",  label:"Improve Readability",   tool:"rewrite",  prompt:"Rewrite this to be clearer and more readable:\n\n" },
  { id:"grammar2",    icon:"✅",  label:"Fix Grammar Issues",    tool:"grammar",  prompt:"Fix all grammar and spelling:\n\n" },
  { id:"human",       icon:"🧬",  label:"Rewrite to Human Tone", tool:"humanize", prompt:"Make this sound completely human and natural:\n\n" },
  { id:"reduce_ai",   icon:"📉",  label:"Reduce AI Score",       tool:"humanize", prompt:"Rewrite to avoid AI detection, vary sentences, add personality:\n\n" },
  { id:"shorten",     icon:"✂️",  label:"Make it Concise",       tool:"summarize",prompt:"Condense while keeping all key information:\n\n" },
  { id:"expand",      icon:"📐",  label:"Expand Content",        tool:"expand",   prompt:"Expand this with more detail and examples:\n\n" },
];

export default function FileProcessor({ darkMode }) {
  const [stage,         setStage]         = useState("upload");
  const [fileInfo,      setFileInfo]      = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [editedText,    setEditedText]    = useState("");
  const [result,        setResult]        = useState("");
  const [activeAction,  setActiveAction]  = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [progress,      setProgress]      = useState(0);
  const [progressMsg,   setProgressMsg]   = useState("");
  const [error,         setError]         = useState("");
  const [copied,        setCopied]        = useState(false);
  const [dragOver,      setDragOver]      = useState(false);
  const [showPreview,   setShowPreview]   = useState(false);
  const [toast,         setToast]         = useState("");
  const fileRef = useRef();

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2800); };

  const D = darkMode ? {
    bg:"rgba(255,255,255,0.035)", border:"rgba(255,255,255,0.09)",
    text:"#e4e4f0", muted:"#6b6b85", input:"rgba(255,255,255,0.04)",
    inputBorder:"rgba(255,255,255,0.1)",
  } : {
    bg:"#ffffff", border:"rgba(0,0,0,0.08)",
    text:"#1a1a2e", muted:"#5a5a78", input:"#f8f8ff",
    inputBorder:"rgba(0,0,0,0.12)",
  };

  const extractText = async (file, buffer) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "txt") return new TextDecoder().decode(buffer);
    if (ext === "docx" || ext === "doc") {
      const mammoth = await import("mammoth");
      const res = await mammoth.extractRawText({ arrayBuffer: buffer });
      return res.value || "";
    }
    if (ext === "pdf") {
      const base64 = btoa(new Uint8Array(buffer).reduce((d, b) => d + String.fromCharCode(b), ""));
      const res = await fetch("https://toolplanetai-backend.onrender.com/api/extract", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ file:base64, mediaType:file.type, fileName:file.name })
      });
      const data = await res.json();
      return data.result || "Could not extract PDF. Try a text-based PDF.";
    }
    throw new Error("Unsupported format");
  };

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf","doc","docx","txt"].includes(ext)) { setError("Please upload PDF, DOCX or TXT."); return; }
    setError(""); setStage("processing");
    const steps = [[10,"📂 Reading file..."],[30,"🔍 Parsing document..."],[60,"📝 Extracting text..."],[80,"⚙️ Finalizing..."]];
    let si = 0;
    const tick = setInterval(() => { if (si < steps.length) { setProgress(steps[si][0]); setProgressMsg(steps[si][1]); si++; } }, 400);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = await extractText(file, ev.target.result);
        clearInterval(tick);
        setProgress(100); setProgressMsg("✅ Done!");
        setFileInfo({ name:file.name, ext, size:file.size, raw:ev.target.result, type:file.type });
        setExtractedText(text); setEditedText(text);
        setTimeout(() => { setStage("ready"); setProgress(0); setProgressMsg(""); }, 500);
        showToast("✅ File extracted successfully!");
      } catch(e) {
        clearInterval(tick); setError("Could not read file: "+e.message); setStage("upload"); setProgress(0);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };

  const runAction = async (action, customPrompt=null) => {
    setLoading(true); setActiveAction(action.id); setError(""); setResult("");
    const text = editedText || extractedText;
    try {
      const res = await fetch(BACKEND, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ tool:action.tool, input:(customPrompt||"")+text })
      });
      if (!res.ok) throw new Error("Status "+res.status);
      const data = await res.json();
      setResult(data.result || data.error || "No result.");
      setStage("done"); showToast("✅ Processing complete!");
    } catch(e) { setError("Request failed: "+e.message); }
    setLoading(false); setActiveAction(null);
  };

  const downloadFile = (content, ext) => {
    const base = fileInfo.name.replace(/\.[^.]+$/, "")+"_processed";
    if (ext==="txt") { triggerDl(new Blob([content],{type:"text/plain"}), base+".txt"); showToast("✅ Downloaded!"); }
    else if (ext==="docx"||ext==="doc") {
      const html = `<html><head><meta charset='utf-8'></head><body><pre style='font-family:Arial;font-size:12pt;white-space:pre-wrap'>${content.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre></body></html>`;
      triggerDl(new Blob([html],{type:"application/msword"}), base+".doc"); showToast("✅ Downloaded!");
    } else if (ext==="pdf") {
      const w = window.open("","_blank");
      w.document.write(`<!DOCTYPE html><html><head><title>${base}</title><style>body{font-family:Arial;font-size:12pt;line-height:1.75;padding:48px;max-width:780px;margin:0 auto;}pre{white-space:pre-wrap;font-family:inherit;}@media print{.np{display:none}}</style></head><body><pre>${content.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre><br><div class='np'><button onclick='window.print()' style='padding:12px 24px;background:#8b5cf6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:15px'>🖨 Print / Save as PDF</button></div></body></html>`);
      w.document.close(); showToast("📄 Click Print → Save as PDF");
    }
  };

  const triggerDl = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"),{href:url,download:filename}).click();
    URL.revokeObjectURL(url);
  };

  const copyText = (text) => {
    try { navigator.clipboard.writeText(text); } catch { const el=document.createElement("textarea"); el.value=text; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); }
    setCopied(true); setTimeout(()=>setCopied(false),2200); showToast("📋 Copied!");
  };

  const wc = (t) => t?.trim() ? t.trim().split(/\s+/).length : 0;
  const solidBtn = (c) => ({padding:"10px 18px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${c},${c}bb)`,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"Outfit,sans-serif",display:"flex",alignItems:"center",gap:7,transition:"all .2s"});
  const outBtn   = (c) => ({padding:"10px 18px",borderRadius:10,border:`1px solid ${c}40`,background:`${c}10`,color:c,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"Outfit,sans-serif",display:"flex",alignItems:"center",gap:7,transition:"all .2s"});

  if (stage==="upload"||stage==="processing") return (
    <div>
      {toast&&<div style={{position:"fixed",bottom:24,right:24,background:"#1a1a2e",border:"1px solid rgba(139,92,246,0.45)",borderRadius:12,padding:"12px 20px",fontSize:14,color:"#e4e4f0",zIndex:9999,boxShadow:"0 8px 32px rgba(0,0,0,0.45)",animation:"fadeIn .25s ease"}}>{toast}</div>}
      <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={onDrop} onClick={()=>fileRef.current?.click()}
        style={{border:`2px dashed ${dragOver?"#8b5cf6":"rgba(139,92,246,0.35)"}`,borderRadius:20,padding:"52px 32px",textAlign:"center",cursor:"pointer",background:dragOver?"rgba(139,92,246,0.08)":"rgba(139,92,246,0.025)",transition:"all .25s",marginBottom:18}}>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
        <div style={{fontSize:56,marginBottom:14}}>{dragOver?"📥":"📂"}</div>
        <div style={{fontSize:19,fontWeight:800,color:D.text,marginBottom:8}}>{dragOver?"Drop it here!":"Upload Your Document"}</div>
        <p style={{color:D.muted,fontSize:14,marginBottom:20}}>Drag & drop or click · PDF, DOCX, DOC, TXT</p>
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
          {["📄 PDF","📝 DOCX","📃 DOC","📋 TXT"].map(f=><span key={f} style={{padding:"5px 14px",borderRadius:99,border:"1px solid rgba(139,92,246,0.3)",fontSize:12,color:"#a78bfa",fontWeight:700}}>{f}</span>)}
        </div>
      </div>
      {stage==="processing"&&progress>0&&(
        <div style={{background:D.bg,border:"1px solid "+D.border,borderRadius:14,padding:"18px 20px",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,fontSize:13}}>
            <span style={{color:D.muted,fontWeight:500}}>{progressMsg}</span>
            <span style={{color:"#8b5cf6",fontWeight:800}}>{progress}%</span>
          </div>
          <div style={{height:8,background:"rgba(139,92,246,0.12)",borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",width:progress+"%",background:"linear-gradient(90deg,#8b5cf6,#f97316)",borderRadius:99,transition:"width .35s ease"}}/>
          </div>
        </div>
      )}
      {error&&<div style={{padding:"12px 16px",background:"rgba(220,38,38,0.08)",border:"1px solid rgba(220,38,38,0.22)",borderRadius:12,fontSize:13,color:"#fca5a5",marginTop:12}}>⚠️ {error}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,marginTop:16}}>
        {[["📄","PDF Support","Extract from any PDF"],["📝","DOCX / DOC","Word docs fully supported"],["📃","TXT Files","Plain text ready to go"],["🔒","Private","Files stay in your browser"]].map(([ic,t,d])=>(
          <div key={t} style={{background:D.bg,border:"1px solid "+D.border,borderRadius:12,padding:"14px 16px",display:"flex",gap:12,alignItems:"flex-start"}}>
            <span style={{fontSize:24,flexShrink:0}}>{ic}</span>
            <div><div style={{fontSize:13,fontWeight:700,color:D.text}}>{t}</div><div style={{fontSize:11,color:D.muted,marginTop:3}}>{d}</div></div>
          </div>
        ))}
      </div>
    </div>
  );

  if (stage==="ready") return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {toast&&<div style={{position:"fixed",bottom:24,right:24,background:"#1a1a2e",border:"1px solid rgba(139,92,246,0.45)",borderRadius:12,padding:"12px 20px",fontSize:14,color:"#e4e4f0",zIndex:9999}}>{toast}</div>}
      <div style={{background:"rgba(139,92,246,0.07)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:14,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
        <span style={{fontSize:30}}>{fileInfo.ext==="pdf"?"📄":fileInfo.ext==="txt"?"📃":"📝"}</span>
        <div style={{flex:1,minWidth:160}}>
          <div style={{fontWeight:700,fontSize:14,color:D.text}}>{fileInfo.name}</div>
          <div style={{fontSize:11,color:D.muted,marginTop:3}}>{(fileInfo.size/1024).toFixed(1)} KB · {wc(extractedText).toLocaleString()} words · {extractedText.length.toLocaleString()} chars</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <span style={{padding:"3px 10px",borderRadius:99,background:"rgba(6,214,160,0.1)",border:"1px solid rgba(6,214,160,0.25)",fontSize:11,fontWeight:700,color:"#06d6a0"}}>✅ Extracted</span>
          <button onClick={()=>{setStage("upload");setFileInfo(null);setExtractedText("");setEditedText("");}} style={{...outBtn("#dc2626"),padding:"4px 10px",fontSize:11}}>✕ Remove</button>
        </div>
      </div>

      <div style={{background:D.bg,border:"1px solid "+D.border,borderRadius:16,padding:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:12,fontWeight:700,color:D.muted,textTransform:"uppercase",letterSpacing:1.2}}>📄 Extracted Text — Editable</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:11,color:D.muted}}>{wc(editedText).toLocaleString()} words · {editedText.length.toLocaleString()} chars</span>
            <button onClick={()=>copyText(editedText)} style={{...outBtn("#8b5cf6"),padding:"5px 11px",fontSize:11}}>{copied?"✓ Copied":"📋 Copy"}</button>
          </div>
        </div>
        <textarea value={editedText} onChange={e=>setEditedText(e.target.value)}
          style={{width:"100%",minHeight:200,padding:14,background:D.input,border:"1px solid "+D.inputBorder,borderRadius:12,color:D.text,fontSize:13,fontFamily:"Outfit,sans-serif",resize:"vertical",lineHeight:1.75,outline:"none"}}/>
        <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
          <button onClick={()=>downloadFile(editedText,fileInfo.ext)} style={solidBtn("#06d6a0")}>⬇️ Download as .{fileInfo.ext}</button>
          <button onClick={()=>setEditedText(extractedText)} style={{...outBtn("#6b6b85"),padding:"8px 14px",fontSize:12}}>↺ Reset</button>
        </div>
      </div>

      <div style={{background:D.bg,border:"1px solid "+D.border,borderRadius:16,padding:20}}>
        <div style={{fontSize:12,fontWeight:700,color:D.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:14}}>💡 Smart Suggestions</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:10}}>
          {SUGGESTIONS.map(s=>(
            <button key={s.id} onClick={()=>runAction(ACTIONS.find(a=>a.tool===s.tool)||ACTIONS[2],s.prompt)} disabled={loading}
              style={{padding:"13px 15px",background:"rgba(139,92,246,0.06)",border:"1px solid rgba(139,92,246,0.14)",borderRadius:12,cursor:loading?"not-allowed":"pointer",textAlign:"left",opacity:loading?.55:1,transition:"all .2s"}}>
              <div style={{fontSize:20,marginBottom:7}}>{s.icon}</div>
              <div style={{fontSize:13,fontWeight:600,color:D.text}}>{s.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{background:D.bg,border:"1px solid "+D.border,borderRadius:16,padding:20}}>
        <div style={{fontSize:12,fontWeight:700,color:D.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:14}}>⚡ AI Processing</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
          {ACTIONS.map(a=>(
            <button key={a.id} onClick={()=>runAction(a)} disabled={loading}
              style={{padding:"15px 16px",background:a.color+"0e",border:`1px solid ${a.color}28`,borderRadius:12,cursor:loading?"not-allowed":"pointer",textAlign:"left",opacity: loading && activeAction !== a.id ? 0.5 : 1,transition:"all .2s",position:"relative",overflow:"hidden"}}>
              {loading&&activeAction===a.id&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${a.color},transparent,${a.color})`,backgroundSize:"200% 100%",animation:"shimmer 1.2s infinite"}}/>}
              <div style={{fontSize:22,marginBottom:8}}>{loading&&activeAction===a.id?"⏳":a.icon}</div>
              <div style={{fontSize:13,fontWeight:700,color:D.text,marginBottom:3}}>{a.label}</div>
              <div style={{fontSize:11,color:D.muted}}>{a.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {loading&&<div style={{background:"rgba(139,92,246,0.06)",border:"1px solid rgba(139,92,246,0.18)",borderRadius:12,padding:"16px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <div style={{width:10,height:10,borderRadius:"50%",background:"#8b5cf6",animation:"pulse 1s infinite",flexShrink:0}}/>
          <span style={{fontSize:13,fontWeight:600,color:"#a78bfa"}}>AI is processing…</span>
        </div>
        <div style={{height:6,background:"rgba(139,92,246,0.12)",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",background:"linear-gradient(90deg,#8b5cf6,#f97316,#8b5cf6)",backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite",borderRadius:99}}/>
        </div>
      </div>}
      {error&&<div style={{padding:"12px 16px",background:"rgba(220,38,38,0.08)",border:"1px solid rgba(220,38,38,0.22)",borderRadius:12,fontSize:13,color:"#fca5a5"}}>⚠️ {error}</div>}
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {toast&&<div style={{position:"fixed",bottom:24,right:24,background:"#1a1a2e",border:"1px solid rgba(139,92,246,0.45)",borderRadius:12,padding:"12px 20px",fontSize:14,color:"#e4e4f0",zIndex:9999}}>{toast}</div>}
      <div style={{display:"flex",gap:9,flexWrap:"wrap",alignItems:"center"}}>
        <button onClick={()=>setStage("ready")} style={{...outBtn("#6b6b85"),padding:"9px 16px"}}>← Back</button>
        <button onClick={()=>{setStage("upload");setFileInfo(null);setExtractedText("");setEditedText("");setResult("");}} style={{...outBtn("#dc2626"),padding:"9px 16px"}}>🗑 New File</button>
        <span style={{fontSize:12,color:D.muted,marginLeft:"auto"}}>{fileInfo?.name}</span>
      </div>
      <div style={{background:D.bg,border:"1px solid rgba(139,92,246,0.3)",borderRadius:16,padding:22}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:9,height:9,borderRadius:"50%",background:"#06d6a0",boxShadow:"0 0 7px #06d6a0"}}/>
            <span style={{fontSize:13,fontWeight:700,color:"#06d6a0"}}>✨ Result — Edit Before Downloading</span>
          </div>
          <span style={{fontSize:11,color:D.muted}}>{wc(result).toLocaleString()} words · {result.length.toLocaleString()} chars</span>
        </div>
        <textarea value={result} onChange={e=>setResult(e.target.value)}
          style={{width:"100%",minHeight:340,padding:16,background:D.input,border:"1px solid "+D.inputBorder,borderRadius:12,color:D.text,fontSize:14,fontFamily:"Outfit,sans-serif",resize:"vertical",lineHeight:1.8,outline:"none"}}/>
      </div>
      {showPreview&&<div style={{background:D.bg,border:"1px solid "+D.border,borderRadius:16,padding:20}}>
        <div style={{fontSize:12,fontWeight:700,color:D.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:12}}>👁 Preview</div>
        <div style={{background:D.input,borderRadius:12,padding:20,fontSize:14,lineHeight:1.8,color:D.text,whiteSpace:"pre-wrap",maxHeight:380,overflowY:"auto",border:"1px solid "+D.inputBorder}}>{result}</div>
      </div>}
      <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
        <button onClick={()=>downloadFile(result,fileInfo.ext)} style={solidBtn("#8b5cf6")}>⬇️ Download as .{fileInfo.ext}</button>
        <button onClick={()=>copyText(result)} style={solidBtn("#06d6a0")}>{copied?"✓ Copied!":"📋 Copy"}</button>
        <button onClick={()=>setShowPreview(p=>!p)} style={outBtn("#4361ee")}>{showPreview?"🙈 Hide":"👁 Preview"}</button>
        <button onClick={()=>{setStage("ready");setResult("");}} style={outBtn("#6b6b85")}>🔄 New Action</button>
      </div>
      <div style={{background:D.bg,border:"1px solid "+D.border,borderRadius:14,padding:18}}>
        <div style={{fontSize:12,fontWeight:700,color:D.muted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:12}}>💡 Further Improve</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {SUGGESTIONS.slice(0,4).map(s=>(
            <button key={s.id} onClick={()=>{setEditedText(result);setResult("");setStage("ready");setTimeout(()=>runAction(ACTIONS.find(a=>a.tool===s.tool)||ACTIONS[2],s.prompt),100);}}
              style={{...outBtn(s.id==="grammar2"?"#06d6a0":s.id.includes("human")||s.id.includes("reduce")?"#ec4899":"#8b5cf6"),fontSize:12,padding:"8px 14px"}}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>
      {error&&<div style={{padding:"12px 16px",background:"rgba(220,38,38,0.08)",border:"1px solid rgba(220,38,38,0.22)",borderRadius:12,fontSize:13,color:"#fca5a5"}}>⚠️ {error}</div>}
    </div>
  );
}