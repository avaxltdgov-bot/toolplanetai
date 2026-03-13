const express = require("express");
const cors = require("cors");
const app = express();

// ── SECURITY: Only allow your domain ──
const allowedOrigins = [
  "https://toolplanetai.com",
  "http://localhost:3000"
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
}));

// ── SECURITY: Limit request size to 5MB ──
app.use(express.json({ limit: "5mb" }));

// ── SECURITY: Rate limiting (100 requests per 15 min per IP) ──
const rateLimit = {};
const RATE_LIMIT = 100;
const RATE_WINDOW = 15 * 60 * 1000;
const rateLimiter = (req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress || "unknown";
  const now = Date.now();
  if (!rateLimit[ip]) rateLimit[ip] = { count: 0, start: now };
  if (now - rateLimit[ip].start > RATE_WINDOW) {
    rateLimit[ip] = { count: 0, start: now };
  }
  rateLimit[ip].count++;
  if (rateLimit[ip].count > RATE_LIMIT) {
    return res.status(429).json({ error: "Too many requests. Please wait a moment." });
  }
  next();
};
app.use("/api", rateLimiter);

app.post("/api/ai", async (req, res) => {
  const { tool, input } = req.body;
  // ── SECURITY: Validate input ──
  if (!input || typeof input !== "string") return res.status(400).json({ error: "Invalid input" });
  if (input.length > 20000) return res.status(400).json({ error: "Input too long (max 20,000 chars)" });
  const prompts = {
    translate: `Translate this text to English. If already English, translate to Spanish:\n\n${input}`,
    summarize: `Summarize this text in 3-5 bullet points:\n\n${input}`,
    grammar: `Fix all grammar and spelling errors. Return only corrected text:\n\n${input}`,
    rewrite: `Rewrite this text to be more professional and clear:\n\n${input}`,
    expand: `Expand this short text into detailed content:\n\n${input}`,
    tone: `Rewrite this in a more professional tone:\n\n${input}`,
    prompt: `Generate a detailed AI image prompt based on this idea:\n\n${input}`,
    email: `Write a professional email based on this request:\n\n${input}`,
  };

  console.log("Request received:", tool, input.slice(0, 50));
  console.log("API Key exists:", !!process.env.ANTHROPIC_API_KEY);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8192,
        messages: [{ role: "user", content: input }]
      })
    });
    const data = await response.json();
    if (data.content && data.content[0]) {
      res.json({ result: data.content[0].text });
    } else {
      res.status(500).json({ error: "AI service error. Please try again." });
    }
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

app.post("/api/generate-pdf", async (req, res) => {
  const { text, fileName } = req.body;
  try {
    const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const margin = 50;
    const lineHeight = fontSize * 1.6;
    const pageWidth = 595;
    const pageHeight = 842;
    const maxWidth = pageWidth - margin * 2;

    const lines = [];
    const paragraphs = text.split("\n");
    for (const para of paragraphs) {
      if (!para.trim()) { lines.push(""); continue; }
      const words = para.split(" ");
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? currentLine + " " + word : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);
        if (width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
    }

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    for (const line of lines) {
      if (y < margin + lineHeight) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      if (line) {
        page.drawText(line, { x: margin, y, font, size: fontSize, color: rgb(0, 0, 0) });
      }
      y -= lineHeight;
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment");
    res.send(Buffer.from(pdfBytes));
  } catch(err) {
    console.error("PDF gen error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/extract", async (req, res) => {
  const { file, mediaType, fileName } = req.body;
  // ── SECURITY: Validate file ──
  const allowed = ["application/pdf","text/plain","image/jpeg","image/png","image/webp","image/gif"];
  if (!file || !mediaType) return res.status(400).json({ error: "Missing file or type" });
  if (!allowed.includes(mediaType) && !mediaType.includes("word") && !mediaType.includes("document")) {
    return res.status(400).json({ error: "File type not allowed" });
  }
  try {
    let extractedText = "";
    
    // Handle text files directly
    if (mediaType === "text/plain") {
      extractedText = Buffer.from(file, "base64").toString("utf-8");
      return res.json({ result: extractedText });
    }

    // Use Claude to extract text from PDF/Word
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ 
          role: "user", 
          content: [
            { 
              type: "document", 
              source: { type: "base64", media_type: mediaType, data: file } 
            },
            { 
              type: "text", 
              text: "Extract all the text content from this document. Return only the extracted text, preserving paragraphs and structure. Nothing else." 
            }
          ]
        }]
      })
    });
    const data = await response.json();
    if (data.content && data.content[0]) {
      res.json({ result: data.content[0].text });
    } else {
      res.status(500).json({ error: "Could not extract text" });
    }
  } catch(err) {
    console.error("Extract error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/image", async (req, res) => {
  const { image, mediaType } = req.body;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8192,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
          { type: "text", text: "Extract all the text from this image. Return only the extracted text, nothing else." }
        ]}]
      })
    });
    const data = await response.json();
    res.json({ result: data.content[0].text });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/ping", (req, res) => res.json({ status: "alive", time: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("✅ Backend running on port", PORT));

// Keep-alive ping every 14 minutes to prevent sleeping
setInterval(() => {
  fetch("https://toolplanetai-backend.onrender.com/ping")
    .then(() => console.log("Keep-alive ping sent"))
    .catch(() => {});
}, 14 * 60 * 1000);
