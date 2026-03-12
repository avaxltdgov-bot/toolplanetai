import { useState } from "react";

export default function AssignmentChecker({ darkMode }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("checker");
  const [humanizeText, setHumanizeText] = useState("");
  const [humanizeResult, setHumanizeResult] = useState("");
  const [humanizeLoading, setHumanizeLoading] = useState(false);

  const D = darkMode ? {
    text: "#e4e4f0", muted: "#9090b0", border: "rgba(255,255,255,0.08)",
    card: "rgba(255,255,255,0.03)", bg: "rgba(255,255,255,0.05)",
    input: "rgba(255,255,255,0.025)", inputBorder: "rgba(255,255,255,0.08)"
  } : {
    text: "#1a1a2e", muted: "#555570", border: "rgba(0,0,0,0.1)",
    card: "#ffffff", bg: "#f8f8ff",
    input: "#ffffff", inputBorder: "rgba(0,0,0,0.15)"
  };

  const handleFileUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f.name);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(",")[1];
      try {
        const response = await fetch("https://toolplanetai-backend.onrender.com/api/extract", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: base64, mediaType: f.type, fileName: f.name })
        });
        const data = await response.json();
        if (data.result) setText(data.result);
      } catch(err) { setText("Could not read file."); }
    };
    reader.readAsDataURL(f);
  };

  const runCheck = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const prompt = `You are an expert academic evaluator. Analyze this assignment thoroughly and return ONLY a JSON object with this exact structure:
{
  "grade": "A+/A/A-/B+/B/B-/C+/C/C-/D/F",
  "score": 92,
  "ai_probability": 15,
  "plagiarism_risk": "Low/Medium/High",
  "plagiarism_details": "Brief explanation",
  "is_ai_written": false,
  "ai_indicators": ["list of AI writing patterns found or empty array"],
  "human_indicators": ["list of human writing traits found"],
  "grammar_score": 90,
  "grammar_issues": ["issue1", "issue2"],
  "structure_score": 85,
  "originality_score": 88,
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "detailed_feedback": "2-3 sentences of detailed feedback",
  "suggested_changes": ["specific change 1", "specific change 2", "specific change 3"],
  "word_count": 250,
  "reading_level": "High School/Undergraduate/Graduate/Professional"
}

Assignment to analyze:
${text}`;

      const res = await fetch("https://toolplanetai-backend.onrender.com/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "summarize", input: prompt })
      });
      const data = await res.json();
      const clean = data.result.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
    } catch(err) {
      setResult({ error: "Analysis failed. Please try again." });
    }
    setLoading(false);
  };

  const runHumanize = async () => {
    if (!humanizeText.trim()) return;
    setHumanizeLoading(true);
    setHumanizeResult("");
    try {
      const prompt = `Rewrite this text to sound completely human-written. Make it:
- Use natural, varied sentence lengths (mix short and long)
- Add personal touches, opinions, and natural flow
- Include minor imperfections that humans naturally make
- Use conversational transitions
- Vary vocabulary naturally (avoid repetitive AI patterns)
- Sound like a real student wrote it
- Keep the same meaning and content
- Remove any robotic or overly formal AI patterns

Text to humanize:
${humanizeText}

Return ONLY the rewritten text, nothing else.`;

      const res = await fetch("https://toolplanetai-backend.onrender.com/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "rewrite", input: prompt })
      });
      const data = await res.json();
      setHumanizeResult(data.result);
    } catch(err) {
      setHumanizeResult("Failed. Please try again.");
    }
    setHumanizeLoading(false);
  };

  const getGradeColor = (grade) => {
    if (!grade) return "#888";
    if (grade.startsWith("A")) return "#06d6a0";
    if (grade.startsWith("B")) return "#4361ee";
    if (grade.startsWith("C")) return "#eab308";
    if (grade.startsWith("D")) return "#f97316";
    return "#dc2626";
  };

  const getAiColor = (prob) => {
    if (prob <= 20) return "#06d6a0";
    if (prob <= 50) return "#eab308";
    return "#dc2626";
  };

  const getPlagColor = (risk) => {
    if (risk === "Low") return "#06d6a0";
    if (risk === "Medium") return "#eab308";
    return "#dc2626";
  };

  const ScoreBar = ({ score, color }) => (
    <div style={{ background: darkMode ? "rgba(255,255,255,0.06)" : "#eee", borderRadius: 99, height: 8, overflow: "hidden", marginTop: 4 }}>
      <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 99, transition: "width 1s ease" }}/>
    </div>
  );

  const tabs = [
    { id: "checker", label: "📊 Assignment Checker", desc: "Grade, plagiarism & AI detection" },
    { id: "humanize", label: "🧑 Humanize AI Text", desc: "Make AI text sound human" }
  ];

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <div style={{ width:46, height:46, borderRadius:13, background:"linear-gradient(135deg,#7c3aed,#e91e8c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🎓</div>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, margin:0, color:D.text }}>Advanced Assignment Tool</h2>
          <p style={{ color:D.muted, fontSize:12, margin:0 }}>AI Detection • Plagiarism Check • Grading • Humanizer</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{
            padding:"10px 18px", borderRadius:10, border:`1px solid ${activeTab===tab.id?"#7c3aed":D.border}`,
            background:activeTab===tab.id?"rgba(124,58,237,0.15)":"transparent",
            color:activeTab===tab.id?"#c4b5fd":D.muted, fontSize:13, fontWeight:activeTab===tab.id?700:400, cursor:"pointer"
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* CHECKER TAB */}
      {activeTab==="checker" && (
        <div>
          <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap" }}>
            <label style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"rgba(124,58,237,0.1)", border:"1px solid rgba(124,58,237,0.2)", borderRadius:10, cursor:"pointer", fontSize:12, fontWeight:600, color:"#a78bfa" }}>
              📄 Upload PDF/Word
              <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileUpload} style={{ display:"none" }}/>
            </label>
            {file && <span style={{ color:"#06d6a0", fontSize:12, display:"flex", alignItems:"center" }}>✅ {file}</span>}
          </div>

          <textarea value={text} onChange={e=>setText(e.target.value)}
            placeholder="Paste your assignment text here or upload a file above..."
            style={{ width:"100%", minHeight:180, padding:16, background:D.input, border:`1.5px solid ${D.inputBorder}`, borderRadius:14, color:D.text, fontSize:14, resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.6, fontFamily:"inherit" }}
          />

          <button onClick={runCheck} disabled={!text.trim()||loading}
            style={{ width:"100%", padding:15, border:"none", borderRadius:12, background:!text.trim()?"rgba(255,255,255,0.04)":"linear-gradient(135deg,#7c3aed,#e91e8c)", color:!text.trim()?"#555":"#fff", fontSize:15, fontWeight:700, cursor:!text.trim()||loading?"not-allowed":"pointer", marginTop:12 }}>
            {loading?"⏳ Analyzing Assignment...":"🔍 Analyze Assignment"}
          </button>

          {result && !result.error && (
            <div style={{ marginTop:24 }}>
              {/* Top Score Cards */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:20 }}>
                {/* Grade */}
                <div style={{ padding:20, background:D.card, border:`1px solid ${D.border}`, borderRadius:16, textAlign:"center" }}>
                  <div style={{ fontSize:11, color:D.muted, fontWeight:600, marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Grade</div>
                  <div style={{ fontSize:42, fontWeight:900, color:getGradeColor(result.grade) }}>{result.grade}</div>
                  <div style={{ fontSize:13, color:D.muted, marginTop:4 }}>{result.score}/100</div>
                </div>
                {/* AI Detection */}
                <div style={{ padding:20, background:D.card, border:`1px solid ${D.border}`, borderRadius:16, textAlign:"center" }}>
                  <div style={{ fontSize:11, color:D.muted, fontWeight:600, marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>AI Written</div>
                  <div style={{ fontSize:36, fontWeight:900, color:getAiColor(result.ai_probability) }}>{result.ai_probability}%</div>
                  <div style={{ fontSize:12, color:getAiColor(result.ai_probability), marginTop:4, fontWeight:600 }}>{result.is_ai_written?"⚠️ AI Detected":"✅ Likely Human"}</div>
                </div>
                {/* Plagiarism */}
                <div style={{ padding:20, background:D.card, border:`1px solid ${D.border}`, borderRadius:16, textAlign:"center" }}>
                  <div style={{ fontSize:11, color:D.muted, fontWeight:600, marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Plagiarism</div>
                  <div style={{ fontSize:32, fontWeight:900, color:getPlagColor(result.plagiarism_risk) }}>{result.plagiarism_risk}</div>
                  <div style={{ fontSize:11, color:D.muted, marginTop:4 }}>Risk Level</div>
                </div>
                {/* Reading Level */}
                <div style={{ padding:20, background:D.card, border:`1px solid ${D.border}`, borderRadius:16, textAlign:"center" }}>
                  <div style={{ fontSize:11, color:D.muted, fontWeight:600, marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Level</div>
                  <div style={{ fontSize:16, fontWeight:800, color:"#4361ee", marginTop:8 }}>{result.reading_level}</div>
                  <div style={{ fontSize:11, color:D.muted, marginTop:4 }}>{result.word_count} words</div>
                </div>
              </div>

              {/* Score Bars */}
              <div style={{ padding:20, background:D.card, border:`1px solid ${D.border}`, borderRadius:16, marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:D.text, marginBottom:16 }}>📊 Detailed Scores</div>
                {[
                  { label:"Overall Score", score:result.score, color:"#7c3aed" },
                  { label:"Grammar", score:result.grammar_score, color:"#06d6a0" },
                  { label:"Structure", score:result.structure_score, color:"#4361ee" },
                  { label:"Originality", score:result.originality_score, color:"#f97316" },
                ].map(s => (
                  <div key={s.label} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:12, color:D.muted }}>{s.label}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:s.color }}>{s.score}%</span>
                    </div>
                    <ScoreBar score={s.score} color={s.color}/>
                  </div>
                ))}
              </div>

              {/* AI Indicators */}
              {result.ai_indicators && result.ai_indicators.length > 0 && (
                <div style={{ padding:20, background:"rgba(220,38,38,0.05)", border:"1px solid rgba(220,38,38,0.15)", borderRadius:16, marginBottom:16 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#f87171", marginBottom:12 }}>🤖 AI Writing Patterns Found</div>
                  {result.ai_indicators.map((item,i) => (
                    <div key={i} style={{ display:"flex", gap:8, marginBottom:6, fontSize:12, color:D.text }}>
                      <span style={{ color:"#dc2626" }}>⚠️</span>{item}
                    </div>
                  ))}
                </div>
              )}

              {/* Human Indicators */}
              {result.human_indicators && result.human_indicators.length > 0 && (
                <div style={{ padding:20, background:"rgba(6,214,160,0.05)", border:"1px solid rgba(6,214,160,0.15)", borderRadius:16, marginBottom:16 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#06d6a0", marginBottom:12 }}>✅ Human Writing Traits</div>
                  {result.human_indicators.map((item,i) => (
                    <div key={i} style={{ display:"flex", gap:8, marginBottom:6, fontSize:12, color:D.text }}>
                      <span style={{ color:"#06d6a0" }}>✓</span>{item}
                    </div>
                  ))}
                </div>
              )}

              {/* Plagiarism Details */}
              <div style={{ padding:20, background:D.card, border:`1px solid ${D.border}`, borderRadius:16, marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:D.text, marginBottom:8 }}>🔍 Plagiarism Analysis</div>
                <p style={{ fontSize:13, color:D.muted, margin:0, lineHeight:1.6 }}>{result.plagiarism_details}</p>
              </div>

              {/* Two columns */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:16, marginBottom:16 }}>
                <div style={{ padding:20, background:"rgba(6,214,160,0.05)", border:"1px solid rgba(6,214,160,0.15)", borderRadius:16 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#06d6a0", marginBottom:12 }}>💪 Strengths</div>
                  {result.strengths?.map((s,i) => (
                    <div key={i} style={{ display:"flex", gap:8, marginBottom:8, fontSize:12, color:D.text }}>
                      <span>✅</span>{s}
                    </div>
                  ))}
                </div>
                <div style={{ padding:20, background:"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.15)", borderRadius:16 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#f97316", marginBottom:12 }}>📈 Improvements Needed</div>
                  {result.improvements?.map((s,i) => (
                    <div key={i} style={{ display:"flex", gap:8, marginBottom:8, fontSize:12, color:D.text }}>
                      <span>🔸</span>{s}
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Changes */}
              <div style={{ padding:20, background:D.card, border:`1px solid rgba(67,97,238,0.2)`, borderRadius:16, marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#4361ee", marginBottom:12 }}>✏️ Suggested Changes</div>
                {result.suggested_changes?.map((s,i) => (
                  <div key={i} style={{ display:"flex", gap:8, marginBottom:8, fontSize:12, color:D.text }}>
                    <span style={{ color:"#4361ee", fontWeight:700 }}>{i+1}.</span>{s}
                  </div>
                ))}
              </div>

              {/* Detailed Feedback */}
              <div style={{ padding:20, background:"rgba(124,58,237,0.05)", border:"1px solid rgba(124,58,237,0.2)", borderRadius:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#a78bfa", marginBottom:8 }}>📝 Detailed Feedback</div>
                <p style={{ fontSize:13, color:D.text, margin:0, lineHeight:1.7 }}>{result.detailed_feedback}</p>
              </div>

              {/* Grammar Issues */}
              {result.grammar_issues && result.grammar_issues.length > 0 && (
                <div style={{ padding:20, background:D.card, border:`1px solid ${D.border}`, borderRadius:16, marginTop:16 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:D.text, marginBottom:12 }}>📌 Grammar Issues Found</div>
                  {result.grammar_issues.map((s,i) => (
                    <div key={i} style={{ display:"flex", gap:8, marginBottom:6, fontSize:12, color:D.text }}>
                      <span style={{ color:"#eab308" }}>⚠</span>{s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {result?.error && (
            <div style={{ marginTop:16, padding:16, background:"rgba(220,38,38,0.1)", border:"1px solid rgba(220,38,38,0.2)", borderRadius:12, color:"#f87171", fontSize:13 }}>
              ❌ {result.error}
            </div>
          )}
        </div>
      )}

      {/* HUMANIZE TAB */}
      {activeTab==="humanize" && (
        <div>
          <div style={{ padding:16, background:"rgba(124,58,237,0.05)", border:"1px solid rgba(124,58,237,0.15)", borderRadius:12, marginBottom:16 }}>
            <p style={{ color:"#a78bfa", fontSize:13, margin:0, lineHeight:1.6 }}>🧑 <strong>Humanize AI Text</strong> — Paste AI-generated text and we will rewrite it to sound completely natural and human-written. Perfect for bypassing AI detectors.</p>
          </div>

          <textarea value={humanizeText} onChange={e=>setHumanizeText(e.target.value)}
            placeholder="Paste AI-generated text here to make it sound human..."
            style={{ width:"100%", minHeight:180, padding:16, background:D.input, border:`1.5px solid ${D.inputBorder}`, borderRadius:14, color:D.text, fontSize:14, resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.6, fontFamily:"inherit" }}
          />

          <button onClick={runHumanize} disabled={!humanizeText.trim()||humanizeLoading}
            style={{ width:"100%", padding:15, border:"none", borderRadius:12, background:!humanizeText.trim()?"rgba(255,255,255,0.04)":"linear-gradient(135deg,#7c3aed,#4361ee)", color:!humanizeText.trim()?"#555":"#fff", fontSize:15, fontWeight:700, cursor:!humanizeText.trim()||humanizeLoading?"not-allowed":"pointer", marginTop:12 }}>
            {humanizeLoading?"⏳ Humanizing...":"🧑 Make It Human"}
          </button>

          {humanizeResult && (
            <div style={{ marginTop:20, background:D.card, border:"1px solid rgba(6,214,160,0.2)", borderRadius:16, padding:22 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#06d6a0", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>✅ Humanized Result</div>
              <div style={{ background:darkMode?"rgba(0,0,0,0.3)":"rgba(0,0,0,0.03)", borderRadius:12, padding:18, fontSize:13.5, lineHeight:1.8, color:D.text, whiteSpace:"pre-wrap" }}>{humanizeResult}</div>
              <button onClick={()=>{ try{navigator.clipboard.writeText(humanizeResult);}catch(e){const el=document.createElement("textarea");el.value=humanizeResult;document.body.appendChild(el);el.select();document.execCommand("copy");document.body.removeChild(el);} }}
                style={{ marginTop:12, padding:"10px 18px", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600, background:"rgba(6,214,160,0.1)", border:"1px solid rgba(6,214,160,0.25)", color:"#06d6a0" }}>
                📋 Copy Result
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
