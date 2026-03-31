import { useEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { Canvas } from "fabric";

export default function AdvancedPDFEditor({ darkMode }) {
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState("select");
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const fileRef = useRef(null);

  const D = darkMode
    ? {
        text: "#e4e4f0",
        muted: "#8b8ba7",
        border: "rgba(255,255,255,0.10)",
        card: "rgba(255,255,255,0.03)",
        input: "rgba(255,255,255,0.05)",
      }
    : {
        text: "#1a1a2e",
        muted: "#666680",
        border: "rgba(0,0,0,0.10)",
        card: "#ffffff",
        input: "#f7f7fb",
      };

  const loadFile = async (file) => {
    if (!file) return;
    const arr = await file.arrayBuffer();
    const bytes = new Uint8Array(arr);
    const blob = new Blob([bytes], { type: "application/pdf" });
    setPdfBytes(bytes);
    setPdfUrl(URL.createObjectURL(blob));
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      isDrawingMode: false,
    });

    fabricRef.current = canvas;

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (mode === "draw") {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = "red";
      canvas.freeDrawingBrush.width = 2;
    } else if (mode === "highlight") {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = "rgba(255,255,0,0.4)";
      canvas.freeDrawingBrush.width = 10;
    } else {
      canvas.isDrawingMode = false;
    }
  }, [mode]);

  const addText = () => {
    const id = Date.now().toString();
    setItems((prev) => [
      ...prev,
      {
        id,
        x: 80,
        y: 80,
        width: 220,
        height: 60,
        text: "Edit text",
      },
    ]);
  };

  const exportPdf = async () => {
    if (!pdfBytes) return;

    const doc = await PDFDocument.load(pdfBytes);
    const page = doc.getPage(0);
    const font = await doc.embedFont(StandardFonts.Helvetica);

    items.forEach((item) => {
      page.drawText(item.text, {
        x: item.x,
        y: page.getHeight() - item.y - 20,
        size: 18,
        font,
        color: rgb(0, 0, 0),
      });
    });

    const out = await doc.save();
    const blob = new Blob([out], { type: "application/pdf" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "edited.pdf";
    a.click();
  };

  return (
    <div style={{ color: D.text, fontFamily: "Outfit,sans-serif" }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Advanced PDF Editor</h2>
      <p style={{ color: D.muted, marginBottom: 16 }}>
        Add draggable text, draw, highlight, and export a new PDF.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        style={{ display: "none" }}
        onChange={(e) => loadFile(e.target.files?.[0])}
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <button onClick={() => fileRef.current?.click()} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid " + D.border, background: D.card, color: D.text, cursor: "pointer" }}>
          Open PDF
        </button>
        <button onClick={addText} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "#8b5cf6", color: "#fff", cursor: "pointer" }}>
          Add Text
        </button>
        <button onClick={() => setMode("draw")} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", cursor: "pointer" }}>
          Draw
        </button>
        <button onClick={() => setMode("highlight")} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "#eab308", color: "#111", cursor: "pointer" }}>
          Highlight
        </button>
        <button onClick={() => setMode("select")} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid " + D.border, background: D.card, color: D.text, cursor: "pointer" }}>
          Select
        </button>
        <button onClick={exportPdf} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "#06d6a0", color: "#fff", cursor: "pointer" }}>
          Export PDF
        </button>
      </div>

      <div style={{ position: "relative", width: 700, height: 900, maxWidth: "100%", border: "1px solid " + D.border, borderRadius: 14, overflow: "hidden", background: "#fff" }}>
        {pdfUrl && (
          <iframe
            title="advanced-pdf-preview"
            src={pdfUrl}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
          />
        )}

        <canvas
          ref={canvasRef}
          width={700}
          height={900}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 2,
          }}
        />

        {items.map((item) => (
          <Rnd
            key={item.id}
            bounds="parent"
            size={{ width: item.width, height: item.height }}
            position={{ x: item.x, y: item.y }}
            onDragStop={(e, d) =>
              setItems((prev) =>
                prev.map((i) => (i.id === item.id ? { ...i, x: d.x, y: d.y } : i))
              )
            }
            onResizeStop={(e, direction, ref, delta, position) =>
              setItems((prev) =>
                prev.map((i) =>
                  i.id === item.id
                    ? {
                        ...i,
                        width: parseInt(ref.style.width, 10),
                        height: parseInt(ref.style.height, 10),
                        x: position.x,
                        y: position.y,
                      }
                    : i
                )
              )
            }
            style={{ zIndex: 3 }}
          >
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) =>
                setItems((prev) =>
                  prev.map((i) => (i.id === item.id ? { ...i, text: e.target.innerText } : i))
                )
              }
              style={{
                width: "100%",
                height: "100%",
                padding: 8,
                background: "rgba(255,255,255,0.82)",
                border: "2px dashed #8b5cf6",
                borderRadius: 8,
                color: "#111",
                fontSize: 18,
                overflow: "hidden",
              }}
            >
              {item.text}
            </div>
          </Rnd>
        ))}
      </div>
    </div>
  );
}
