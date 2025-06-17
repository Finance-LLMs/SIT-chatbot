const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const multer = require("multer");
const FormData = require("form-data");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/static", express.static(path.join(__dirname, "../dist")));

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Add debugging logs for incoming requests and outgoing responses
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Incoming request: ${req.method} ${req.url}`);
  next();
});

app.get("/api/signed-url", async (req, res) => {
  try {
    let agentId = process.env.AGENT_ID; // Default agent
    console.log("Requesting signed URL for agentId:", agentId);
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": process.env.XI_API_KEY,
        },
      }
    );
    console.log("Received response status:", response.status);
    if (!response.ok) {
      throw new Error("Failed to get signed URL");
    }
    const data = await response.json();
    console.log("Signed URL data:", data);
    res.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error("Error in /api/signed-url:", error);
    res.status(500).json({ error: "Failed to get signed URL" });
  }
});

//API route for getting Agent ID, used for public agents
app.get("/api/getAgentId", (req, res) => {
  const agentId = process.env.AGENT_ID;
  console.log("Returning agentId:", agentId);
  res.json({
    agentId: `${agentId}`,
  });
});

// New STT endpoint
app.post("/api/speech-to-text", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const xiApiKey = process.env.XI_API_KEY;
    if (!xiApiKey) {
      return res.status(500).json({ error: "Missing XI_API_KEY environment variable" });
    }

    console.log("Processing STT request for file:", req.file.originalname);

    // Create form data for ElevenLabs API
    const formData = new FormData();
    formData.append("audio", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": xiApiKey,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    console.log("STT API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("STT API error:", errorText);
      throw new Error(`STT API failed: ${response.status}`);
    }

    const data = await response.json();
    console.log("STT result:", data);
    res.json({ text: data.text || "" });
  } catch (error) {
    console.error("Error in /api/speech-to-text:", error);
    res.status(500).json({ error: "Failed to convert speech to text" });
  }
});

// Serve index.html for all other routes
app.get("*", (req, res) => {
  console.log("Serving index.html for route:", req.url);
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}: http://localhost:${PORT}`);
});