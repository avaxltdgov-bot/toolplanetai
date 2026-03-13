import { useState } from "react";

export default function SEOOptimizer({ darkMode }) {
  const [content, setContent] = useState("");
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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
          setContent(ev.target.result);
        } else if (ext === "docx" || ext === "doc") {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ arrayBuffer: ev.target.result });
          setContent(result.value || "Could not read file.");
        } else if (ext === "pdf") {
          const base64 = btoa(new Uint8Array(ev.target.result).reduce((d,b)=>d+String.fromCharCode(b),""));
          const response = await fetch("https://toolplanetai-backend.onrender.com/api/extract", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ file:base64, mediaType:f.type, fileName:f.name })
          });
          const data = await response.json();
          setContent(data.result || "Could not read PDF.");
        } else {
          setContent("Unsupported file type. Please upload PDF, Word, or TXT.");
        }
      } catch(err) {
        console.error(err);
        setContent("Could not read file. Please paste text manually.");
      }
      setFileLoading(false);
    };
    if (ext === "txt") reader.readAsText(f);
    else reader.readAsArrayBuffer(f);
  };
  const optimize = async () => {
    if (!content.trim()) return;
    setLoading(true); setResult(null);
    try {
      const prompt = `You are an expert SEO content optimizer. Analyze this content and return ONLY a JSON object:
{
  "seo_score": 72,
  "keyword_density": 2.3,
  "readability_score": 85,
  "title_suggestion": "SEO optimized title",
  "meta_description": "150 char meta description",
  "optimized_content": "the full rewritten SEO-optimized version of the content",
  "keywords_found": ["keyword1", "keyword2"],
  "missing_keywords": ["keyword to add1", "keyword to add2"],
  "improvements": [
    {"issue": "issue description", "fix": "how to fix it", "priority": "High/Medium/Low"}
  ],
  "heading_suggestions": ["H1: suggestion", "H2: suggestion"],
  "internal_link_suggestions": ["topic to link to"],
  "word_count": 250,
  "estimated_read_time": "2 min"
}
Target keyword: ${keyword || "not specified"}
Content: ${content}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);
      const res = await fetch("https://toolplanetai-backend.onrender.com/api/ai", {
        signal: controller.signal,
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ tool:"summarize", input:prompt })
      });
      const data = await res.json();
      console.log("RAW:", data.result);
      const clean = (data.result||"").replace(/```json|```/g,"").trim();
      const jsonStart = clean.indexOf("{");
      const jsonEnd = clean.lastIndexOf("}");
      if (jsonStart===-1||jsonEnd===-1) throw new Error("No JSON: "+clean.slice(0,100));
      setResult(JSON.parse(clean.slice(jsonStart,jsonEnd+1)));
    } catch(e) { console.error("TOOL ERROR:", e.message, e); setResult({error:"Optimization failed: " + e.message}); }
    setLoading(false);
  };

  const copy = (text) => {
    try { navigator.clipboard.writeText(text); }
    catch(e) { const el=document.createElement("textarea");el.value=text;document.body.appendChild(el);el.select();document.execCommand("copy");document.body.removeChild(el); }
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  const getPriorityColor = (p) => p==="High"?"#dc2626":p==="Medium"?"#eab308":"#06d6a0";
  const getScoreColor = (s) => s>=80?"#06d6a0":s>=60?"#eab308":"#dc2626";

  const ScoreBar = ({score,color}) => (
    <div style={{background:darkMode?"rgba(255,255,255,0.06)":"#eee",borderRadius:99,height:8,overflow:"hidden",marginTop:4}}>
      <div style={{width:`${score}%`,height:"100%",background:color,borderRadius:99}}/>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <div style={{width:46,height:46,borderRadius:13,background:"linear-gradient(135deg,#eab308,#f97316)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🎯</div>
        <div>
          <h2 style={{fontSize:22,fontWeight:800,margin:0,color:D.text}}>SEO Content Optimizer</h2>
          <p style={{color:D.muted,fontSize:12,margin:0}}>Optimize content for search engines • Get ranked higher on Google</p>
        </div>
      </div>

      <div style={{marginBottom:12}}>
        <label style={{fontSize:11,color:D.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6}}>Target Keyword (optional)</label>
        <input value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="e.g. best AI tools 2025"
          style={{width:"100%",padding:"12px 14px",background:D.input,border:`1.5px solid ${D.inputBorder}`,borderRadius:10,color:D.text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        <label style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"rgba(124,58,237,0.1)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:600,color:"#a78bfa"}}>
          {fileLoading?"⏳ Reading...":"📄 Upload PDF/Word/Image"}
          <input type="file" accept=".pdf,.doc,.docx,.txt,image/*" onChange={handleFileUpload} style={{display:"none"}}/>
        </label>
        <div style={{fontSize:11,color:D.muted,display:"flex",alignItems:"center"}}>or paste text below</div>
      </div>
      <textarea value={content} onChange={e=>setContent(e.target.value)}
        placeholder="Paste your blog post, article, or web content here..."
        style={{width:"100%",minHeight:200,padding:16,background:D.input,border:`1.5px solid ${D.inputBorder}`,borderRadius:14,color:D.text,fontSize:14,resize:"vertical",outline:"none",boxSizing:"border-box",lineHeight:1.6,fontFamily:"inherit"}}
      />
      <button onClick={optimize} disabled={!content.trim()||loading}
        style={{width:"100%",padding:15,border:"none",borderRadius:12,background:!content.trim()?"rgba(255,255,255,0.04)":"linear-gradient(135deg,#eab308,#f97316)",color:!content.trim()?"#555":"#fff",fontSize:15,fontWeight:700,cursor:"pointer",marginTop:12}}>
        {loading?"⏳ Optimizing...":"🎯 Optimize for SEO"}
      </button>

      {result && !result.error && (
        <div style={{marginTop:24}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:20}}>
            {[
              {label:"SEO Score",value:`${result.seo_score}%`,color:getScoreColor(result.seo_score)},
              {label:"Readability",value:`${result.readability_score}%`,color:getScoreColor(result.readability_score)},
              {label:"Keyword Density",value:`${result.keyword_density}%`,color:"#4361ee"},
              {label:"Read Time",value:result.estimated_read_time,color:"#8b5cf6"},
            ].map(s=>(
              <div key={s.label} style={{padding:16,background:D.card,border:`1px solid ${D.border}`,borderRadius:16,textAlign:"center"}}>
                <div style={{fontSize:10,color:D.muted,fontWeight:600,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>{s.label}</div>
                <div style={{fontSize:24,fontWeight:900,color:s.color}}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:16}}>
            <div style={{padding:16,background:D.card,border:`1px solid ${D.border}`,borderRadius:14}}>
              <div style={{fontSize:12,fontWeight:700,color:D.muted,marginBottom:8}}>SEO Score</div>
              <ScoreBar score={result.seo_score} color={getScoreColor(result.seo_score)}/>
            </div>
            <div style={{padding:16,background:D.card,border:`1px solid ${D.border}`,borderRadius:14}}>
              <div style={{fontSize:12,fontWeight:700,color:D.muted,marginBottom:8}}>Readability</div>
              <ScoreBar score={result.readability_score} color={getScoreColor(result.readability_score)}/>
            </div>
          </div>

          <div style={{padding:16,background:"rgba(6,214,160,0.05)",border:"1px solid rgba(6,214,160,0.15)",borderRadius:14,marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:"#06d6a0",marginBottom:8}}>📌 Suggested Title</div>
            <p style={{fontSize:14,color:D.text,margin:0,fontWeight:600}}>{result.title_suggestion}</p>
          </div>

          <div style={{padding:16,background:"rgba(67,97,238,0.05)",border:"1px solid rgba(67,97,238,0.15)",borderRadius:14,marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:"#4361ee",marginBottom:8}}>📝 Meta Description</div>
            <p style={{fontSize:13,color:D.text,margin:0,lineHeight:1.6}}>{result.meta_description}</p>
          </div>

          <div style={{padding:16,background:D.card,border:`1px solid ${D.border}`,borderRadius:14,marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:D.text,marginBottom:12}}>🔧 Issues & Fixes</div>
            {result.improvements?.map((imp,i)=>(
              <div key={i} style={{marginBottom:10,padding:10,background:darkMode?"rgba(0,0,0,0.2)":"#f8f8ff",borderRadius:8,borderLeft:`3px solid ${getPriorityColor(imp.priority)}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,color:D.text,fontWeight:600}}>{imp.issue}</span>
                  <span style={{fontSize:10,fontWeight:700,color:getPriorityColor(imp.priority),background:`${getPriorityColor(imp.priority)}15`,padding:"2px 8px",borderRadius:99}}>{imp.priority}</span>
                </div>
                <div style={{fontSize:11,color:"#06d6a0"}}>💡 {imp.fix}</div>
              </div>
            ))}
          </div>

          <div style={{padding:16,background:D.card,border:"1px solid rgba(139,92,246,0.2)",borderRadius:14,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:"#8b5cf6"}}>✨ SEO-Optimized Content</div>
              <button onClick={()=>copy(result.optimized_content)} style={{padding:"6px 12px",borderRadius:8,border:"1px solid rgba(139,92,246,0.3)",background:"rgba(139,92,246,0.1)",color:"#c4b5fd",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                {copied?"✓ Copied!":"📋 Copy"}
              </button>
            </div>
            <div style={{background:darkMode?"rgba(0,0,0,0.3)":"rgba(0,0,0,0.03)",borderRadius:10,padding:16,fontSize:13,lineHeight:1.8,color:D.text,whiteSpace:"pre-wrap"}}>{result.optimized_content}</div>
          </div>
        </div>
      )}
      {result?.error && <div style={{marginTop:16,padding:16,background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.2)",borderRadius:12,color:"#f87171",fontSize:13}}>❌ {result.error}</div>}
    </div>
  );
}
