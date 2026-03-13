import { useState } from "react";

export default function AIDetector({ darkMode }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [humanizing, setHumanizing] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);

  const D = darkMode ? {
    text:"#e4e4f0", muted:"#9090b0", border:"rgba(255,255,255,0.08)",
    card:"rgba(255,255,255,0.03)", input:"rgba(255,255,255,0.025)", inputBorder:"rgba(255,255,255,0.08)"
  } : {
    text:"#1a1a2e", muted:"#555570", border:"rgba(0,0,0,0.1)",
    card:"#ffffff", input:"#ffffff", inputBorder:"rgba(0,0,0,0.15)"
  };

  const handleFileUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFileLoading(true);
    const ext = f.name.split(".").pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        if (ext === "txt") {
          setText(ev.target.result);
        } else if (ext === "docx" || ext === "doc") {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ arrayBuffer: ev.target.result });
          setText(result.value || "Could not read file.");
        } else if (ext === "pdf") {
          const base64 = btoa(new Uint8Array(ev.target.result).reduce((d,b)=>d+String.fromCharCode(b),""));
          const response = await fetch("https://toolplanetai-backend.onrender.com/api/extract", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ file:base64, mediaType:f.type, fileName:f.name })
          });
          const data = await response.json();
          setText(data.result || "Could not read PDF.");
        } else {
          setText("Unsupported file type. Please upload PDF, Word, or TXT.");
        }
      } catch(err) {
        console.error(err);
        setText("Could not read file. Please paste text manually.");
      }
      setFileLoading(false);
    };
    if (ext === "txt") reader.readAsText(f);
    else reader.readAsArrayBuffer(f);
  };

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true); setResult(null);
    try {
      const prompt = `You are an expert AI content detector. Analyze this text and return ONLY a JSON object:
{
  "ai_percentage": 78,
  "verdict": "Likely AI Written",
  "confidence": "High",
  "sentences": [
    {"text": "exact sentence from text", "ai_score": 90, "reason": "why this seems AI written"},
    {"text": "another sentence", "ai_score": 20, "reason": "why this seems human"}
  ],
  "ai_patterns": ["pattern1", "pattern2"],
  "human_patterns": ["pattern1"],
  "overall_analysis": "2 sentence analysis"
}
Analyze every sentence. Text: ${text}`;
      const res = await fetch("https://toolplanetai-backend.onrender.com/api/ai", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ tool:"summarize", input:prompt })
      });
      const data = await res.json();
      const clean = data.result.replace(/```json|```/g,"").trim();
      const jsonMatch = clean.match(/{[\s\S]*}/);
      if (!jsonMatch) throw new Error("No JSON found");
      setResult(JSON.parse(jsonMatch[0]));
    } catch(e) { setResult({error:"Analysis failed. Try again."}); }
    setLoading(false);
  };

  const humanizeSentence = async (idx, sentence) => {
    setHumanizing(idx);
    try {
      const res = await fetch("https://toolplanetai-backend.onrender.com/api/ai", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ tool:"rewrite", input:`Rewrite this one sentence to sound completely human-written, natural, and conversational. Remove any AI patterns. Return only the rewritten sentence:\n\n${sentence}` })
      });
      const data = await res.json();
      if (data.result) {
        setResult(prev => ({
          ...prev,
          sentences: prev.sentences.map((s,i) => i===idx ? {...s, humanized:data.result.trim(), ai_score:Math.max(5, s.ai_score-60)} : s)
        }));
      }
    } catch(e) {}
    setHumanizing(null);
  };

  const getColor = (score) => score >= 70 ? "#dc2626" : score >= 40 ? "#eab308" : "#06d6a0";
  const getLabel = (score) => score >= 70 ? "AI" : score >= 40 ? "Mixed" : "Human";

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <div style={{width:46,height:46,borderRadius:13,background:"linear-gradient(135deg,#dc2626,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🔍</div>
        <div>
          <h2 style={{fontSize:22,fontWeight:800,margin:0,color:D.text}}>AI Content Detector</h2>
          <p style={{color:D.muted,fontSize:12,margin:0}}>Detect AI-written text sentence by sentence • Humanize instantly</p>
        </div>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        <label style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"rgba(124,58,237,0.1)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:600,color:"#a78bfa"}}>
          {fileLoading?"⏳ Reading...":"📄 Upload PDF/Word/Image"}
          <input type="file" accept=".pdf,.doc,.docx,.txt,image/*" onChange={handleFileUpload} style={{display:"none"}}/>
        </label>
        <div style={{fontSize:11,color:D.muted,display:"flex",alignItems:"center"}}>or paste text below</div>
      </div>
      <textarea value={text} onChange={e=>setText(e.target.value)}
        placeholder="Paste any text to detect if it was written by AI..."
        style={{width:"100%",minHeight:180,padding:16,background:D.input,border:`1.5px solid ${D.inputBorder}`,borderRadius:14,color:D.text,fontSize:14,resize:"vertical",outline:"none",boxSizing:"border-box",lineHeight:1.6,fontFamily:"inherit"}}
      />
      <button onClick={analyze} disabled={!text.trim()||loading}
        style={{width:"100%",padding:15,border:"none",borderRadius:12,background:!text.trim()?"rgba(255,255,255,0.04)":"linear-gradient(135deg,#dc2626,#7c3aed)",color:!text.trim()?"#555":"#fff",fontSize:15,fontWeight:700,cursor:"pointer",marginTop:12}}>
        {loading?"⏳ Detecting...":"🔍 Detect AI Content"}
      </button>

      {result && !result.error && (
        <div style={{marginTop:24}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:20}}>
            <div style={{padding:20,background:D.card,border:`1px solid ${D.border}`,borderRadius:16,textAlign:"center"}}>
              <div style={{fontSize:11,color:D.muted,fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>AI Score</div>
              <div style={{fontSize:42,fontWeight:900,color:getColor(result.ai_percentage)}}>{result.ai_percentage}%</div>
            </div>
            <div style={{padding:20,background:D.card,border:`1px solid ${D.border}`,borderRadius:16,textAlign:"center"}}>
              <div style={{fontSize:11,color:D.muted,fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Verdict</div>
              <div style={{fontSize:16,fontWeight:800,color:getColor(result.ai_percentage),marginTop:8}}>{result.verdict}</div>
            </div>
            <div style={{padding:20,background:D.card,border:`1px solid ${D.border}`,borderRadius:16,textAlign:"center"}}>
              <div style={{fontSize:11,color:D.muted,fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Confidence</div>
              <div style={{fontSize:18,fontWeight:800,color:"#4361ee",marginTop:8}}>{result.confidence}</div>
            </div>
          </div>

          <div style={{padding:16,background:darkMode?"rgba(0,0,0,0.2)":"#f8f8ff",border:`1px solid ${D.border}`,borderRadius:14,marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:D.text,marginBottom:12}}>📄 Sentence-by-Sentence Analysis</div>
            <div style={{fontSize:11,color:D.muted,marginBottom:12}}>🔴 AI Written &nbsp; 🟡 Mixed &nbsp; 🟢 Human — Click "Humanize" on any AI sentence</div>
            {result.sentences?.map((s,i) => (
              <div key={i} style={{marginBottom:12,padding:12,background:D.card,border:`1px solid ${getColor(s.ai_score)}30`,borderRadius:10,borderLeft:`3px solid ${getColor(s.ai_score)}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
                  <p style={{margin:"0 0 6px",fontSize:13,color:D.text,lineHeight:1.6,flex:1}}>{s.humanized || s.text}</p>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                    <span style={{fontSize:11,fontWeight:700,color:getColor(s.ai_score),background:`${getColor(s.ai_score)}15`,padding:"2px 8px",borderRadius:99}}>{getLabel(s.ai_score)} {s.ai_score}%</span>
                    {s.ai_score >= 50 && !s.humanized && (
                      <button onClick={()=>humanizeSentence(i,s.text)} disabled={humanizing===i}
                        style={{padding:"4px 10px",borderRadius:8,border:"1px solid rgba(139,92,246,0.3)",background:"rgba(139,92,246,0.1)",color:"#c4b5fd",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                        {humanizing===i?"⏳":"🧑 Humanize"}
                      </button>
                    )}
                    {s.humanized && <span style={{fontSize:11,color:"#06d6a0",fontWeight:600}}>✅ Humanized</span>}
                  </div>
                </div>
                <div style={{fontSize:11,color:D.muted,fontStyle:"italic"}}>{s.reason}</div>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12,marginBottom:16}}>
            {result.ai_patterns?.length > 0 && (
              <div style={{padding:16,background:"rgba(220,38,38,0.05)",border:"1px solid rgba(220,38,38,0.15)",borderRadius:14}}>
                <div style={{fontSize:13,fontWeight:700,color:"#f87171",marginBottom:10}}>🤖 AI Patterns Found</div>
                {result.ai_patterns.map((p,i)=><div key={i} style={{fontSize:12,color:D.text,marginBottom:6,display:"flex",gap:6}}><span style={{color:"#dc2626"}}>⚠</span>{p}</div>)}
              </div>
            )}
            {result.human_patterns?.length > 0 && (
              <div style={{padding:16,background:"rgba(6,214,160,0.05)",border:"1px solid rgba(6,214,160,0.15)",borderRadius:14}}>
                <div style={{fontSize:13,fontWeight:700,color:"#06d6a0",marginBottom:10}}>✅ Human Patterns</div>
                {result.human_patterns.map((p,i)=><div key={i} style={{fontSize:12,color:D.text,marginBottom:6,display:"flex",gap:6}}><span style={{color:"#06d6a0"}}>✓</span>{p}</div>)}
              </div>
            )}
          </div>

          <div style={{padding:16,background:"rgba(67,97,238,0.05)",border:"1px solid rgba(67,97,238,0.15)",borderRadius:14}}>
            <div style={{fontSize:13,fontWeight:700,color:"#4361ee",marginBottom:8}}>📊 Overall Analysis</div>
            <p style={{fontSize:13,color:D.text,margin:0,lineHeight:1.7}}>{result.overall_analysis}</p>
          </div>
        </div>
      )}
      {result?.error && <div style={{marginTop:16,padding:16,background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.2)",borderRadius:12,color:"#f87171",fontSize:13}}>❌ {result.error}</div>}
    </div>
  );
}
