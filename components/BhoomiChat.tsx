import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Mic, X, MessageSquare, Loader2, User, Leaf } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface BhoomiChatProps {
    currentUser: any;
}

const BhoomiChat: React.FC<BhoomiChatProps> = ({ currentUser }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // API URL - Connected to your friend's laptop via environment variable
    const API_BASE_URL = import.meta.env.VITE_BHOOMI_API_URL;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async (text: string) => {
        if (!text.trim()) return;

        const userMsg: Message = { role: 'user', content: text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': '69420' // Bypasses the ngrok landing page
                },
                body: JSON.stringify({
                    message: text
                }),
            });

            if (!response.ok) throw new Error('Bhoomi is resting right now. Try again later.');

            const data = await response.json();
            const botMsg: Message = {
                role: 'assistant',
                content: data.response || data.content || "I'm here to help you grow your farm. What else can I assist with?",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg: Message = {
                role: 'assistant',
                content: "I'm having trouble connecting to my agricultural database. Please check your connection.",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const startVoiceRecording = () => {
        // Placeholder for audioRecorder.js logic
        setIsRecording(true);
        // In actual implementation, we'd use MediaRecorder and send to /stt
        setTimeout(() => {
            setIsRecording(false);
            alert("Voice chat integration: This will send audio to your friend's /stt endpoint.");
        }, 2000);
    };

    return (
        <>
            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-2xl z-50 flex items-center justify-center transition-all active:scale-95 ${isOpen ? 'bg-red-500 rotate-90' : 'bg-agri-green hover:bg-green-800'
                    }`}
            >
                {isOpen ? <X className="text-white w-8 h-8" /> : (
                    <div className="relative">
                        <Bot className="text-white w-9 h-9" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white animate-bounce"></div>
                    </div>
                )}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-[400px] h-[600px] bg-white rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-10 duration-300">
                    {/* Header */}
                    <div className="bg-agri-green p-5 flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Bot className="text-white w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-white font-black text-lg leading-none">BHOOMI AI</h3>
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-white/80 text-[10px] uppercase font-bold tracking-widest">Agri-Expert Online</span>
                            </div>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
                        {messages.length === 0 && (
                            <div className="text-center py-10 space-y-4">
                                <div className="w-20 h-20 bg-agri-green/10 rounded-full flex items-center justify-center mx-auto">
                                    <Leaf className="w-10 h-10 text-agri-green" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Namaste, {currentUser.name}!</h4>
                                    <p className="text-xs text-slate-500 px-10 leading-relaxed mt-2">
                                        I am Bhoomi, your AI assistant. Ask me about crop diseases, soil health, or market prices.
                                    </p>
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
                                <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-slate-200' : 'bg-agri-green'
                                        }`}>
                                        {msg.role === 'user' ? <User className="w-4 h-4 text-slate-500" /> : <Bot className="w-4 h-4 text-white" />}
                                    </div>
                                    <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${msg.role === 'user'
                                        ? 'bg-agri-green text-white rounded-tr-none'
                                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                                        }`}>
                                        {msg.content}
                                        <div className={`text-[9px] mt-1 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 text-agri-green animate-spin" />
                                    <span className="text-xs text-slate-400 font-medium italic">Bhoomi is thinking...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-slate-100">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={startVoiceRecording}
                                className={`p-2.5 rounded-full transition-all ${isRecording ? 'bg-red-100 text-red-500 scale-110 shadow-inner' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                            >
                                <Mic className="w-5 h-5" />
                            </button>
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                                className="flex-1 flex gap-2"
                            >
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask Bhoomi about farming..."
                                    className="flex-1 bg-slate-100 border-none rounded-full px-5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-agri-green/20 transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isTyping}
                                    className="bg-agri-green text-white p-2.5 rounded-full shadow-lg hover:bg-green-800 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BhoomiChat;
