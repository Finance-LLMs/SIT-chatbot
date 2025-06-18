// --- src/app.js ---
import { Conversation } from '@elevenlabs/client';

let conversation = null;
let sttStream = null;
let isRecording = false;
let user_input = '';
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

// Process text before sending to conversation agent
function get_context(text) {
    // Process the text before sending to the agent
    console.log('[Frontend] Processing text through get_context:', text);
    
    // Basic text processing
    let processedText = text.trim();
    
    // Remove any excessive whitespace
    processedText = processedText.replace(/\s+/g, ' ');
    
    // Basic text normalization (optional enhancements)
    // Convert to lowercase if needed for consistency
    // processedText = processedText.toLowerCase();
    
    // Filter out common filler words if needed
    // const fillerWords = ['um', 'uh', 'like', 'you know', 'actually', 'basically'];
    // fillerWords.forEach(word => {
    //     processedText = processedText.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    // });
    
    // Clean up any double spaces created by the replacements
    processedText = processedText.replace(/\s+/g, ' ').trim();
    
    console.log('[Frontend] Text after processing:', processedText);
    
    return processedText;
}

// Start speech to text recording
async function startSpeechToText() {
    try {
        // Check if we have an active conversation
        if (!conversation) {
            throw new Error('Conversation not initialized. Please start the conversation first.');
        }
        
        isRecording = true;
        console.log('[Frontend] Starting STT recording');
        
        try {
            // Start recording using the browser's MediaRecorder API
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];
            
            // Store the mediaRecorder in the sttStream variable for access when stopping
            sttStream = {
                mediaRecorder,
                stream,
                stop: function() {
                    if (mediaRecorder.state !== 'inactive') {
                        mediaRecorder.stop();
                    }
                    // Stop all tracks in the stream
                    stream.getTracks().forEach(track => track.stop());
                }
            };
            
            // Event handlers for the MediaRecorder
            mediaRecorder.addEventListener('dataavailable', event => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            });
            
            mediaRecorder.addEventListener('stop', async () => {
                try {
                    // Create a blob from the audio chunks
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    
                    // Create a FormData object to send the audio file
                    const formData = new FormData();
                    formData.append('file', audioBlob, 'recording.wav');
                    formData.append('language', 'en'); // Default to English
                    
                    // Send the audio to our backend for transcription
                    console.log('[Frontend] Sending audio to backend for transcription');
                    const response = await fetch('/api/transcribe', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                    }
                    
                    // Get the transcription result
                    const result = await response.json();
                    if (result && result.text) {
                        console.log('[Frontend] Received transcription:', result.text);
                        user_input = result.text;
                        
                        // If handleStopSpeaking wasn't called yet, update the UI
                        if (isRecording) {
                            // Don't automatically display the transcribed text as a user message
                            // Only show what was transcribed in the chat as a system message
                            addMessageToChat(`Transcribed: "${result.text}"`, 'bot');
                            
                            // Update UI elements
                            document.getElementById('stopSpeakingButton').style.display = 'none';
                            document.getElementById('startSpeakingButton').style.display = 'flex';
                            document.getElementById('startSpeakingButton').disabled = false;
                            document.getElementById('sendToAgentButton').style.display = 'flex';
                            
                            updateSpeechStatus(false);
                            isRecording = false;
                        }
                    }
                } catch (error) {
                    console.error('[Frontend] Error getting transcription:', error);
                    showError('Failed to transcribe speech: ' + error.message);
                }
            });
            
            // Start recording
            mediaRecorder.start();
        } catch (convError) {
            console.error('[Frontend] Error starting speech recording:', convError);
            throw convError;
        }
        
        return sttStream;
    } catch (error) {
        console.error('[Frontend] Error starting speech to text:', error);
        showError('Failed to start speech recognition. ' + error.message);
        isRecording = false;
        updateSpeechStatus(false);
        return null;
    }
}

