import { useState } from "react";

const LANGUAGES = [
  "Afrikaans","Albanian","Amharic","Arabic","Armenian","Azerbaijani","Basque","Belarusian","Bengali","Bosnian","Bulgarian","Catalan","Cebuano","Chinese (Simplified)","Chinese (Traditional)","Corsican","Croatian","Czech","Danish","Dutch","English","Esperanto","Estonian","Finnish","French","Frisian","Galician","Georgian","German","Greek","Gujarati","Haitian Creole","Hausa","Hawaiian","Hebrew","Hindi","Hmong","Hungarian","Icelandic","Igbo","Indonesian","Irish","Italian","Japanese","Javanese","Kannada","Kazakh","Khmer","Kinyarwanda","Korean","Kurdish","Kyrgyz","Lao","Latin","Latvian","Lithuanian","Luxembourgish","Macedonian","Malagasy","Malay","Malayalam","Maltese","Maori","Marathi","Mongolian","Myanmar","Nepali","Norwegian","Nyanja","Odia","Pashto","Persian","Polish","Portuguese","Punjabi","Romanian","Russian","Samoan","Scots Gaelic","Serbian","Sesotho","Shona","Sindhi","Sinhala","Slovak","Slovenian","Somali","Spanish","Sundanese","Swahili","Swedish","Tagalog","Tajik","Tamil","Tatar","Telugu","Thai","Turkish","Turkmen","Ukrainian","Urdu","Uyghur","Uzbek","Vietnamese","Welsh","Xhosa","Yiddish","Yoruba","Zulu"
];

