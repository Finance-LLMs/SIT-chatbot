// Test STT endpoint
const FormData = require('form-data');
const fs = require('fs');
const { fetch } = require('undici');
require('dotenv').config();

async function testSTT() {
    const xiApiKey = process.env.XI_API_KEY;
    console.log('XI_API_KEY:', xiApiKey ? 'Set' : 'Not set');
    console.log('AGENT_ID:', process.env.AGENT_ID ? 'Set' : 'Not set');
    
    if (!xiApiKey) {
        console.error('XI_API_KEY not found in environment');
        return;
    }
    
    // Check if we have a test audio file
    const testFile = process.argv[2]; // Allow passing file path as argument
    if (!testFile) {
        console.log('No test file provided. Creating synthetic audio data...');
        
        // Create synthetic audio data - this is just to test API connection
        // In reality, this won't convert to speech but helps test the API endpoints
        // A real test would use a real audio file
        const sampleRate = 16000;
        const lengthSec = 2;
        const numSamples = sampleRate * lengthSec;
        
        // Create a simple sine wave as fake audio
        const audioData = new Uint8Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
            audioData[i] = Math.floor(127 * Math.sin(i * 0.01) + 128); // Simple sine wave
        }
        
        console.log(`Created synthetic audio data: ${audioData.length} bytes`);
        testWithBuffer(Buffer.from(audioData));
    } else {
        console.log(`Using test file: ${testFile}`);
        if (!fs.existsSync(testFile)) {
            console.error(`File not found: ${testFile}`);
            return;
        }
        
        const fileBuffer = fs.readFileSync(testFile);
        console.log(`Read ${fileBuffer.length} bytes from file`);
        testWithBuffer(fileBuffer);
    }
    
    async function testWithBuffer(buffer) {
        try {
            console.log(`Testing with ${buffer.length} bytes of audio data`);
            
            // Test direct API call to ElevenLabs
            const formData = new FormData();
            
            formData.append('audio', buffer, {
                filename: 'test.webm',
                contentType: 'audio/webm'
            });
            
            console.log('Sending request to ElevenLabs STT API...');
            
            // Get headers object from FormData
            const headers = formData.getHeaders ? formData.getHeaders() : {};
            headers['xi-api-key'] = xiApiKey;
            
            const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
                method: 'POST',
                headers: headers,
                body: formData
            });
            
            console.log('Response status:', response.status);
            
            const responseText = await response.text();
            console.log('Response:', responseText);
            
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

testSTT();