// Stop speech to text recording
async function stopSpeechToText() {
    if (isRecording) {
        try {
            // Stop the recording stream
            if (sttStream && typeof sttStream.stop === 'function') {
                // Our custom stop function for MediaRecorder
                sttStream.stop();
                console.log('[Frontend] MediaRecorder stopped');
                
                // Note: The transcription will happen in the 'stop' event handler of MediaRecorder
                // We won't have the transcript immediately here, it will be processed asynchronously
                
                // Return an empty string here because the transcription happens asynchronously
                // The UI will be updated in the MediaRecorder's stop event handler
                isRecording = false;
                return '';
            } 
            // Fallback to conversation.stopRecording if available
            else if (conversation && typeof conversation.stopRecording === 'function') {
                await conversation.stopRecording();
                console.log('[Frontend] STT recording stopped via conversation');
                
                isRecording = false;
                
                // Display the transcribed text in the chat
                if (user_input) {
                    addMessageToChat(user_input, 'user');
                    return user_input;
                }
            } 
            // If no known method is available, just log it
            else {
                console.warn('[Frontend] No method found to stop STT recording');
                isRecording = false;
            }
        } catch (error) {
            console.error('[Frontend] Error stopping STT stream:', error);
            isRecording = false;
        }
    }
    return '';
}

// Send the processed text to the conversation agent
async function sendProcessedText(text) {
    if (!text) return;
    
    const processedText = get_context(text);
    console.log('[Frontend] Sending processed text to conversation:', processedText);
    
    if (!conversation) {
        console.error('Conversation not initialized');
        showError('Not connected to the agent. Please start the conversation first.');
        return;
    }
    
    try {
        // Try different methods based on what's available in the Conversation API
        if (typeof conversation.sendText === 'function') {
            // Using the sendText function found in the current implementation
            await conversation.sendText(processedText);
            console.log('Message sent using sendText');
        } else if (typeof conversation.sendTextMessage === 'function') {
            await conversation.sendTextMessage(processedText);
            console.log('Message sent using sendTextMessage');
        } else if (typeof conversation.sendUserMessage === 'function') {
            await conversation.sendUserMessage(processedText);
            console.log('Message sent using sendUserMessage');
        } else if (typeof conversation.prompt === 'function') {
            await conversation.prompt(processedText);
            console.log('Message sent using prompt');
        } else if (typeof conversation.write === 'function') {
            await conversation.write(processedText);
            console.log('Message sent using write');
        } else if (typeof conversation.ask === 'function') {
            await conversation.ask(processedText);
            console.log('Message sent using ask');
        } else {
            console.error('No suitable method found to send text to conversation');
            showError('Could not send message - no suitable method found.');
        }
    } catch (error) {
        console.error('[Frontend] Error sending processed text:', error);
        showError('Failed to send your message.');
    }
}

async function initializeConversation() {
    // Do not auto-start conversation or voice session on page load
    // Only set up the Conversation object when user clicks Start Conversation
}

