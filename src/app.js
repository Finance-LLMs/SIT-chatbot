// --- src/app.js ---
import { Conversation } from '@elevenlabs/client';

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

// Initialize the avatar and chat functionality
document.addEventListener('DOMContentLoaded', async () => {
    // Insert the otter avatar
    const avatarWrapper = document.getElementById('animatedAvatar');
    avatarWrapper.innerHTML = createAvatarSVG();
    
    // Set up connection and speech
    try {
        // Initialize conversation
        await initializeConversation();
        
        // Set up event handlers
        setupEventHandlers();
        
        // Enable send button
        document.getElementById('sendButton').disabled = false;
        document.getElementById('voiceButton').disabled = false;
        
        // Setup chat interface
        setupChatInterface();
    } catch (error) {
        console.error("Error initializing:", error);
        showError("Failed to initialize chat. Please try again later.");
    }
});

// Set up the chat interface
function setupChatInterface() {
    const chatInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const voiceButton = document.getElementById('voiceButton');
    
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
    
    // Handle voice input when Voice button is clicked
    voiceButton.addEventListener('click', () => {
        toggleVoiceRecording();
    });
}

// Function to send a message
async function sendMessage() {
    const chatInput = document.getElementById('userInput');
    const message = chatInput.value.trim();
    
    if (message) {
        // Add user message to chat
        addMessageToChat(message, 'user');
        
        // Clear input field
        chatInput.value = '';
        
        // Send to ElevenLabs API and get response
        try {
            // Disable input while processing
            setInputEnabled(false);
            
            // Start animating the avatar
            startMouthAnimation();
            
            // Send message to API
            if (conversation) {
                await conversation.text({ text: message });
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            addMessageToChat('Sorry, there was an error processing your message. Please try again.', 'bot');
        } finally {
            // Re-enable input
            setInputEnabled(true);
            
            // Stop avatar animation
            stopMouthAnimation();
        }
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
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Enable/disable input controls
function setInputEnabled(enabled) {
    document.getElementById('userInput').disabled = !enabled;
    document.getElementById('sendButton').disabled = !enabled;
    document.getElementById('voiceButton').disabled = !enabled;
}

// Toggle voice recording
function toggleVoiceRecording() {
    // Voice recording functionality can be implemented here
    alert('Voice recording not implemented in this demo');
}

// Show error message
function showError(message) {
    addMessageToChat(message, 'bot');
}

async function initializeConversation() {
    try {
        // Get the agent ID from the server
        const response = await fetch('/api/signed-url');
        const data = await response.json();
        
        // Initialize the conversation
        conversation = new Conversation(data.signedUrl);
        
        // Set up event listeners for the conversation
        conversation.on('connected', handleConnected);
        conversation.on('speaking-started', handleSpeakingStarted);
        conversation.on('speaking-stopped', handleSpeakingStopped);
        conversation.on('text', handleBotResponse);
        
        await conversation.connect();
        
        document.getElementById('connectionStatus').textContent = 'Connected';
        document.getElementById('connectionStatus').classList.add('connected');
        
        // Add welcome message if needed
        // handleBotResponse("Hello! I'm the SIT Otter Assistant. How can I help you today?");
    } catch (error) {
        console.error("Error connecting:", error);
        document.getElementById('connectionStatus').textContent = 'Connection Failed';
        document.getElementById('connectionStatus').classList.remove('hidden');
        throw error;
    }
}

function setupEventHandlers() {
    // Handle voice button for recording
    let isRecording = false;
    const voiceButton = document.getElementById('voiceButton');
    
    voiceButton.addEventListener('click', () => {
        if (isRecording) {
            conversation.stopRecording();
            voiceButton.style.backgroundColor = '#005EB8';
            isRecording = false;
        } else {
            conversation.startRecording();
            voiceButton.style.backgroundColor = '#dc2626';
            isRecording = true;
        }
    });
}

// These functions handle the ElevenLabs conversation events
function handleConnected() {
    document.getElementById('connectionStatus').textContent = 'Connected';
    document.getElementById('connectionStatus').classList.add('connected');
    setTimeout(() => {
        document.getElementById('connectionStatus').classList.add('hidden');
    }, 2000);
}

function handleSpeakingStarted() {
    document.getElementById('speakingStatus').textContent = 'Speaking';
    document.getElementById('speakingStatus').classList.remove('hidden');
    document.getElementById('speakingStatus').classList.add('speaking');
    
    // Animate mouth
    startMouthAnimation();
    
    // Add avatar speaking class
    const avatarWrapper = document.getElementById('animatedAvatar');
    if (avatarWrapper) {
        avatarWrapper.classList.add('avatar-speaking');
    }
}

function handleSpeakingStopped() {
    document.getElementById('speakingStatus').textContent = 'Silent';
    document.getElementById('speakingStatus').classList.remove('speaking');
    
    setTimeout(() => {
        document.getElementById('speakingStatus').classList.add('hidden');
    }, 1000);
    
    // Stop mouth animation
    stopMouthAnimation();
    
    // Remove avatar speaking class
    const avatarWrapper = document.getElementById('animatedAvatar');
    if (avatarWrapper) {
        avatarWrapper.classList.remove('avatar-speaking');
    }
}

function handleBotResponse(text) {
    addMessageToChat(text, 'bot');
}

// Start mouth animation for speaking
function startMouthAnimation() {
    // Clear any existing interval
    if (mouthAnimationInterval) {
        clearInterval(mouthAnimationInterval);
    }
    
    // Animate between open and closed mouth
    mouthAnimationInterval = setInterval(() => {
        const mouthElement = document.getElementById('avatarMouth');
        if (mouthElement) {
            if (currentMouthState === 'M130,170 Q150,175 170,170') {
                // Open mouth
                currentMouthState = 'M130,170 Q150,185 170,170';
            } else {
                // Close mouth
                currentMouthState = 'M130,170 Q150,175 170,170';
            }
            mouthElement.setAttribute('d', currentMouthState);
        }
    }, 150);
}

// Stop mouth animation
function stopMouthAnimation() {
    // Clear interval
    if (mouthAnimationInterval) {
        clearInterval(mouthAnimationInterval);
        mouthAnimationInterval = null;
    }
    
    // Reset to closed mouth
    const mouthElement = document.getElementById('avatarMouth');
    if (mouthElement) {
        currentMouthState = 'M130,170 Q150,175 170,170';
        mouthElement.setAttribute('d', currentMouthState);
    }
}

function showError(message) {
    alert(message);
}