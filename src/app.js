// --- src/app.js ---
// Direct script reference - no import needed here

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

// Create otter avatar
function createAvatar() {
    return `
        <div class="celebrity-avatar-container">
            <div class="default-avatar">
                ${createAvatarSVG()}
            </div>
            <div class="speaking-indicator" id="speakingIndicator">
                <div class="speaking-wave"></div>
                <div class="speaking-wave"></div>
                <div class="speaking-wave"></div>
            </div>
        </div>
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
        
        // If it's a celebrity avatar, show the speaking indicator
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
        
        // Hide speaking indicator for celebrity avatars
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

// Add debugging logs for frontend API calls and WebSocket events
async function getSignedUrl(opponent) {
    try {
        const url = opponent ? `/api/signed-url?opponent=${opponent}` : '/api/signed-url';
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

async function getAgentId() {
    console.log('[Frontend] Fetching agent ID...');
    const response = await fetch('/api/getAgentId');
    console.log('[Frontend] Agent ID response status:', response.status);
    const { agentId } = await response.json();
    console.log('[Frontend] Received agentId:', agentId);
    return agentId;
}

function updateStatus(isConnected) {
    const statusElement = document.getElementById('connectionStatus');
    statusElement.textContent = isConnected ? 'Connected' : 'Disconnected';
    statusElement.classList.toggle('connected', isConnected);
}

function updateSpeakingStatus(mode) {
    const statusElement = document.getElementById('speakingStatus');
    // Update based on the exact mode string we receive
    const isSpeaking = mode && mode.mode === 'speaking';
    statusElement.textContent = isSpeaking ? 'Agent Speaking' : 'Agent Silent';
    statusElement.classList.toggle('speaking', isSpeaking);
    statusElement.classList.remove('hidden');
    // Animate avatar based on speaking state
    if (isSpeaking) {
        startMouthAnimation();
    } else {
        stopMouthAnimation();
    }
}

// Function to disable/enable form controls
function setFormControlsState(disabled) {
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const voiceButton = document.getElementById('voiceButton');
    if (userInput) userInput.disabled = disabled;
    if (sendButton) sendButton.disabled = disabled;
    if (voiceButton) voiceButton.disabled = disabled;
}

// Set up the chat interface
function setupChatInterface() {
    const chatInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const voiceButton = document.getElementById('voiceButton');
    // Initialize the avatar
    initializeAvatar();
    // Send message when Send button is clicked
    sendButton.addEventListener('click', () => {
        sendMessage();
    });
    // Send message when Enter key is pressed
    chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });
    // Voice button handled in setupEventHandlers
}

// Function to send a message
async function sendMessage() {
    const chatInput = document.getElementById('userInput');
    const message = chatInput.value.trim();
    if (!message) return;
    console.log('[Frontend] Sending message:', message);
    addMessageToChat(message, 'user');
    chatInput.value = '';
    setInputEnabled(false);
    if (conversation && conversation.readyState === WebSocket.OPEN) {
        conversation.send(JSON.stringify({
            type: 'user_utterance',
            text: message
        }));
        console.log('[Frontend] Message sent to WebSocket:', message);
    } else {
        console.error('[Frontend] Not connected to the agent.');
        showError('Not connected to the agent. Please refresh.');
        setInputEnabled(true);
    }
}

// Add a message to the chat area
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

// Enable/disable input controls
function setInputEnabled(enabled) {
    setFormControlsState(!enabled);
}

// Show error message
function showError(message) {
    addMessageToChat(message, 'bot');
}

// Initialize conversation with ElevenLabs
async function initializeConversation() {
    try {
        const signedUrl = await getSignedUrl();
        console.log('[Frontend] Connecting WebSocket to:', signedUrl);
        conversation = new WebSocket(signedUrl);
        conversation.onopen = () => {
            console.log('[Frontend] WebSocket connection opened');
            updateStatus(true);
            setInputEnabled(true);
        };
        conversation.onclose = () => {
            console.log('[Frontend] WebSocket connection closed');
            updateStatus(false);
            setInputEnabled(false);
        };
        conversation.onerror = (e) => {
            console.error('[Frontend] WebSocket error:', e);
            updateStatus(false);
            showError('Connection error. Please refresh.');
        };
        conversation.onmessage = (event) => {
            let data;
            try {
                data = JSON.parse(event.data);
            } catch (e) {
                console.error('[Frontend] Error parsing WebSocket message:', event.data);
                return;
            }
            console.log('[Frontend] WebSocket message received:', data);
            if (data.type === 'bot_utterance') {
                addMessageToChat(data.text, 'bot');
                setInputEnabled(true);
            } else if (data.type === 'speaking_status') {
                updateSpeakingStatus(data);
            }
        };
    } catch (error) {
        console.error('[Frontend] Failed to connect to agent:', error);
        showError('Failed to connect to agent.');
        setInputEnabled(false);
    }
}

function setupEventHandlers() {
    // Handle voice button for recording (placeholder, not implemented)
    const voiceButton = document.getElementById('voiceButton');
    voiceButton.addEventListener('click', async () => {
        showError('Voice input not implemented in this demo.');
    });
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    updateStatus(false);
    updateSpeakingStatus({ mode: 'silent' });
    setupChatInterface();
    setupEventHandlers();
    await initializeConversation();
});