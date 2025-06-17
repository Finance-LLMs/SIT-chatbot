// Test ElevenLabs STT API directly with a minimal approach
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { fetch } = require('undici');
require('dotenv').config();

// This script attempts to send audio directly to ElevenLabs STT API
// It uses a very simple approach to eliminate potential issues

async function directTest() {
    // Get API Key from environment
    const xiApiKey = process.env.XI_API_KEY;
    if (!xiApiKey) {
        console.error('XI_API_KEY not found in environment');
        return;
    }
    
    console.log('Testing ElevenLabs STT API with minimal code...');
    
    // Check if file path was provided
    const testFilePath = process.argv[2];
    if (!testFilePath) {
        console.error('Please provide an audio file path as argument');
        console.error('Example: node direct-elevenlabs-test.js ./test-audio.webm');
        return;
    }
    
    // Check if file exists
    if (!fs.existsSync(testFilePath)) {
        console.error(`File not found: ${testFilePath}`);
        return;
    }
    
    // Read the file
    const fileBuffer = fs.readFileSync(testFilePath);
    console.log(`Read ${fileBuffer.length} bytes from ${testFilePath}`);
    
    // Get file info
    const fileName = path.basename(testFilePath);
    const fileExt = path.extname(testFilePath).toLowerCase();
    let mimeType = 'audio/webm'; // default
    
    // Set MIME type based on extension
    if (fileExt === '.mp3') mimeType = 'audio/mpeg';
    else if (fileExt === '.wav') mimeType = 'audio/wav';
    else if (fileExt === '.ogg') mimeType = 'audio/ogg';
    else if (fileExt === '.m4a') mimeType = 'audio/mp4';
    
    console.log(`File name: ${fileName}, MIME type: ${mimeType}`);
    
    // Create form data
    const formData = new FormData();
    formData.append('audio', fileBuffer, {
        filename: fileName,
        contentType: mimeType
    });
    
    try {
        console.log('Making request to ElevenLabs STT API...');
        
        // Get headers from FormData
        const formHeaders = formData.getHeaders();
        console.log('Form headers:', formHeaders);
        
        const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
            method: 'POST',
            headers: {
                ...formHeaders,
                'xi-api-key': xiApiKey
            },
            body: formData
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        const responseText = await response.text();
        console.log('Response body:', responseText);
        
        if (response.ok) {
            try {
                const json = JSON.parse(responseText);
                console.log('Transcription:', json.text);
            } catch (e) {
                console.error('Failed to parse JSON response:', e);
            }
        }
    } catch (error) {
        console.error('Error making request:', error);
    }
}

// Run test
directTest();
