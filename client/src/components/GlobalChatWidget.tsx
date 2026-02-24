import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { mesharkService } from '../services/mesharkService';
import { X, Send, Sparkles, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const GlobalChatWidget: React.FC = () => {
    const { isOpen, toggleChat } = useChat();
    const location = useLocation();
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
        { role: 'assistant', content: 'Meshark AI Online. Awaiting directive.' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    // Determine Context based on Route
    const getContext = () => {
        const path = location.pathname;
        if (path === '/') return 'Dashboard';
        if (path === '/courses') return 'Main Course Catalog';
        if (path.startsWith('/courses/')) return 'Specific Course Module';
        if (path === '/profile') return 'User Profile';
        if (path === '/settings') return 'System Settings';
        return 'General Academy Area';
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMsg = chatInput;
        // Update state with user message
        const newMessages = [...messages, { role: 'user' as const, content: userMsg }];
        setMessages(newMessages);
        setChatInput('');
        setSending(true);

        try {
            // Use Meshark Service
            const response = await mesharkService.sendMessage(newMessages);
            setMessages(prev => [...prev, response]);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Connection to AI Core disrupted. Retrying handshake...' }]);
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={toggleChat}
                className={`fixed bottom-4 sm:bottom-8 right-4 sm:right-8 z-50 p-3 sm:p-4 rounded-full shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all duration-500 hover:scale-110 border ${isOpen ? 'bg-purple-600 rotate-180 border-purple-400/50 shadow-[0_0_30px_rgba(189,0,255,0.4)]' : 'bg-cyan-500 border-cyan-300'
                    }`}
            >
                {isOpen ? <X className="text-white w-6 h-6 sm:w-7 sm:h-7" /> : <Terminal className="text-black w-6 h-6 sm:w-7 sm:h-7" />}
            </button>

            {/* Chat Window */}
            <div
                className={`fixed bottom-[75px] sm:bottom-[100px] right-4 sm:right-8 z-50 w-[calc(100vw-32px)] sm:w-[380px] md:w-[450px] h-[50dvh] sm:h-[650px] max-h-[500px] sm:max-h-[calc(100vh-100px)] bg-[#050505] shadow-[0_0_50px_rgba(0,0,0,0.8)] sm:bg-transparent sm:shadow-none sm:glass-premium border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-500 origin-bottom-right flex flex-col ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-10 pointer-events-none'
                    }`}
            >
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-white/10 bg-black/60 relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent bg-[length:200%_100%] animate-cyber-border-anim opacity-50 z-0"></div>
                    <div className="relative z-10">
                        <h3 className="font-bold text-white font-orbitron flex items-center gap-3 text-xl tracking-widest drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">
                            <Sparkles size={20} className="text-cyan-400 animate-pulse-slow" /> MESHARK AI
                        </h3>
                        <p className="text-xs text-purple-400 mt-2 font-mono uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                            Context: {getContext()}
                        </p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-black/40 scroll-smooth relative z-10">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-4 sm:p-5 text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-cyan-500/10 text-cyan-50 rounded-br-sm border border-cyan-400/30 shadow-[0_4px_20px_rgba(0,240,255,0.1)]'
                                : 'bg-black/60 text-gray-200 rounded-bl-sm border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                                }`}>
                                {msg.role === 'assistant' ? (
                                    <div className="prose prose-sm prose-invert prose-p:mb-3 prose-p:leading-relaxed prose-headings:text-gray-100 prose-headings:font-orbitron prose-headings:tracking-widest prose-a:text-cyan-400 prose-code:text-purple-400 prose-pre:bg-black/80 prose-pre:p-4 prose-pre:rounded-xl prose-pre:border prose-pre:border-white/5">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="whitespace-pre-wrap font-sans tracking-wide">{msg.content}</div>
                                )}
                            </div>
                        </div>
                    ))}
                    {sending && (
                        <div className="flex justify-start">
                            <div className="bg-black/40 border border-white/5 text-cyan-400 text-xs px-5 py-3 rounded-full rounded-bl-sm flex items-center gap-3 font-mono tracking-widest uppercase">
                                <Sparkles size={14} className="animate-spin" /> Processing Data...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-4 sm:p-5 border-t border-white/10 bg-black/60 relative z-10">
                    <div className="relative flex items-center gap-2 sm:gap-3 bg-black/40 rounded-full border border-white/10 px-3 py-2 focus-within:border-cyan-400/50 focus-within:shadow-[0_0_15px_rgba(0,240,255,0.1)_inset] transition-all duration-300">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="TRANSMIT DIRECTIVE..."
                            className="flex-grow bg-transparent border-none py-2 pl-4 pr-2 text-gray-200 text-xs font-mono tracking-widest focus:ring-0 placeholder:text-gray-600 outline-none"
                        />
                        <button
                            type="submit"
                            disabled={sending || !chatInput.trim()}
                            className="bg-cyan-500 text-black p-3 rounded-full hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 transition-all transform hover:scale-105 hover:shadow-[0_0_15px_rgba(0,240,255,0.5)]"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};
