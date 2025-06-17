// --- src/app.js ---
import { Conversation } from '@elevenlabs/client';

let conversation = null;
let mouthAnimationInterval = null;
let currentMouthState = 'M130,170 Q150,175 170,170'; // closed mouth
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// Create the animated otter avatar SVG
function createAvatarSVG() {
    return `
        <svg viewBox="0 0 300 400" fill="none" xmlns="http://www.w3.org/2000/svg" class="avatar-svg otter-avatar">
            <!-- Otter body -->
            <ellipse cx="150" cy="240" rx="70" ry="90" fill="#8B5A2B" />
            
            <!-- Lighter belly -->
            <ellipse cx="150" cy="250" rx="50" ry="65" fill="#D2B48C" />
            
            <!-- Tail -->
            <path d="M95,270 C75,290 75,320 90,340 C105,360 120,350 125,340" fill="#8B5A2B" />
            
            <!-- Head -->
            <ellipse cx="150" cy="140" rx="60" ry="55" fill="#8B5A2B" />
            
            <!-- Ears -->
            <ellipse cx="105" cy="100" rx="15" ry="18" fill="#8B5A2B" />
            <ellipse cx="195" cy="100" rx="15" ry="18" fill="#8B5A2B" />
            <ellipse cx="105" cy="100" rx="8" ry="10" fill="#D2B48C" />
            <ellipse cx="195" cy="100" rx="8" ry="10" fill="#D2B48C" />
            
            <!-- Face white patch -->
            <ellipse cx="150" cy="150" rx="40" ry="35" fill="#F5F5DC" />
            
            <!-- Eyes -->
            <ellipse cx="130" cy="130" rx="10" ry="12" fill="white" />
            <ellipse cx="170" cy="130" rx="10" ry="12" fill="white" />
            <circle cx="130" cy="130" r="6" fill="#000000" />
            <circle cx="170" cy="130" r="6" fill="#000000" />
            <circle cx="128" cy="128" r="2" fill="white" />
            <circle cx="168" cy="128" r="2" fill="white" />
            
            <!-- Nose -->
            <ellipse cx="150" cy="155" rx="12" ry="8" fill="#5D4037" />
            
            <!-- Whiskers -->
            <line x1="155" y1="155" x2="190" y2="145" stroke="#5D4037" stroke-width="1.5" />
            <line x1="155" y1="158" x2="190" y2="158" stroke="#5D4037" stroke-width="1.5" />
            <line x1="155" y1="161" x2="190" y2="170" stroke="#5D4037" stroke-width="1.5" />
            <line x1="145" y1="155" x2="110" y2="145" stroke="#5D4037" stroke-width="1.5" />
            <line x1="145" y1="158" x2="110" y2="158" stroke="#5D4037" stroke-width="1.5" />
            <line x1="145" y1="161" x2="110" y2="170" stroke="#5D4037" stroke-width="1.5" />
            
            <!-- Mouth -->
            <path 
                id="avatarMouth"
                d="${currentMouthState}"
                stroke="#5D4037" 
                stroke-width="1.5" 
                fill="none"
            />
            
            <!-- SIT graduation cap -->
            <path d="M100,85 L200,85 L200,70 L100,70 Z" fill="#003B73" />
            <path d="M120,70 L180,70 L150,40 Z" fill="#003B73" />
            <path d="M150,40 L150,30 L160,25" stroke="#FFD700" stroke-width="2" />
            <circle cx="160" cy="25" r="3" fill="#FFD700" />
        </svg>
    `;
}

// Initialize avatar
function initializeAvatar() {
    // Insert the otter avatar
    const avatarWrapper = document.getElementById('animatedAvatar');
    avatarWrapper.innerHTML = createAvatarSVG();
}

// Animate mouth when speaking
function startMouthAnimation() {
    if (mouthAnimationInterval) return; // Already animating
    
    const avatarWrapper = document.getElementById('animatedAvatar');
    if (avatarWrapper) {
        avatarWrapper.classList.add('avatar-speaking');
        
        // Show the speaking indicator
        const speakingIndicator = document.getElementById('speakingIndicator');
        if (speakingIndicator) {
            speakingIndicator.style.display = 'flex';
        }
    }
    
    mouthAnimationInterval = setInterval(() => {
        const mouthElement = document.getElementById('avatarMouth');
        if (mouthElement) {
            // Random probability to change mouth state - creates natural speaking pattern
            const shouldChangeMouth = Math.random() > 0.4; // 60% chance to change
            
            if (shouldChangeMouth) {
                currentMouthState = currentMouthState === 'M130,170 Q150,175 170,170' 
                    ? 'M130,170 Q150,195 170,170' // open mouth (oval)
                    : 'M130,170 Q150,175 170,170'; // closed mouth
                
                mouthElement.setAttribute('d', currentMouthState);
                mouthElement.setAttribute('fill', currentMouthState.includes('195') ? '#8B4513' : 'none');
                mouthElement.setAttribute('opacity', currentMouthState.includes('195') ? '0.7' : '1');
            }
        }
    }, Math.random() * 200 + 100); // Variable timing 100-300ms
}

