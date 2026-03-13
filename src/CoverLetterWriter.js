import { useState } from "react";

export default function CoverLetterWriter({ darkMode }) {
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");
  const [tone, setTone] = useState("professional");
  const [result, setResult] = useState("");
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
          setExperience(ev.target.result);
        } else if (ext === "docx" || ext === "doc") {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ arrayBuffer: ev.target.result });
          setExperience(result.value || "Could not read file.");
        } else if (ext === "pdf") {
          const base64 = btoa(new Uint8Array(ev.target.result).reduce((d,b)=>d+String.fromCharCode(b),""));
          const response = await fetch("https://toolplanetai-backend.onrender.com/api/extract", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ file:base64, mediaType:f.type, fileName:f.name })
          });
          const data = await response.json();
          setExperience(data.result || "Could not read PDF.");
        } else {
          setExperience("Unsupported file type. Please upload PDF, Word, or TXT.");
        }
      } catch(err) {
        console.error(err);
        setExperience("Could not read file. Please paste text manually.");
      }
      setFileLoading(false);
    };
    if (ext === "txt") reader.readAsText(f);
    else reader.readAsArrayBuffer(f);
  };
  const generate = async () => {
    if (!jobTitle.trim()) return;
    setLoading(true); setResult("");
    try {
      const prompt = `Write a compelling, ${tone} cover letter for:
Job Title: ${jobTitle}
Company: ${company || "the company"}
My Skills: ${skills || "relevant skills"}
My Experience: ${experience || "relevant experience"}

Write a complete, ready-to-send cover letter. Make it personal, engaging, and tailored. Include opening, body paragraphs highlighting skills and fit, and a strong closing. Return only the cover letter text.`;
      const res = await fetch("https://toolplanetai-backend.onrender.com/api/ai", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ tool:"rewrite", input:prompt })
      });
      const data = await res.json();
      setResult(data.result);
    } catch(e) { setResult("Failed. Please try again."); }
    setLoading(false);
  };

  const copy = () => {
    try { navigator.clipboard.writeText(result); }
    catch(e) { const el=document.createElement("textarea");el.value=result;document.body.appendChild(el);el.select();document.execCommand("copy");document.body.removeChild(el); }
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  const inputStyle = { width:"100%", padding:"12px 14px", background:D.input, border:`1.5px solid ${D.inputBorder}`, borderRadius:10, color:D.text, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <div style={{width:46,height:46,borderRadius:13,background:"linear-gradient(135deg,#14b8a6,#4361ee)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📄</div>
        <div>
          <h2 style={{fontSize:22,fontWeight:800,margin:0,color:D.text}}>Cover Letter Writer</h2>
          <p style={{color:D.muted,fontSize:12,margin:0}}>AI-powered cover letters that get interviews</p>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12,marginBottom:12}}>
        <div>
          <label style={{fontSize:11,color:D.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6}}>Job Title *</label>
          <input value={jobTitle} onChange={e=>setJobTitle(e.target.value)} placeholder="e.g. Software Engineer" style={inputStyle}/>
        </div>
        <div>
          <label style={{fontSize:11,color:D.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6}}>Company Name</label>
          <input value={company} onChange={e=>setCompany(e.target.value)} placeholder="e.g. Google" style={inputStyle}/>
        </div>
      </div>

      <div style={{marginBottom:12}}>
        <label style={{fontSize:11,color:D.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6}}>Your Key Skills</label>
        <input value={skills} onChange={e=>setSkills(e.target.value)} placeholder="e.g. React, Node.js, 3 years experience, team leadership" style={inputStyle}/>
      </div>

      <div style={{marginBottom:12}}>
        <label style={{fontSize:11,color:D.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6}}>Relevant Experience</label>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <label style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:"rgba(124,58,237,0.1)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:600,color:"#a78bfa"}}>
            {fileLoading?"⏳ Reading...":"📄 Upload CV/Resume"}
            <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileUpload} style={{display:"none"}}/>
          </label>
        </div>
        <textarea value={experience} onChange={e=>setExperience(e.target.value)} placeholder="Brief description of your relevant experience and achievements..."
          style={{...inputStyle,minHeight:100,resize:"vertical"}}/>
      </div>

      <div style={{marginBottom:16}}>
        <label style={{fontSize:11,color:D.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:8}}>Tone</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {["professional","enthusiastic","confident","creative","formal"].map(t=>(
            <button key={t} onClick={()=>setTone(t)} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${tone===t?"#14b8a6":D.border}`,background:tone===t?"rgba(20,184,166,0.15)":"transparent",color:tone===t?"#14b8a6":D.muted,fontSize:12,fontWeight:tone===t?700:400,cursor:"pointer",textTransform:"capitalize"}}>{t}</button>
          ))}
        </div>
      </div>

      <button onClick={generate} disabled={!jobTitle.trim()||loading}
        style={{width:"100%",padding:15,border:"none",borderRadius:12,background:!jobTitle.trim()?"rgba(255,255,255,0.04)":"linear-gradient(135deg,#14b8a6,#4361ee)",color:!jobTitle.trim()?"#555":"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>
        {loading?"⏳ Writing Cover Letter...":"✍️ Generate Cover Letter"}
      </button>

      {result && (
        <div style={{marginTop:20,background:D.card,border:"1px solid rgba(20,184,166,0.2)",borderRadius:16,padding:22}}>
          <div style={{fontSize:12,fontWeight:700,color:"#14b8a6",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>✅ Your Cover Letter</div>
          <div style={{background:darkMode?"rgba(0,0,0,0.3)":"rgba(0,0,0,0.03)",borderRadius:12,padding:18,fontSize:14,lineHeight:1.9,color:D.text,whiteSpace:"pre-wrap",fontFamily:"Georgia,serif"}}>{result}</div>
          <button onClick={copy} style={{marginTop:12,padding:"10px 18px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,background:copied?"rgba(6,214,160,0.1)":"rgba(20,184,166,0.1)",border:copied?"1px solid rgba(6,214,160,0.25)":"1px solid rgba(20,184,166,0.25)",color:copied?"#06d6a0":"#14b8a6"}}>
            {copied?"✓ Copied!":"📋 Copy Cover Letter"}
          </button>
        </div>
      )}
    </div>
  );
}
