# backend/server.py
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes should be defined before static file handling
@app.get("/api/signed-url")
async def get_signed_url():
    # Use SIT otter assistant agent ID
    agent_id = os.getenv("AGENT_ID")
    xi_api_key = os.getenv("XI_API_KEY")
    
    if not agent_id or not xi_api_key:
        raise HTTPException(status_code=500, detail="Missing environment variables")
    
    url = f"https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id={agent_id}"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                url,
                headers={"xi-api-key": xi_api_key}
            )
            response.raise_for_status()
            data = response.json()
            return {"signedUrl": data["signed_url"]}
            
        except httpx.HTTPError:
            raise HTTPException(status_code=500, detail="Failed to get signed URL")

#API route for getting Agent ID, used for public agents
@app.get("/api/getAgentId")
def get_unsigned_url():
    agent_id = os.getenv("AGENT_ID")
    return {"agentId": agent_id}

# New STT endpoint
@app.post("/api/speech-to-text")
async def speech_to_text(audio_file: UploadFile = File(...)):
    xi_api_key = os.getenv("XI_API_KEY")
    
    if not xi_api_key:
        raise HTTPException(status_code=500, detail="Missing XI_API_KEY environment variable")
    
    # Read the audio file
    audio_data = await audio_file.read()
    
    # ElevenLabs STT API endpoint
    url = "https://api.elevenlabs.io/v1/speech-to-text"
    
    async with httpx.AsyncClient() as client:
        try:
            # Prepare the file for upload
            files = {
                "audio": (audio_file.filename, audio_data, audio_file.content_type)
            }
            
            response = await client.post(
                url,
                files=files,
                headers={"xi-api-key": xi_api_key}
            )
            response.raise_for_status()
            data = response.json()
            return {"text": data.get("text", "")}
            
        except httpx.HTTPError as e:
            print(f"STT API Error: {e}")
            raise HTTPException(status_code=500, detail="Failed to convert speech to text")
        except Exception as e:
            print(f"General STT Error: {e}")
            raise HTTPException(status_code=500, detail="STT processing failed")

# Mount static files for specific assets (CSS, JS, etc.)
app.mount("/static", StaticFiles(directory="dist"), name="static")

# Serve index.html for root path
@app.get("/")
async def serve_root():
    return FileResponse("dist/index.html")