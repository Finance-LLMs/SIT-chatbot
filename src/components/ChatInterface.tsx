import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Mic, StopCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import AnimatedOtter from './AnimatedOtter';
import { getDebateResponse, textToSpeech, fetchVoices, transcribeAudio, Voice } from '@/lib/api';

// Interface for chat messages
interface Message {
  role: 'user' | 'ai';
  text: string;
  audio?: string;
}

// Quick reply suggestion options
const quickReplies = [
  "Tell me about SIT programs",
  "How to apply for admission?",
  "What scholarships are available?",
  "Campus locations",
  "Upcoming events"
];

const ChatInterface = () => {
  // State variables
  const [inputText, setInputText] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  
  const { toast } = useToast();
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load available voices when component mounts
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const availableVoices = await fetchVoices();
        setVoices(availableVoices);
        
        if (availableVoices.length > 0) {
          setSelectedVoice(availableVoices[0].voice_id);
        }
      } catch (error) {
        console.error('Failed to load voices:', error);
      }
    };
    
    loadVoices();
    
    // Add initial welcome message
    setChatHistory([
      {
        role: 'ai',
        text: 'Hi there! I\'m the SIT ChatBot. How can I help you today?'
      }
    ]);
  }, []);
    // Auto-scroll to the latest message
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);
  
  // Set up audio player
  useEffect(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.onplay = () => setIsSpeaking(true);
      audioPlayerRef.current.onpause = () => setIsSpeaking(false);
      audioPlayerRef.current.onended = () => setIsSpeaking(false);
    }
    
    return () => {
      // Clean up on unmount
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setIsSpeaking(false);
      }
    };
  }, []);
  // Handle sending a new message
  const handleSendMessage = async (text: string = inputText) => {
    if (!text.trim()) return;
    
    // Add user message to chat history
    const userMessage: Message = {
      role: 'user',
      text: text.trim()
    };
    
    setChatHistory(prev => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);
    
    try {
      await processMessage(text.trim());
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  // Handle key press in the input field
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isProcessing) {
      handleSendMessage();
    }
  };

  // Handle quick reply selection
  const handleQuickReply = (reply: string) => {
    setInputText(reply);
    handleSendMessage(reply);
  };
  
  // Start audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processAudioInput(audioBlob);
        
        // Stop the audio tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Speak your question and click 'Stop Recording' when finished.",
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone access failed",
        description: "Could not access your microphone. Please check your browser permissions.",
        variant: "destructive",
      });
    }
  };
  
  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Process audio from microphone
  const processAudioInput = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      
      // Step 1: Transcribe audio to text
      const userText = await transcribeAudio(audioBlob);
      if (!userText) {
        throw new Error("Transcription returned empty text");
      }
      
      // Create a URL for the audio blob for playback
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Add user message to chat history with audio
      const userMessage: Message = {
        role: 'user',
        text: userText,
        audio: audioUrl
      };
      
      setChatHistory(prev => [...prev, userMessage]);
      
      // Process the transcribed text as a message
      await processMessage(userText);
    } catch (error) {
      console.error('Error processing audio input:', error);
      toast({
        title: "Processing error",
        description: "An error occurred while processing your audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Common processing for both text and audio inputs
  const processMessage = async (text: string) => {
    try {
      // Prepare history for the API in the format expected by the backend
      const historyPairs: [string, string][] = [];
      for (let i = 0; i < chatHistory.length; i += 2) {
        if (i + 1 < chatHistory.length) {
          historyPairs.push([
            chatHistory[i].text,
            chatHistory[i + 1].text
          ]);
        }
      }
      
      // Get AI response
      const aiResponse = await getDebateResponse(
        text,
        historyPairs,
        'chatbot', // Using a neutral stance
        Math.floor(chatHistory.length / 2) + 1
      );
      
      // Optional: Convert AI response to speech if voice is selected
      let audioUrl = '';
      if (selectedVoice) {
        try {
          audioUrl = await textToSpeech(aiResponse, selectedVoice);
        } catch (error) {
          console.error('Error generating speech:', error);
        }
      }
      
      // Add AI message to chat history
      const aiMessage: Message = {
        role: 'ai',
        text: aiResponse,
        audio: audioUrl
      };
      
      setChatHistory(prev => [...prev, aiMessage]);
      
      // Play the audio response if available
      if (audioUrl && audioPlayerRef.current) {
        audioPlayerRef.current.src = audioUrl;
        audioPlayerRef.current.onplay = () => setIsSpeaking(true);
        audioPlayerRef.current.onended = () => setIsSpeaking(false);
        audioPlayerRef.current.play().catch(e => {
          console.error('Error playing audio:', e);
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
      toast({
        title: "Error",
        description: "Unable to process your request. Please try again.",
        variant: "destructive",
      });
      
      // Add error message
      setChatHistory(prev => [
        ...prev, 
        { 
          role: 'ai', 
          text: "I'm sorry, I couldn't process your request. Please try again." 
        }
      ]);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Hidden audio player for AI speech */}
      <audio ref={audioPlayerRef} className="hidden" />
      
      {/* Header with SIT logo and otter */}
      <header className="bg-white shadow-md py-3 px-4 flex items-center justify-between">
        <div className="flex items-center">
          <img src="/logo.png" alt="SIT Logo" className="h-10 mr-3" />
          <h1 className="text-xl font-semibold text-teal-700">SIT ChatBot</h1>
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="ml-3 flex items-center text-red-500 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>
              <span className="text-xs font-medium">Recording...</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-full overflow-hidden">
          <svg viewBox="0 0 300 300" className="w-full h-full">
            {/* Simple otter face for header */}
            <circle cx="150" cy="150" r="100" fill="#9B7B55" />
            <circle cx="150" cy="170" r="60" fill="#D8BFA0" />
            <circle cx="120" cy="130" r="15" fill="#000000" />
            <circle cx="180" cy="130" r="15" fill="#000000" />
            <circle cx="125" cy="125" r="5" fill="white" />
            <circle cx="185" cy="125" r="5" fill="white" />
            <ellipse cx="150" cy="160" rx="15" ry="10" fill="#000000" />
            <path d="M130,180 Q150,185 170,180" stroke="#333333" strokeWidth="3" fill="none" />
          </svg>
        </div>
      </header>
      
      {/* Chat container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4">
        {/* Message feed */}
        <Card className="flex-1 overflow-y-auto mb-4 p-4 shadow-sm rounded-lg">
          <div className="flex flex-col gap-4">
            {chatHistory.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-teal-100 text-teal-900'
                  }`}
                >
                  <p className="text-sm md:text-base">{message.text}</p>
                  
                  {/* Show audio controls if audio is available */}
                  {message.audio && (
                    <div className="mt-2 flex items-center gap-2">                      <button
                        onClick={() => {
                          if (audioPlayerRef.current) {
                            // First pause any currently playing audio
                            audioPlayerRef.current.pause();
                            
                            // Set the new source and play
                            audioPlayerRef.current.src = message.audio!;
                            audioPlayerRef.current.play().catch(e => {
                              console.error('Error playing audio:', e);
                              setIsSpeaking(false);
                            });
                          }
                        }}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          message.role === 'user' 
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                            : 'bg-teal-200 text-teal-800 hover:bg-teal-300'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        Play
                      </button>
                      <span className="text-xs text-gray-500">
                        {message.role === 'user' ? 'Your voice input' : 'Listen'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Processing indicator */}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 rounded-lg bg-teal-100 text-teal-900">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm">Thinking...</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Element to scroll to */}
            <div ref={messageEndRef} />
          </div>
        </Card>
        
        {/* Quick reply suggestions */}
        <div className="flex flex-wrap gap-2 mb-4">
          {quickReplies.map((reply, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="bg-white text-teal-600 hover:bg-teal-50"
              onClick={() => handleQuickReply(reply)}
              disabled={isProcessing}
            >
              {reply}
            </Button>
          ))}
        </div>
          {/* Input area */}
        <div className="flex gap-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your question..."
            className="flex-1 border-teal-200 focus-visible:ring-teal-400"
            disabled={isProcessing || isRecording}
          />
            {/* Send button */}
          <Button
            onClick={() => handleSendMessage()}
            disabled={(!inputText.trim() && !isRecording) || isProcessing}
            className="bg-teal-600 hover:bg-teal-700 text-white"
            title="Send message"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
          
          {/* Microphone button */}
          {!isRecording ? (
            <Button
              onClick={startRecording}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              title="Start voice recording"
              aria-label="Start voice recording"
            >
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Voice</span>
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700 text-white animate-pulse"
              title="Stop recording"
              aria-label="Stop recording"
            >
              <StopCircle className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Stop</span>
            </Button>
          )}
        </div>
      </div>
        {/* Animated otter container - positioned at the bottom right */}
      <div className="fixed bottom-4 right-4 w-[150px] h-[150px] group">
        <AnimatedOtter speaking={isSpeaking} />
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-2 rounded shadow-md text-xs text-center pointer-events-none">
          {isSpeaking ? 'Speaking...' : 'SIT Mascot (Tap any message with audio to hear it)'}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
