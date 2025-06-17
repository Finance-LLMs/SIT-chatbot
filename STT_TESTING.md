# Speech-to-Text Testing Guide

This guide will help you test the ElevenLabs Speech-to-Text integration with the SIT Chatbot.

## Prerequisites

1. Make sure your `.env` file is properly configured with:
   ```
   XI_API_KEY=your_elevenlabs_api_key
   AGENT_ID=your_agent_id
   PORT=3000
   ```

2. Make sure all dependencies are installed:
   ```bash
   npm install
   ```

## Running the Application

1. Start the application:
   ```bash
   npm start
   ```

2. Open your browser to `http://localhost:3000`

3. Click the "Start Recording" button, speak, and then click it again to stop recording

## Testing STT Directly

If you encounter issues, you can test the ElevenLabs STT API directly:

1. Create a test audio file (e.g., record yourself speaking)
2. Run the direct test script:
   ```bash
   node direct-elevenlabs-test.js path/to/your/audio-file.webm
   ```

This will attempt to send your audio file directly to ElevenLabs STT API and report the results.

## Troubleshooting Common Issues

### 1. 400 Error from ElevenLabs API

This typically means one of the following:
- The audio file is not in a format ElevenLabs supports (try .webm, .mp3, or .wav)
- The audio file is too small/short (speak for at least 2-3 seconds)
- The audio file is empty or corrupted

### 2. No Audio Detected

- Make sure your browser has permission to use the microphone
- Speak clearly and loudly enough for the microphone to pick up your voice
- Try recording for at least 2-3 seconds

### 3. Server Errors

- Check the server console for detailed error messages
- Verify your XI_API_KEY is correct and valid
- Make sure your audio file is not too large (keep under 10MB)

## Audio Format Recommendations

For best results with ElevenLabs STT API:
- Format: WebM with Opus codec
- Sample rate: 16kHz
- Channels: Mono (single channel)
- Duration: 1-30 seconds

## Debugging Tips

1. Check the browser console (F12) for frontend logs
2. Check the terminal where the server is running for backend logs
3. Use the direct test script for isolated STT API testing
