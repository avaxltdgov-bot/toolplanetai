const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/ai", async (req, res) => {
  const { tool, input } = req.body;
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
        max_tokens: 1024,
        messages: [{ role: "user", content: prompts[tool] || input }]
      })
    });
    const data = await response.json();
    console.log("API response:", JSON.stringify(data).slice(0, 200));
    if (data.content && data.content[0]) {
      res.json({ result: data.content[0].text });
    } else {
      res.json({ error: data.error?.message || "Unknown error", raw: data });
    }
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/extract", async (req, res) => {
  const { file, mediaType, fileName } = req.body;
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
        max_tokens: 1024,
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

app.listen(3001, () => console.log("✅ Backend running on http://localhost:3001"));