export default function AITranslator({ darkMode }) {
  const [fromLang, setFromLang] = useState("English");
  const [toLang, setToLang] = useState("Spanish");
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);

  const D = darkMode ? {
    text:"#e4e4f0", muted:"#9090b0", border:"rgba(255,255,255,0.08)",
    card:"rgba(255,255,255,0.03)", input:"rgba(255,255,255,0.025)", inputBorder:"rgba(255,255,255,0.08)",
    dropdown:"#0f0f1e", hover:"rgba(255,255,255,0.05)"
  } : {
    text:"#1a1a2e", muted:"#555570", border:"rgba(0,0,0,0.1)",
    card:"#ffffff", input:"#ffffff", inputBorder:"rgba(0,0,0,0.15)",
    dropdown:"#ffffff", hover:"rgba(0,0,0,0.04)"
  };

  const filteredFrom = LANGUAGES.filter(l => l.toLowerCase().includes(fromSearch.toLowerCase()));
  const filteredTo = LANGUAGES.filter(l => l.toLowerCase().includes(toSearch.toLowerCase()));

  const swapLanguages = () => {
    const tmp = fromLang; setFromLang(toLang); setToLang(tmp);
    const tmpText = inputText; setInputText(outputText); setOutputText(tmpText);
  };

  const translate = async () => {
    if (!inputText.trim()) return;
    setLoading(true); setOutputText("");
    try {
      const res = await fetch("https://toolplanetai-backend.onrender.com/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "translate", input: `Translate the following text from ${fromLang} to ${toLang}. Return only the translated text, nothing else.\n\n${inputText}` })
      });
      const data = await res.json();
      setOutputText(data.result || "Translation failed.");
    } catch(e) { setOutputText("Could not connect to server."); }
    setLoading(false);
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
          setInputText(ev.target.result);
        } else if (ext === "docx" || ext === "doc") {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ arrayBuffer: ev.target.result });
          setInputText(result.value || "Could not read file.");
        } else if (ext === "pdf") {
          const base64 = btoa(new Uint8Array(ev.target.result).reduce((d,b)=>d+String.fromCharCode(b),""));
          const response = await fetch("https://toolplanetai-backend.onrender.com/api/extract", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ file:base64, mediaType:f.type, fileName:f.name })
          });
          const data = await response.json();
          setInputText(data.result || "Could not read PDF.");
        } else {
          setInputText("Unsupported file type. Please upload PDF, Word, or TXT.");
        }
      } catch(err) {
        console.error(err);
        setInputText("Could not read file. Please paste text manually.");
      }
      setFileLoading(false);
    };
    if (ext === "txt") reader.readAsText(f);
    else reader.readAsArrayBuffer(f);
  };

  const copy = () => {
    try { navigator.clipboard.writeText(outputText); }
    catch(e) { const el=document.createElement("textarea");el.value=outputText;document.body.appendChild(el);el.select();document.execCommand("copy");document.body.removeChild(el); }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const LangSelector = ({ value, onChange, search, setSearch, show, setShow, label }) => (
    <div style={{ flex: 1, position: "relative" }}>
      <div style={{ fontSize: 10, color: D.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <button onClick={() => { setShow(!show); setSearch(""); }}
        style={{ width: "100%", padding: "10px 14px", background: D.input, border: "1.5px solid " + (show ? "#8b5cf6" : D.inputBorder), borderRadius: 10, color: D.text, fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>🌍 {value}</span>
        <span style={{ color: D.muted, fontSize: 12 }}>{show ? "▲" : "▼"}</span>
      </button>
      {show && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: D.dropdown, border: "1px solid " + D.border, borderRadius: 12, zIndex: 500, boxShadow: "0 8px 30px rgba(0,0,0,0.3)", overflow: "hidden" }}>
          <div style={{ padding: 8 }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search language..." style={{ width: "100%", padding: "8px 12px", background: D.input, border: "1px solid " + D.inputBorder, borderRadius: 8, color: D.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto", padding: "4px 8px 8px" }}>
            {filteredFrom.length === 0 && label === "From" && <div style={{ padding: "8px 12px", color: D.muted, fontSize: 12 }}>No results</div>}
            {(label === "From" ? filteredFrom : filteredTo).map(lang => (
              <button key={lang} onClick={() => { onChange(lang); setShow(false); setSearch(""); }}
                style={{ display: "block", width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", background: value === lang ? "rgba(139,92,246,0.15)" : "transparent", color: value === lang ? "#c4b5fd" : D.text, fontSize: 13, cursor: "pointer", textAlign: "left", fontWeight: value === lang ? 700 : 400 }}>
                {lang} {value === lang && "✓"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div onClick={(e) => { if (!e.target.closest('.lang-selector')) { setShowFromDropdown(false); setShowToDropdown(false); } }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: 13, background: "linear-gradient(135deg,#ff006e,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🌍</div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: D.text }}>AI Translator</h2>
          <p style={{ color: D.muted, fontSize: 12, margin: 0 }}>Translate between 100+ languages instantly</p>
        </div>
      </div>

      {/* Language selectors */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 16 }}>
        <div className="lang-selector" style={{ flex: 1 }}>
          <LangSelector value={fromLang} onChange={setFromLang} search={fromSearch} setSearch={setFromSearch} show={showFromDropdown} setShow={setShowFromDropdown} label="From" />
        </div>

        {/* Swap button */}
        <button onClick={swapLanguages} style={{ width: 42, height: 42, borderRadius: 10, border: "1px solid " + D.border, background: D.card, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 0, flexShrink: 0 }} title="Swap languages">⇄</button>

        <div className="lang-selector" style={{ flex: 1 }}>
          <LangSelector value={toLang} onChange={setToLang} search={toSearch} setSearch={setToSearch} show={showToDropdown} setShow={setShowToDropdown} label="To" />
        </div>
      </div>

      {/* Quick language chips */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: D.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Quick Select →</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Spanish","French","German","Arabic","Chinese (Simplified)","Japanese","Hindi","Portuguese","Russian","Italian"].map(lang => (
            <button key={lang} onClick={() => setToLang(lang)}
              style={{ padding: "4px 10px", borderRadius: 99, border: "1px solid " + (toLang === lang ? "#ff006e" : D.border), background: toLang === lang ? "rgba(255,0,110,0.1)" : "transparent", color: toLang === lang ? "#ff006e" : D.muted, fontSize: 11, fontWeight: toLang === lang ? 700 : 400, cursor: "pointer" }}>
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Upload */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#a78bfa" }}>
          {fileLoading ? "⏳ Reading..." : "📄 Upload PDF/Word/Image"}
          <input type="file" accept=".pdf,.doc,.docx,.txt,image/*" onChange={handleFileUpload} style={{ display: "none" }} />
        </label>
        <span style={{ fontSize: 11, color: D.muted, display: "flex", alignItems: "center" }}>or type below</span>
      </div>

      {/* Input / Output side by side on desktop */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: D.muted, fontWeight: 600, marginBottom: 6 }}>{fromLang}</div>
          <textarea value={inputText} onChange={e => setInputText(e.target.value)}
            placeholder={"Type or paste text in " + fromLang + "..."}
            style={{ width: "100%", height: 200, padding: 14, background: D.input, border: "1.5px solid " + D.inputBorder, borderRadius: 12, color: D.text, fontSize: 14, resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.6 }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 11, color: D.muted }}>{inputText.trim() ? inputText.trim().split(/\s+/).length + " words" : "0 words"}</span>
            <button onClick={() => { setInputText(""); setOutputText(""); }} style={{ fontSize: 11, color: D.muted, background: "none", border: "none", cursor: "pointer" }}>🗑 Clear</button>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: D.muted, fontWeight: 600, marginBottom: 6 }}>{toLang}</div>
          <div style={{ width: "100%", height: 200, padding: 14, background: loading ? D.input : (outputText ? (darkMode ? "rgba(255,0,110,0.04)" : "rgba(255,0,110,0.02)") : D.input), border: "1.5px solid " + (outputText ? "rgba(255,0,110,0.2)" : D.inputBorder), borderRadius: 12, color: D.text, fontSize: 14, lineHeight: 1.6, overflowY: "auto", boxSizing: "border-box" }}>
            {loading ? <span style={{ color: D.muted }}>⏳ Translating...</span> : outputText ? outputText : <span style={{ color: D.muted }}>Translation will appear here...</span>}
          </div>
          {outputText && (
            <div style={{ marginTop: 4, display: "flex", gap: 8 }}>
              <button onClick={copy} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid " + (copied ? "rgba(6,214,160,0.3)" : D.border), background: copied ? "rgba(6,214,160,0.1)" : "transparent", color: copied ? "#06d6a0" : D.muted, cursor: "pointer" }}>
                {copied ? "✓ Copied!" : "📋 Copy"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Translate button */}
      <button onClick={translate} disabled={!inputText.trim() || loading}
        style={{ width: "100%", padding: 15, border: "none", borderRadius: 12, background: !inputText.trim() ? (darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)") : "linear-gradient(135deg,#ff006e,#8b5cf6)", color: !inputText.trim() ? D.muted : "#fff", fontSize: 15, fontWeight: 700, cursor: !inputText.trim() || loading ? "not-allowed" : "pointer", marginTop: 14 }}>
        {loading ? "⏳ Translating..." : "🌍 Translate " + fromLang + " → " + toLang}
      </button>
    </div>
  );
}