// Stop mouth animation
function stopMouthAnimation() {
    if (mouthAnimationInterval) {
        clearInterval(mouthAnimationInterval);
        mouthAnimationInterval = null;
    }
    
    const avatarWrapper = document.getElementById('animatedAvatar');
    if (avatarWrapper) {
        avatarWrapper.classList.remove('avatar-speaking');
        
        // Hide speaking indicator
        const speakingIndicator = document.getElementById('speakingIndicator');
        if (speakingIndicator) {
            speakingIndicator.style.display = 'none';
        }
    }
    
    // Reset mouth to closed state
    currentMouthState = 'M130,170 Q150,175 170,170';
    const mouthElement = document.getElementById('avatarMouth');
    if (mouthElement) {
        mouthElement.setAttribute('d', currentMouthState);
        mouthElement.setAttribute('fill', 'none');
        mouthElement.setAttribute('opacity', '1');
    }
}

async function requestMicrophonePermission() {
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        return true;
    } catch (error) {
        console.error('Microphone permission denied:', error);
        return false;
    }
}

// Initialize MediaRecorder for manual audio recording
async function initializeMediaRecorder() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true
            } 
        });
        
        // Check what MIME types are supported
        const supportedTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/wav'
        ];
        
        let mimeType = 'audio/webm';
        for (const type of supportedTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                mimeType = type;
                console.log('Using MIME type:', mimeType);
                break;
            }
        }
        
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: mimeType
        });
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                console.log('Audio chunk received:', event.data.size, 'bytes');
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            console.log('Recording stopped, processing', audioChunks.length, 'chunks');
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            console.log('Final audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
            audioChunks = [];
            
            if (audioBlob.size === 0) {
                showError('No audio recorded. Please try again.');
                return;
            }
            
            await processAudioWithSTT(audioBlob);
        };
        
        mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event.error);
            showError('Audio recording error: ' + event.error.message);
        };
        
        return true;
    } catch (error) {
        console.error('Failed to initialize MediaRecorder:', error);
        return false;
    }
}

// Start manual audio recording
async function startRecording() {
    if (!mediaRecorder) {
        const initialized = await initializeMediaRecorder();
        if (!initialized) {
            showError('Failed to initialize audio recording');
            return;
        }
    }
    
    if (mediaRecorder.state === 'inactive') {
        audioChunks = [];
        mediaRecorder.start();
        isRecording = true;
        updateRecordingUI(true);
        console.log('Started recording...');
        
        // Show a helpful message
        addMessageToChat('🎤 Recording started. Speak clearly and click stop when done.', 'system');
    }
}

// Stop manual audio recording
async function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        isRecording = false;
        updateRecordingUI(false);
        console.log('Stopped recording...');
        
        // Remove the recording message
        removeLastSystemMessage();
    }
}

// Process audio through ElevenLabs STT
async function processAudioWithSTT(audioBlob) {
    try {
        console.log('Processing audio with STT...', audioBlob);
        console.log('Audio blob size:', audioBlob.size, 'bytes');
        console.log('Audio blob type:', audioBlob.type);
        
        // Validate audio before sending
        if (audioBlob.size < 1000) {
            console.error('Audio file too small, likely no speech detected');
            showError('Recording too short. Please speak longer and try again.');
            return;
        }
        
        // Show processing state
        addMessageToChat('Processing audio...', 'system');
        
        const formData = new FormData();
        
        // Use the detected MIME type from the blob
        const fileName = `recording-${Date.now()}.${audioBlob.type.split('/')[1] || 'webm'}`;
        formData.append('audio', audioBlob, fileName);
        
        console.log(`Sending STT request with filename: ${fileName}`);
        
        const response = await fetch('/api/speech-to-text', {
            method: 'POST',
            body: formData
        });
        
        console.log('STT response status:', response.status);
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
                console.error('STT API error response:', errorData);
            } catch (e) {
                const errorText = await response.text().catch(() => null);
                console.error('STT API error text:', errorText);
                errorData = { error: 'Unknown error', details: errorText };
            }
            
            let errorMessage = `STT API failed: ${response.status}`;
            if (errorData && errorData.details) {
                errorMessage += ` - ${errorData.details}`;
            } else if (errorData && errorData.error) {
                errorMessage += ` - ${errorData.error}`;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        const transcribedText = data.text;
        
        console.log('STT Result:', transcribedText);
        
        if (transcribedText && transcribedText.trim()) {
            // Remove the processing message
            removeLastSystemMessage();
            
            // Add user message
            addMessageToChat(transcribedText, 'user');
            
            // Send to conversational agent via text
            await sendTextToConversationAgent(transcribedText);
        } else {
            // Remove the processing message and show error
            removeLastSystemMessage();
            showError('No speech detected. Please speak clearly and try again.');
        }
    } catch (error) {
        console.error('STT processing failed:', error);
        removeLastSystemMessage();
        showError(`Failed to process audio: ${error.message}`);
    }
}

