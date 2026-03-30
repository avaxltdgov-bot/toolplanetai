import { useState, useRef, useEffect } from "react";

export default function PDFTools({ darkMode, activeTool }) {
  const tool = activeTool || "pdf2word";
  const [stage, setStage] = useState("upload");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [downloadName, setDownloadName] = useState("");
  const [editText, setEditText] = useState("");
  const [editBold, setEditBold] = useState(false);
  const [editItalic, setEditItalic] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [toast, setToast] = useState("");
  const [pdfPages, setPdfPages] = useState([]);
  const [activePage, setActivePage] = useState(0);
  const [pageTexts, setPageTexts] = useState([]);
  const fileRef = useRef();

  const D = darkMode ? {
    bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.1)",
    text: "#e4e4f0", muted: "#6b6b85", input: "rgba(255,255,255,0.05)",
    toolbar: "rgba(255,255,255,0.06)", card: "rgba(255,255,255,0.04)"
  } : {
    bg: "#ffffff", border: "#e2e2ee", text: "#1a1a2e", muted: "#6b6b8a",
    input: "#f8f8ff", toolbar: "#f0f0f8", card: "#f8f8ff"
  };

  const showT = (m) => { setToast(m); setTimeout(() => setToast(""), 3000); };
  const sp = (p, m) => { setProgress(p); setProgressMsg(m); };
  const reset = () => {
    setStage("upload"); setFileName(""); setDownloadUrl(null);
    setDownloadName(""); setEditText(""); setError(""); setProgress(0);
    setPdfPages([]); setPageTexts([]); setActivePage(0);
  };

  const cfg = {
    pdf2word: { accept: ".pdf", label: "PDF to Word", sub: "Convert PDF files into editable Word documents in seconds", icon: "📄", fmt: ["PDF"] },
    word2pdf: { accept: ".doc,.docx,.txt", label: "Word to PDF", sub: "Convert DOC, DOCX, and TXT files into clean PDF documents", icon: "📝", fmt: ["DOC", "DOCX", "TXT"] },
    pdfeditor: { accept: ".pdf", label: "PDF Editor", sub: "Open PDF pages, edit extracted text, and export as PDF or Word", icon: "✏️", fmt: ["PDF"] },
  };
  const c = cfg[tool];

  const loadJsPDF = () => new Promise((res, rej) => {
    if (window.jspdf) return res();
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });

  const loadPdfJs = () => new Promise((res, rej) => {
    if (window.pdfjsLib) return res();
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      res();
    };
    s.onerror = rej;
    document.head.appendChild(s);
  });

  useEffect(() => {
    if (tool === "word2pdf") loadJsPDF();
    if (tool === "pdfeditor") { loadJsPDF(); loadPdfJs(); }
  }, [tool]);

  const pdfToWord = async (file) => {
    setStage("converting"); sp(10, "Reading PDF...");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        sp(35, "Extracting content...");
        const b64 = btoa(new Uint8Array(ev.target.result).reduce((d, b) => d + String.fromCharCode(b), ""));
        const res = await fetch("https://toolplanetai-backend.onrender.com/api/extract", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: b64, mediaType: "application/pdf", fileName: file.name })
        });
        sp(75, "Building Word file...");
        const { result } = await res.json();
        const body = (result || "").split("\n").map(l =>
          l.trim() ? "<p>" + l.replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</p>" : "<p>&nbsp;</p>"
        ).join("");
        const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;margin:2.5cm;}p{margin:0 0 6pt;}</style></head><body>' + body + '</body></html>';
        const blob = new Blob([html], { type: "application/msword" });
        const url = URL.createObjectURL(blob);
        const name = file.name.replace(/\.pdf$/i, "") + ".doc";
        sp(100, "Done!"); setDownloadUrl(url); setDownloadName(name);
        setTimeout(() => setStage("done"), 300); showT("Ready to download!");
      } catch (e) { setError("Failed: " + e.message); setStage("upload"); }
    };
    reader.readAsArrayBuffer(file);
  };

  const wordToPdf = async (file) => {
    setStage("converting"); sp(10, "Reading document...");
    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        let text = "";
        if (ext === "txt") { sp(30, "Processing text..."); text = ev.target.result; }
        else {
          sp(30, "Extracting from Word...");
          const m = await import("mammoth");
          const r = await m.extractRawText({ arrayBuffer: ev.target.result });
          text = r.value || "";
        }
        sp(60, "Loading PDF engine...");
        await loadJsPDF();
        sp(75, "Generating PDF...");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: "pt", format: "a4" });
        const pageW = doc.internal.pageSize.getWidth();
        const margin = 56.7;
        const maxW = pageW - margin * 2;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        const lineH = 18;
        const pageH = doc.internal.pageSize.getHeight();
        let y = margin;
        sp(85, "Laying out pages...");
        for (const line of text.split("\n")) {
          if (!line.trim()) { y += lineH * 0.4; if (y > pageH - margin) { doc.addPage(); y = margin; } continue; }
          const wrapped = doc.splitTextToSize(line, maxW);
          for (const wl of wrapped) {
            if (y > pageH - margin) { doc.addPage(); y = margin; }
            doc.text(wl, margin, y); y += lineH;
          }
        }
        sp(98, "Saving...");
        const pdfBlob = doc.output("blob");
        const url = URL.createObjectURL(pdfBlob);
        const name = file.name.replace(/\.[^.]+$/, "") + ".pdf";
        sp(100, "Done!"); setDownloadUrl(url); setDownloadName(name);
        setTimeout(() => setStage("done"), 300); showT("PDF ready to download!");
      } catch (e) { setError("Failed: " + e.message); setStage("upload"); }
    };
    if (ext === "txt") reader.readAsText(file); else reader.readAsArrayBuffer(file);
  };

  const loadPdfEditor = async (file) => {
    setStage("converting"); sp(10, "Loading PDF...");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        sp(20, "Loading PDF renderer...");
        await loadPdfJs();
        sp(35, "Rendering pages...");
        const pdfData = new Uint8Array(ev.target.result);
        const pdfDoc = await window.pdfjsLib.getDocument({ data: pdfData }).promise;
        const numPages = pdfDoc.numPages;
        const pages = [], texts = [];
        for (let i = 1; i <= numPages; i++) {
          sp(35 + Math.round((i / numPages) * 50), "Rendering page " + i + " of " + numPages + "...");
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width; canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
          pages.push(canvas.toDataURL("image/jpeg", 0.85));
          const tc = await page.getTextContent();
          texts.push(tc.items.map(item => item.str).join(" "));
        }
        sp(95, "Almost ready...");
        setPdfPages(pages); setPageTexts(texts);
        setEditText(texts[0] || ""); setActivePage(0);
        await loadJsPDF();
        setTimeout(() => setStage("editing"), 300);
        showT("PDF loaded successfully — " + numPages + " page" + (numPages > 1 ? "s" : "") + " ready!");
      } catch (e) { setError("Failed: " + e.message); setStage("upload"); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePageChange = (idx) => {
    const updated = [...pageTexts];
    updated[activePage] = editText;
    setPageTexts(updated);
    setActivePage(idx);
    setEditText(updated[idx] || "");
  };

  const dlEdited = (fmt) => {
    const allTexts = [...pageTexts];
    allTexts[activePage] = editText;
    const base = fileName.replace(/\.pdf$/i, "") + "_edited";
    if (fmt === "pdf") {
      if (!window.jspdf) { showT("PDF engine loading, try again in a moment..."); return; }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 56.7; const maxW = pageW - margin * 2;
      const fw = editBold && editItalic ? "bolditalic" : editBold ? "bold" : editItalic ? "italic" : "normal";
      doc.setFont("helvetica", fw);
      doc.setFontSize(fontSize);
      const lineH = fontSize * 1.5;
      const pageH = doc.internal.pageSize.getHeight();
      let first = true;
      for (let pi = 0; pi < allTexts.length; pi++) {
        if (!first) { doc.addPage(); } first = false;
        let y = margin;
        for (const line of (allTexts[pi] || "").split("\n")) {
          if (!line.trim()) { y += lineH * 0.4; continue; }
          const wrapped = doc.splitTextToSize(line, maxW);
          for (const wl of wrapped) {
            if (y > pageH - margin) { doc.addPage(); y = margin; }
            doc.text(wl, margin, y); y += lineH;
          }
        }
      }
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), { href: url, download: base + ".pdf" }).click();
      URL.revokeObjectURL(url); showT("Downloaded as PDF!");
    } else {
      const fullText = allTexts.join("\n\n");
      const body = fullText.split("\n").map(l =>
        l.trim() ? "<p style='font-weight:" + (editBold ? "bold" : "normal") + ";font-style:" + (editItalic ? "italic" : "normal") + ";font-size:" + fontSize + "pt;'>" + l.replace(/</g, "&lt;") + "</p>" : "<p>&nbsp;</p>"
      ).join("");
      const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>body{font-family:Arial;font-size:' + fontSize + 'pt;line-height:1.6;margin:2.5cm;}p{margin:0 0 6pt;}</style></head><body>' + body + '</body></html>';
      const blob = new Blob([html], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), { href: url, download: base + ".doc" }).click();
      URL.revokeObjectURL(url); showT("Downloaded as Word!");
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name); setError("");
    if (tool === "pdf2word") pdfToWord(file);
    else if (tool === "word2pdf") wordToPdf(file);
    else loadPdfEditor(file);
  };

  const Toast = () => toast ? (
    <div style={{ position: "fixed", bottom: 24, right: 24, background: "#1a1a2e", border: "1px solid rgba(139,92,246,0.5)", borderRadius: 12, padding: "12px 20px", color: "#e4e4f0", fontSize: 14, zIndex: 9999, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>{toast}</div>
  ) : null;

  if (stage === "upload") return (
    <div style={{ fontFamily: "Outfit,sans-serif" }}>
      <Toast />
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>{c.icon}</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: D.text, margin: "0 0 8px" }}>{c.label}</h2>
        <p style={{ color: D.muted, fontSize: 14, margin: 0 }}>{c.sub}</p>
      </div>
      <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => fileRef.current?.click()}
        style={{ border: "2px dashed " + (dragOver ? "#8b5cf6" : "rgba(139,92,246,0.35)"), borderRadius: 20, padding: "64px 32px", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(139,92,246,0.07)" : "rgba(139,92,246,0.02)", transition: "all .2s" }}>
        <input ref={fileRef} type="file" accept={c.accept} style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
        <div style={{ fontSize: 64, marginBottom: 16 }}>{dragOver ? "📥" : "☁️"}</div>
        <button style={{ padding: "13px 40px", background: "linear-gradient(135deg,#8b5cf6,#4361ee)", border: "none", borderRadius: 12, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif", marginBottom: 14, boxShadow: "0 4px 20px rgba(139,92,246,0.4)" }}>Choose File</button>
        <div style={{ color: D.muted, fontSize: 13, marginBottom: 12 }}>or drag and drop it here</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {c.fmt.map(f => <span key={f} style={{ padding: "3px 12px", borderRadius: 99, border: "1px solid rgba(139,92,246,0.35)", fontSize: 12, color: "#a78bfa", fontWeight: 700 }}>{f}</span>)}
        </div>
      </div>
      {error && <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 12, color: "#fca5a5", fontSize: 13 }}>{error}</div>}
    </div>
  );

  if (stage === "converting") return (
    <div style={{ fontFamily: "Outfit,sans-serif", textAlign: "center", padding: "72px 24px" }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>{c.icon}</div>
      <div style={{ fontSize: 19, fontWeight: 700, color: D.text, marginBottom: 6 }}>{progressMsg}</div>
      <div style={{ fontSize: 13, color: D.muted, marginBottom: 28 }}>{fileName}</div>
      <div style={{ maxWidth: 420, margin: "0 auto 12px", height: 10, background: "rgba(139,92,246,0.12)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: progress + "%", background: "linear-gradient(90deg,#8b5cf6,#f97316)", borderRadius: 99, transition: "width .4s ease" }} />
      </div>
      <div style={{ fontSize: 14, color: "#8b5cf6", fontWeight: 700 }}>{progress}%</div>
    </div>
  );

  if (stage === "done") return (
    <div style={{ fontFamily: "Outfit,sans-serif", textAlign: "center", padding: "60px 24px" }}>
      <Toast />
      <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#06d6a0", marginBottom: 8 }}>Your file is ready!</div>
      <div style={{ fontSize: 14, color: D.muted, marginBottom: 32 }}>{fileName}</div>
      <a href={downloadUrl} download={downloadName} style={{ textDecoration: "none", display: "inline-block", marginBottom: 20 }}>
        <button style={{ padding: "16px 48px", background: "linear-gradient(135deg,#06d6a0,#4361ee)", border: "none", borderRadius: 14, color: "#fff", fontSize: 17, fontWeight: 800, cursor: "pointer", fontFamily: "Outfit,sans-serif", boxShadow: "0 6px 24px rgba(6,214,160,0.4)" }}>
          Download {downloadName}
        </button>
      </a>
      <br />
      <button onClick={reset} style={{ padding: "10px 26px", background: "none", border: "1px solid " + D.border, borderRadius: 10, color: D.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Outfit,sans-serif", marginTop: 8 }}>
        Convert Another File
      </button>
    </div>
  );

  if (stage === "editing") return (
    <div style={{ fontFamily: "Outfit,sans-serif" }}>
      <Toast />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: D.text }}>PDF Editor — {fileName}</div>
          <div style={{ fontSize: 12, color: D.muted, marginTop: 2 }}>{pdfPages.length} page{pdfPages.length !== 1 ? "s" : ""} · editing page {activePage + 1}</div>
        </div>
        <button onClick={reset} style={{ padding: "7px 16px", background: "none", border: "1px solid " + D.border, borderRadius: 8, color: D.muted, fontSize: 12, cursor: "pointer" }}>Close</button>
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        {pdfPages.length > 1 && (
          <div style={{ width: 110, flexShrink: 0, maxHeight: 600, overflowY: "auto" }}>
            <div style={{ fontSize: 11, color: D.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Pages</div>
            {pdfPages.map((pg, i) => (
              <div key={i} onClick={() => handlePageChange(i)}
                style={{ cursor: "pointer", border: "2px solid " + (activePage === i ? "#8b5cf6" : D.border), borderRadius: 8, overflow: "hidden", marginBottom: 8, opacity: activePage === i ? 1 : 0.65, transition: "all .2s" }}>
                <img src={pg} alt={"Page " + (i + 1)} style={{ width: "100%", display: "block" }} />
                <div style={{ textAlign: "center", fontSize: 10, color: D.muted, padding: "3px 0" }}>Page {i + 1}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ border: "1px solid " + D.border, borderRadius: 12, overflow: "hidden", marginBottom: 10, background: darkMode ? "#111" : "#fff", textAlign: "center", maxHeight: "420px", overflowY: "auto" }}>
            {pdfPages[activePage] && <img src={pdfPages[activePage]} alt={"Page " + (activePage + 1)} style={{ maxWidth: "100%", display: "block", margin: "0 auto" }} />}
          </div>
          <div style={{ background: D.toolbar, border: "1px solid " + D.border, borderRadius: "10px 10px 0 0", padding: "8px 14px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: D.muted, marginRight: 4 }}>Edit text:</span>
            <button onClick={() => setEditBold(!editBold)} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid " + (editBold ? "#8b5cf6" : D.border), background: editBold ? "rgba(139,92,246,0.15)" : "none", color: editBold ? "#a78bfa" : D.muted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>B</button>
            <button onClick={() => setEditItalic(!editItalic)} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid " + (editItalic ? "#8b5cf6" : D.border), background: editItalic ? "rgba(139,92,246,0.15)" : "none", color: editItalic ? "#a78bfa" : D.muted, fontStyle: "italic", fontSize: 13, cursor: "pointer" }}>I</button>
            <select value={fontSize} onChange={e => setFontSize(Number(e.target.value))} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid " + D.border, background: D.input, color: D.text, fontSize: 12, cursor: "pointer" }}>
              {[10, 11, 12, 13, 14, 16, 18, 20, 24].map(s => <option key={s} value={s}>{s}pt</option>)}
            </select>
            {pdfPages.length > 1 && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                <button onClick={() => activePage > 0 && handlePageChange(activePage - 1)} disabled={activePage === 0} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid " + D.border, background: "none", color: D.muted, cursor: "pointer", fontSize: 14 }}>&#8249;</button>
                <span style={{ fontSize: 12, color: D.muted }}>Page {activePage + 1} / {pdfPages.length}</span>
                <button onClick={() => activePage < pdfPages.length - 1 && handlePageChange(activePage + 1)} disabled={activePage === pdfPages.length - 1} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid " + D.border, background: "none", color: D.muted, cursor: "pointer", fontSize: 14 }}>&#8250;</button>
              </div>
            )}
          </div>
          <textarea
          ref={el => { if(el && el.value !== editText) el.value = editText; }}
          onInput={e => setEditText(e.target.value)}
          defaultValue={editText}
            style={{ width: "100%", minHeight: 280, padding: "16px 20px", background: D.input, border: "1px solid " + D.border, borderTop: "1px solid " + D.border, borderRadius: "0 0 10px 10px", color: D.text, fontSize: fontSize + "px", fontFamily: "Arial,sans-serif", fontWeight: editBold ? "bold" : "normal", fontStyle: editItalic ? "italic" : "normal", resize: "vertical", lineHeight: 1.8, outline: "none", boxSizing: "border-box", position: "relative", zIndex: 10 }}
            placeholder="Extracted text for this page — edit freely..." />
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={() => dlEdited("pdf")} style={{ padding: "13px 28px", background: "linear-gradient(135deg,#8b5cf6,#e91e8c)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>Export as PDF</button>
        <button onClick={() => dlEdited("word")} style={{ padding: "13px 28px", background: "linear-gradient(135deg,#4361ee,#06d6a0)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>Export as Word</button>
        <button onClick={reset} style={{ padding: "13px 22px", background: "none", border: "1px solid " + D.border, borderRadius: 12, color: D.muted, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>New File</button>
      </div>
    </div>
  );

  return null;
}
