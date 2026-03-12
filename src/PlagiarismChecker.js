import { useState } from "react";

export default function PlagiarismChecker({ darkMode }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
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
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(",")[1];
      try {
        const response = await fetch("https://toolplanetai-backend.onrender.com/api/extract", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ file:base64, mediaType:f.type, fileName:f.name })
        });
        const data = await response.json();
        if (data.result) setText(data.result);
      } catch(e) { setText("Could not read file."); }
      setFileLoading(false);
    };
    reader.readAsDataURL(f);
  };
  const check = async () => {
    if (!text.trim()) return;
    setLoading(true); setResult(null);
    try {
      const prompt = `You are an expert plagiarism detection system. Analyze this text for potential plagiarism and return ONLY a JSON object:
{
  "plagiarism_percentage": 23,
  "unique_percentage": 77,
  "risk_level": "Low/Medium/High",
  "verdict": "Mostly Original",
  "sentences": [
    {"text": "exact sentence", "risk": "High/Medium/Low", "reason": "why flagged", "suggestion": "how to rewrite it"}
  ],
  "common_phrases": ["phrase1", "phrase2"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "overall_feedback": "2 sentence overall feedback"
}
Text: ${text}`;
      const res = await fetch("https://toolplanetai-backend.onrender.com/api/ai", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ tool:"summarize", input:prompt })
      });
      const data = await res.json();
      const clean = data.result.replace(/```json|```/g,"").trim();
      setResult(JSON.parse(clean));
    } catch(e) { setResult({error:"Check failed. Try again."}); }
    setLoading(false);
  };

  const getRiskColor = (risk) => risk==="High"?"#dc2626":risk==="Medium"?"#eab308":"#06d6a0";

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <div style={{width:46,height:46,borderRadius:13,background:"linear-gradient(135deg,#f97316,#dc2626)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📝</div>
        <div>
          <h2 style={{fontSize:22,fontWeight:800,margin:0,color:D.text}}>Plagiarism Checker</h2>
          <p style={{color:D.muted,fontSize:12,margin:0}}>Check originality • Highlight risky sentences • Get rewrite suggestions</p>
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
        placeholder="Paste your text to check for plagiarism..."
        style={{width:"100%",minHeight:180,padding:16,background:D.input,border:`1.5px solid ${D.inputBorder}`,borderRadius:14,color:D.text,fontSize:14,resize:"vertical",outline:"none",boxSizing:"border-box",lineHeight:1.6,fontFamily:"inherit"}}
      />
      <button onClick={check} disabled={!text.trim()||loading}
        style={{width:"100%",padding:15,border:"none",borderRadius:12,background:!text.trim()?"rgba(255,255,255,0.04)":"linear-gradient(135deg,#f97316,#dc2626)",color:!text.trim()?"#555":"#fff",fontSize:15,fontWeight:700,cursor:"pointer",marginTop:12}}>
        {loading?"⏳ Checking...":"🔍 Check Plagiarism"}
      </button>

      {result && !result.error && (
        <div style={{marginTop:24}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:20}}>
            <div style={{padding:20,background:D.card,border:`1px solid ${D.border}`,borderRadius:16,textAlign:"center"}}>
              <div style={{fontSize:11,color:D.muted,fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Plagiarism</div>
              <div style={{fontSize:42,fontWeight:900,color:getRiskColor(result.risk_level)}}>{result.plagiarism_percentage}%</div>
            </div>
            <div style={{padding:20,background:D.card,border:`1px solid ${D.border}`,borderRadius:16,textAlign:"center"}}>
              <div style={{fontSize:11,color:D.muted,fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Unique</div>
              <div style={{fontSize:42,fontWeight:900,color:"#06d6a0"}}>{result.unique_percentage}%</div>
            </div>
            <div style={{padding:20,background:D.card,border:`1px solid ${D.border}`,borderRadius:16,textAlign:"center"}}>
              <div style={{fontSize:11,color:D.muted,fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Risk</div>
              <div style={{fontSize:22,fontWeight:800,color:getRiskColor(result.risk_level),marginTop:8}}>{result.risk_level}</div>
            </div>
            <div style={{padding:20,background:D.card,border:`1px solid ${D.border}`,borderRadius:16,textAlign:"center"}}>
              <div style={{fontSize:11,color:D.muted,fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Verdict</div>
              <div style={{fontSize:13,fontWeight:700,color:D.text,marginTop:8}}>{result.verdict}</div>
            </div>
          </div>

          <div style={{padding:16,background:darkMode?"rgba(0,0,0,0.2)":"#f8f8ff",border:`1px solid ${D.border}`,borderRadius:14,marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:D.text,marginBottom:12}}>📄 Sentence Analysis</div>
            {result.sentences?.map((s,i)=>(
              <div key={i} style={{marginBottom:12,padding:12,background:D.card,border:`1px solid ${getRiskColor(s.risk)}30`,borderRadius:10,borderLeft:`3px solid ${getRiskColor(s.risk)}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                  <p style={{margin:0,fontSize:13,color:D.text,lineHeight:1.6,flex:1}}>{s.text}</p>
                  <span style={{fontSize:11,fontWeight:700,color:getRiskColor(s.risk),background:`${getRiskColor(s.risk)}15`,padding:"2px 8px",borderRadius:99,flexShrink:0}}>{s.risk} Risk</span>
                </div>
                <div style={{fontSize:11,color:D.muted,marginBottom:4}}>⚠ {s.reason}</div>
                {s.risk!=="Low" && <div style={{fontSize:11,color:"#06d6a0"}}>💡 Suggestion: {s.suggestion}</div>}
              </div>
            ))}
          </div>

          {result.common_phrases?.length > 0 && (
            <div style={{padding:16,background:"rgba(220,38,38,0.05)",border:"1px solid rgba(220,38,38,0.15)",borderRadius:14,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:"#f87171",marginBottom:10}}>⚠️ Common/Flagged Phrases</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {result.common_phrases.map((p,i)=><span key={i} style={{padding:"4px 10px",background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.2)",borderRadius:99,fontSize:12,color:"#f87171"}}>"{p}"</span>)}
              </div>
            </div>
          )}

          <div style={{padding:16,background:"rgba(6,214,160,0.05)",border:"1px solid rgba(6,214,160,0.15)",borderRadius:14,marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:"#06d6a0",marginBottom:10}}>💡 Recommendations</div>
            {result.recommendations?.map((r,i)=><div key={i} style={{fontSize:12,color:D.text,marginBottom:6,display:"flex",gap:6}}><span style={{color:"#06d6a0"}}>✓</span>{r}</div>)}
          </div>

          <div style={{padding:16,background:"rgba(67,97,238,0.05)",border:"1px solid rgba(67,97,238,0.15)",borderRadius:14}}>
            <div style={{fontSize:13,fontWeight:700,color:"#4361ee",marginBottom:8}}>📊 Overall Feedback</div>
            <p style={{fontSize:13,color:D.text,margin:0,lineHeight:1.7}}>{result.overall_feedback}</p>
          </div>
        </div>
      )}
      {result?.error && <div style={{marginTop:16,padding:16,background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.2)",borderRadius:12,color:"#f87171",fontSize:13}}>❌ {result.error}</div>}
    </div>
  );
}