// Send text to conversational agent (text-only mode)
async function sendTextToConversationAgent(text) {
    try {
        if (!conversation) {
            // Initialize conversation in text-only mode
            const signedUrl = await getSignedUrl();
            conversation = await Conversation.startSession({
                signedUrl,
                // Disable automatic voice input/output
                onConnect: () => {
                    console.log('Connected to conversation agent (text mode)');
                },
                onDisconnect: () => {
                    console.log('Disconnected from conversation agent');
                    conversation = null;
                },
                onError: (error) => {
                    console.error('Conversation error:', error);
                },
                onMessage: (msg) => {
                    console.log('Conversation message:', msg);
                    if (msg.type === 'bot_utterance' || (msg.source === 'ai' && msg.message)) {
                        const botText = msg.text || msg.message;
                        if (botText) {
                            addMessageToChat(botText, 'bot');
                            // Speak the response using TTS
                            speakResponse(botText);
                        }
                    }
                }
            });
        }
        
        // Send the text message
        await conversation.sendText(text);
        console.log('Text sent to conversation agent:', text);
        
    } catch (error) {
        console.error('Failed to send text to conversation agent:', error);
        showError('Failed to send message to agent.');
    }
}

// Speak response using Web Speech API or ElevenLabs TTS
async function speakResponse(text) {
    try {
        startMouthAnimation();
        
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            
            utterance.onend = () => {
                stopMouthAnimation();
            };
            
            utterance.onerror = () => {
                stopMouthAnimation();
            };
            
            speechSynthesis.speak(utterance);
        } else {
            // Fallback: just animate mouth for a duration
            setTimeout(() => {
                stopMouthAnimation();
            }, text.length * 50); // Rough estimate based on text length
        }
    } catch (error) {
        console.error('Failed to speak response:', error);
        stopMouthAnimation();
    }
}

// Update recording UI state
function updateRecordingUI(recording) {
    const startButton = document.getElementById('startButton');
    
    if (recording) {
        startButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="6" height="6"/>
                <path d="m9 9 6 6"/>
                <path d="m15 9-6 6"/>
            </svg>
            Recording... (Click to stop)
        `;
        startButton.classList.add('recording');
        startButton.onclick = stopRecording;
    } else {
        startButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" x2="12" y1="19" y2="22"/>
                <line x1="8" x2="16" y1="22" y2="22"/>
            </svg>
            Start Recording
        `;
        startButton.classList.remove('recording');
        startButton.onclick = startRecording;
    }
}

// Remove last system message (for processing indicators)
function removeLastSystemMessage() {
    const chatMessages = document.getElementById('chatMessages');
    const messages = chatMessages.getElementsByClassName('message');
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && lastMessage.classList.contains('system-message')) {
        lastMessage.remove();
    }
}

// Add debugging logs for frontend API calls
async function getSignedUrl() {
    try {
        const url = '/api/signed-url';
        console.log('[Frontend] Fetching signed URL from:', url);
        const response = await fetch(url);
        console.log('[Frontend] Signed URL response status:', response.status);
        if (!response.ok) throw new Error('Failed to get signed URL');
        const data = await response.json();
        console.log('[Frontend] Signed URL data:', data);
        return data.signedUrl;
    } catch (error) {
        console.error('[Frontend] Error getting signed URL:', error);
        throw error;
    }
}

function updateStatus(isConnected) {
    const statusElement = document.getElementById('connectionStatus');
    statusElement.textContent = isConnected ? 'Connected' : 'Disconnected';
    statusElement.classList.toggle('connected', isConnected);
}

function updateSpeakingStatus(mode) {
    const statusElement = document.getElementById('speakingStatus');
    const isSpeaking = mode && mode.mode === 'speaking';
    statusElement.textContent = isSpeaking ? 'Agent Speaking' : 'Agent Silent';
    statusElement.classList.toggle('speaking', isSpeaking);
    statusElement.classList.remove('hidden');
    if (isSpeaking) {
        startMouthAnimation();
    } else {
        stopMouthAnimation();
    }
    console.log('[Frontend] Speaking status updated:', { mode, isSpeaking });
}

function setFormControlsState(disabled) {
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    if (userInput) userInput.disabled = disabled;
    if (sendButton) sendButton.disabled = disabled;
}

function setupChatInterface() {
    // No text input or send button to wire up
    initializeAvatar();
}

function addMessageToChat(message, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    if (sender === 'user') {
        messageElement.classList.add('user-message');
    } else if (sender === 'bot') {
        messageElement.classList.add('bot-message');
    } else if (sender === 'system') {
        messageElement.classList.add('system-message');
    }
    
    messageElement.innerHTML = `
        <div class="message-content">${message}</div>
    `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setInputEnabled(enabled) {
    setFormControlsState(!enabled);
}

function showError(message) {
    addMessageToChat(message, 'bot');
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    updateStatus(false);
    updateSpeakingStatus({ mode: 'silent' });
    setupChatInterface();
    
    const startButton = document.getElementById('startButton');
    const endButton = document.getElementById('endButton');
    
    if (startButton && endButton) {
        // Setup the recording button
        startButton.onclick = startRecording;
        
        // Hide the end button since we're using manual recording
        endButton.style.display = 'none';
        
        // Request microphone permission on page load
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
            showError('Microphone permission is required for voice recording.');
        }
    }
});
