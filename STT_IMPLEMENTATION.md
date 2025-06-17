# STT Integration Changes Summary

## Overview
Successfully modified the SIT chatbot to use ElevenLabs Speech-to-Text (STT) instead of direct conversational agent voice input. This gives you more control over the speech processing pipeline.

## Changes Made

### 1. Backend Changes

#### Node.js Server (`backend/server.js`)
- Added `multer` middleware for file upload handling
- Added new `/api/speech-to-text` endpoint that:
  - Accepts audio file uploads via multipart/form-data
  - Forwards audio to ElevenLabs STT API
  - Returns transcribed text

#### Python Server (`backend/server.py`)
- Added `python-multipart` support for file uploads
- Added new `/api/speech-to-text` endpoint with same functionality as Node.js version

### 2. Frontend Changes (`src/app.js`)

#### New Features Added:
- **Manual Audio Recording**: Uses browser's MediaRecorder API
- **STT Processing**: Sends recorded audio to backend STT endpoint
- **Text-based Conversation**: Initializes conversation agent in text-only mode
- **Web Speech API TTS**: Speaks bot responses using browser's speech synthesis

#### Key Functions:
- `initializeMediaRecorder()`: Sets up audio recording
- `startRecording()` / `stopRecording()`: Manual recording controls
- `processAudioWithSTT()`: Sends audio to STT API and processes response
- `sendTextToConversationAgent()`: Sends transcribed text to conversation agent
- `speakResponse()`: Uses Web Speech API to speak bot responses

### 3. UI Changes
- **Recording Button**: Start/stop recording with visual feedback and animations
- **Processing Indicators**: Shows "Processing audio..." while STT is working
- **System Messages**: New message type for status updates

### 4. Package Updates
- Updated from `@11labs/client` to `@elevenlabs/client` (latest package name)
- Added `multer` and `form-data` dependencies for file uploads

## How It Works Now

1. **User clicks "Start Recording"** → Browser requests microphone permission
2. **Audio Recording** → MediaRecorder captures audio in WebM format
3. **User clicks "Stop Recording"** → Audio recording stops and is processed
4. **STT Processing** → Audio blob is sent to `/api/speech-to-text` endpoint
5. **ElevenLabs STT** → Backend forwards audio to ElevenLabs STT API
6. **Text Extraction** → Transcribed text is returned to frontend
7. **Conversation Agent** → Text is sent to ElevenLabs conversation agent
8. **Bot Response** → Agent response is displayed and spoken using Web Speech API

## Benefits

- **Full Control**: You control when recording starts/stops
- **Better Error Handling**: Can handle STT failures gracefully
- **Debugging**: Can see exactly what text was transcribed
- **Flexibility**: Can modify STT parameters or switch providers easily
- **Fallback TTS**: Uses browser's built-in speech synthesis for responses

## To Test

1. Build the application: `npm run build`
2. Start the server: `npm start` (Node.js) or `npm run start:python` (Python)
3. Open `http://localhost:3000`
4. Click "Start Recording" and speak
5. Click "Stop Recording" to process your speech
6. See the transcribed text appear in chat
7. Hear the bot's response spoken aloud

## Environment Variables Required

Create a `.env` file with:
```
AGENT_ID=your_elevenlabs_agent_id
XI_API_KEY=your_elevenlabs_api_key
```

The application now provides a much more controlled and debuggable speech-to-text workflow while still leveraging ElevenLabs' powerful STT and conversational AI capabilities.
