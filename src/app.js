// --- src/app.js ---
import { Conversation } from '@11labs/client';

let conversation = null;
let mouthAnimationInterval = null;
let currentMouthState = 'M130,170 Q150,175 170,170'; // closed mouth

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

async function sendMessage() {
    const chatInput = document.getElementById('userInput');
    const message = chatInput.value.trim();
    if (!message) return;
    console.log('[Frontend] Sending message:', message);
    addMessageToChat(message, 'user');
    chatInput.value = '';
    setInputEnabled(false);
    if (conversation) {
        try {
            await conversation.sendText(message);
            console.log('[Frontend] Message sent to Conversation SDK:', message);
        } catch (err) {
            console.error('[Frontend] Error sending message to Conversation SDK:', err);
            showError('Failed to send message.');
            setInputEnabled(true);
        }
    } else {
        showError('Not connected to the agent. Please refresh.');
        setInputEnabled(true);
    }
}

function addMessageToChat(message, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    if (sender === 'user') {
        messageElement.classList.add('user-message');
    } else {
        messageElement.classList.add('bot-message');
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

async function initializeConversation() {
    // Do not auto-start conversation or voice session on page load
    // Only set up the Conversation object when user clicks Start Conversation
}

async function startConversation() {
    const startButton = document.getElementById('startButton');
    const endButton = document.getElementById('endButton');
    try {
        startButton.disabled = true;
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
            alert('Microphone permission is required for the conversation.');
            startButton.disabled = false;
            return;
        }
        const signedUrl = await getSignedUrl();
        conversation = await Conversation.startSession({
            signedUrl,
            onConnect: () => {
                console.log('Connected');
                updateStatus(true);
                setFormControlsState(true);
                startButton.style.display = 'none';
                endButton.disabled = false;
                endButton.style.display = 'flex';
            },
            onDisconnect: () => {
                console.log('Disconnected');
                updateStatus(false);
                setFormControlsState(false);
                startButton.disabled = false;
                startButton.style.display = 'flex';
                endButton.disabled = true;
                endButton.style.display = 'none';
                updateSpeakingStatus({ mode: 'listening' });
                stopMouthAnimation();
            },
            onError: (error) => {
                console.error('Conversation error:', error);
                setFormControlsState(false);
                startButton.disabled = false;
                startButton.style.display = 'flex';
                endButton.disabled = true;
                endButton.style.display = 'none';
                alert('An error occurred during the conversation.');
            },
            onMessage: (msg) => {
                console.log('[Frontend] Conversation message:', msg);
                if (msg && typeof msg === 'object') {
                    Object.keys(msg).forEach(key => {
                        console.log(`[Frontend] msg key: ${key}, value:`, msg[key]);
                    });
                }
                // Handle ElevenLabs SDK v2 message structure
                if (msg.type === 'bot_utterance') {
                    console.log('[Frontend] Adding bot_utterance to chat:', msg.text);
                    addMessageToChat(msg.text, 'bot');
                    setInputEnabled(true);
                } else if (msg.type === 'transcript' || msg.type === 'user_transcript') {
                    console.log('[Frontend] Adding user transcript to chat:', msg.text);
                    if (msg.text) {
                        addMessageToChat(msg.text, 'user');
                    }
                } else if (msg.type === 'tts' && msg.text) {
                    console.log('[Frontend] Adding TTS to chat:', msg.text);
                    addMessageToChat(msg.text, 'bot');
                } else if (msg.source === 'ai' && msg.message) {
                    // New SDK: bot reply
                    console.log('[Frontend] Adding AI message to chat:', msg.message);
                    addMessageToChat(msg.message, 'bot');
                } else if (msg.source === 'user' && msg.message) {
                    // New SDK: user transcript
                    console.log('[Frontend] Adding user message to chat:', msg.message);
                    addMessageToChat(msg.message, 'user');
                } else if (msg.text && !(msg.type === 'user_transcript' || msg.type === 'transcript')) {
                    // Fallback: If message has text and is not a user transcript, treat as bot message
                    console.log('[Frontend] Fallback: Adding message with text to chat as bot:', msg.text);
                    addMessageToChat(msg.text, 'bot');
                } else {
                    console.log('[Frontend] Unhandled message type or structure:', msg);
                }
            },
            onModeChange: (mode) => {
                updateSpeakingStatus(mode);
            }
        });
    } catch (error) {
        console.error('Error starting conversation:', error);
        setFormControlsState(false);
        startButton.disabled = false;
        alert('Failed to start conversation. Please try again.');
    }
}

async function endConversation() {
    if (conversation) {
        await conversation.endSession();
        conversation = null;
    }
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    updateStatus(false);
    updateSpeakingStatus({ mode: 'silent' });
    setupChatInterface();
    // Do not call initializeConversation here
    const startButton = document.getElementById('startButton');
    const endButton = document.getElementById('endButton');
    if (startButton && endButton) {
        startButton.addEventListener('click', startConversation);
        endButton.addEventListener('click', endConversation);
        endButton.style.display = 'none';
    }
});