async function startConversation() {
    const startButton = document.getElementById('startButton');
    const endButton = document.getElementById('endButton');
    const startSpeakingButton = document.getElementById('startSpeakingButton');
    
    try {
        startButton.disabled = true;
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
            alert('Microphone permission is required for the conversation.');
            startButton.disabled = false;
            return;
        }
        const signedUrl = await getSignedUrl();        conversation = await Conversation.startSession({
            signedUrl,
            disableTts: false,
            disableSpeechToText: true, // We'll manually control speech to text
            disableAudioProcessing: false, // Allow audio processing needed for STT
            onConnect: () => {
                console.log('Connected');
                updateStatus(true);
                setFormControlsState(true);
                startButton.style.display = 'none';
                endButton.disabled = false;
                endButton.style.display = 'flex';
                // Show the start speaking button
                startSpeakingButton.style.display = 'flex';
            },
            onDisconnect: () => {
                console.log('Disconnected');
                updateStatus(false);
                setFormControlsState(false);
                startButton.disabled = false;
                startButton.style.display = 'flex';
                endButton.disabled = true;
                endButton.style.display = 'none';
                // Hide speech buttons
                document.getElementById('startSpeakingButton').style.display = 'none';
                document.getElementById('stopSpeakingButton').style.display = 'none';
                document.getElementById('sendToAgentButton').style.display = 'none';
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
                // Hide speech buttons
                document.getElementById('startSpeakingButton').style.display = 'none';
                document.getElementById('stopSpeakingButton').style.display = 'none';
                document.getElementById('sendToAgentButton').style.display = 'none';
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
                
                // Only enable speaking buttons when agent is not speaking
                const isSpeaking = mode && mode.mode === 'speaking';
                if (!isSpeaking && !isRecording) {
                    document.getElementById('startSpeakingButton').disabled = false;
                } else {
                    document.getElementById('startSpeakingButton').disabled = true;
                }
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
    try {
        // If recording is active, stop it
        if (isRecording) {
            await stopSpeechToText();
        }
        
        // End the conversation session
        if (conversation) {
            await conversation.endSession();
            conversation = null;
            sttStream = null;
        }
        
        // Reset state variables
        user_input = '';
        isRecording = false;
        
        // Reset UI elements
        resetUIElements();
        
    } catch (error) {
        console.error('Error ending conversation:', error);
        showError('Failed to properly end conversation. You may need to refresh the page.');
    }
}

// Reset all UI elements to their default state
function resetUIElements() {
    // Reset all buttons to default state
    const startButton = document.getElementById('startButton');
    const endButton = document.getElementById('endButton');
    const startSpeakingButton = document.getElementById('startSpeakingButton');
    const stopSpeakingButton = document.getElementById('stopSpeakingButton');
    const sendToAgentButton = document.getElementById('sendToAgentButton');
    
    // Reset conversation buttons
    if (startButton) {
        startButton.disabled = false;
        startButton.style.display = 'flex';
    }
    
    if (endButton) {
        endButton.disabled = true;
        endButton.style.display = 'none';
    }
    
    // Reset speech buttons
    if (startSpeakingButton) {
        startSpeakingButton.disabled = false;
        startSpeakingButton.style.display = 'none';
    }
    
    if (stopSpeakingButton) {
        stopSpeakingButton.disabled = false;
        stopSpeakingButton.style.display = 'none';
    }
    
    if (sendToAgentButton) {
        sendToAgentButton.disabled = false;
        sendToAgentButton.style.display = 'none';
    }
    
    // Reset status indicators
    updateStatus(false);
    updateSpeakingStatus({ mode: 'silent' });
    updateSpeechStatus(false);
    
    // Stop any animations
    stopMouthAnimation();
}

// Update speech status display
function updateSpeechStatus(isRecording) {
    const statusElement = document.getElementById('speechStatus');
    if (statusElement) {
        statusElement.textContent = isRecording ? 'Recording' : 'Not Recording';
        statusElement.classList.toggle('recording', isRecording);
        statusElement.classList.remove('hidden');
        
        if (isRecording) {
            // Add recording indicator to status
            statusElement.innerHTML = `<span class="recording-indicator"></span> Recording`;
        }
    }
}

// Handle start speaking button click
async function handleStartSpeaking() {
    const startSpeakingButton = document.getElementById('startSpeakingButton');
    const stopSpeakingButton = document.getElementById('stopSpeakingButton');
    
    try {
        startSpeakingButton.disabled = true;
        
        // Check if conversation is active
        if (!conversation) {
            throw new Error('Conversation not initialized. Please start the conversation first.');
        }
        
        // Check if the bot is currently speaking to prevent overlap
        const speakingStatus = document.getElementById('speakingStatus');
        if (speakingStatus && speakingStatus.textContent === 'Agent Speaking') {
            throw new Error('Please wait for the agent to finish speaking before recording.');
        }
        
        // Clear any previous input
        user_input = '';
        
        // Start the STT stream
        await startSpeechToText();
        
        // Update UI
        startSpeakingButton.style.display = 'none';
        stopSpeakingButton.style.display = 'flex';
        
        // Update recording status
        updateSpeechStatus(true);
        
        // Show recording status
        addMessageToChat('Listening... (Click "Stop Speaking" when done)', 'bot');
        
    } catch (error) {
        console.error('Error starting speech recording:', error);
        startSpeakingButton.disabled = false;
        
        // Show error message in chat
        showError(`Failed to start speech recording: ${error.message}`);
        
        // Reset UI
        updateSpeechStatus(false);
    }
}

// Handle stop speaking button click
async function handleStopSpeaking() {
    const startSpeakingButton = document.getElementById('startSpeakingButton');
    const stopSpeakingButton = document.getElementById('stopSpeakingButton');
    
    try {
        stopSpeakingButton.disabled = true;
        
        // Update UI to show processing state
        updateSpeechStatus(false);
        addMessageToChat('Processing your speech... Click "Send to Agent" when ready.', 'bot');
        
        // Stop the STT stream - this will trigger the transcription process
        await stopSpeechToText();
        
        // Update UI immediately without waiting for the transcription
        // The transcription will update the UI when it completes in the MediaRecorder's stop event
        stopSpeakingButton.style.display = 'none';
        
        // Don't show startSpeakingButton until transcription is done
        // This will happen in the MediaRecorder's stop event handler
        
    } catch (error) {
        console.error('Error stopping speech recording:', error);
        stopSpeakingButton.disabled = false;
        startSpeakingButton.disabled = false;
        startSpeakingButton.style.display = 'flex';
        stopSpeakingButton.style.display = 'none';
        alert('Failed to stop speech recording. Please try again.');
    }
}

// Handle send to agent button click
async function handleSendToAgent() {
    const sendToAgentButton = document.getElementById('sendToAgentButton');
    const startSpeakingButton = document.getElementById('startSpeakingButton');
    
    try {
        sendToAgentButton.disabled = true;
        
        // Send the processed text to the agent
        if (user_input) {
            // First, add the user message to the chat
            addMessageToChat(user_input, 'user');
            
            // Then send it to the agent
            await sendProcessedText(user_input);
        }
        
        // Update UI
        sendToAgentButton.style.display = 'none';
        startSpeakingButton.disabled = false;
        
        // Clear the input for next use
        user_input = '';
        
    } catch (error) {
        console.error('Error sending text to agent:', error);
        sendToAgentButton.disabled = false;
        alert('Failed to send text to agent. Please try again.');
    }
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    updateStatus(false);
    updateSpeakingStatus({ mode: 'silent' });
    updateSpeechStatus(false);
    setupChatInterface();
    // Do not call initializeConversation here
    const startButton = document.getElementById('startButton');
    const endButton = document.getElementById('endButton');
    const startSpeakingButton = document.getElementById('startSpeakingButton');
    const stopSpeakingButton = document.getElementById('stopSpeakingButton');
    const sendToAgentButton = document.getElementById('sendToAgentButton');
    
    // Setup main conversation buttons
    if (startButton && endButton) {
        startButton.addEventListener('click', startConversation);
        endButton.addEventListener('click', endConversation);
        endButton.style.display = 'none';
    }
    
    // Setup speech-to-text buttons
    if (startSpeakingButton) {
        startSpeakingButton.addEventListener('click', handleStartSpeaking);
        console.log('[Frontend] Start speaking button event listener attached');
    } else {
        console.warn('[Frontend] Start speaking button not found');
    }
    
    if (stopSpeakingButton) {
        stopSpeakingButton.addEventListener('click', handleStopSpeaking);
        console.log('[Frontend] Stop speaking button event listener attached');
    } else {
        console.warn('[Frontend] Stop speaking button not found');
    }
    
    if (sendToAgentButton) {
        sendToAgentButton.addEventListener('click', handleSendToAgent);
        console.log('[Frontend] Send to agent button event listener attached');
    } else {
        console.warn('[Frontend] Send to agent button not found');
    }
});