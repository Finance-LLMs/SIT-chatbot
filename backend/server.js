const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const multer = require("multer");
const FormData = require("form-data");
const { fetch } = require('undici');

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
    console.log("Received STT request");
    
    if (!req.file) {
      console.error("No audio file provided");
      return res.status(400).json({ error: "No audio file provided" });
    }

    console.log(`File details: Size=${req.file.size} bytes, MimeType=${req.file.mimetype}, OriginalName=${req.file.originalname}`);

    if (req.file.size < 1000) {
      console.error(`Audio file too small: ${req.file.size} bytes`);
      return res.status(400).json({ error: "Audio file too small - no audio detected" });
    }

    const xiApiKey = process.env.XI_API_KEY;
    if (!xiApiKey) {
      console.error("Missing XI_API_KEY environment variable");
      return res.status(500).json({ error: "Missing XI_API_KEY environment variable" });
    }
    
    // Re-create the formData in a way that's compatible with the API
    const formData = new FormData();
    
    // Append the file as raw buffer with filename and mimetype
    // Critical: Use Buffer.from to ensure we have a proper copy of the buffer
    const fileBuffer = Buffer.from(req.file.buffer);
    formData.append("audio", fileBuffer, {
      filename: req.file.originalname || "recording.webm",
      contentType: req.file.mimetype || "audio/webm",
      knownLength: fileBuffer.length // Explicitly set the content length
    });
    
    console.log(`Prepared audio file: ${fileBuffer.length} bytes, type: ${req.file.mimetype || "audio/webm"}`);
    console.log("Sending request to ElevenLabs STT API...");

    // Important: Use the headers from form-data for proper multipart boundaries
    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      // This is critical: get headers from formData and add API key
      headers: {
        ...formData.getHeaders(), // This provides the correct Content-Type with boundary
        "xi-api-key": xiApiKey
      },
      body: formData
    });

    console.log(`ElevenLabs STT API response status: ${response.status}`);
    
    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = "Could not retrieve error details";
      }
      console.error(`ElevenLabs STT API error: ${errorText}`);
      return res.status(response.status).json({ 
        error: `ElevenLabs STT API error (${response.status})`, 
        details: errorText 
      });
    }
    
    const data = await response.json();
    console.log("STT successful, transcribed text:", data.text);
    res.json({ text: data.text || "" });
    
  } catch (error) {
    console.error("STT endpoint error:", error);
    res.status(500).json({ error: error.message });
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