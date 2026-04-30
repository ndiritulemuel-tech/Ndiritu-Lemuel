import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Phone, MessageCircle, Loader2 } from 'lucide-react';
import { cn, getPreferredVoice } from '../lib/utils';
import { motion } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../AuthContext';
import ReactMarkdown from 'react-markdown';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  type: 'text';
}

export function ChatView() {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<'haven' | 'direct' | 'groups'>('haven');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: `Hi ${user?.displayName?.split(' ')[0] || 'there'}. I'm Haven, your gentle mental health companion. How can I support you today?`, sender: 'bot', type: 'text' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const speakMessage = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    // Strip markdown for speech
    const cleanText = text.replace(/[*_~`#]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const voicePref = profile?.coachVoice && profile.coachVoice !== 'neutral' ? profile.coachVoice : 'female';
    const voice = getPreferredVoice(voicePref);
    if (voice) utterance.voice = voice;
    
    utterance.pitch = 1.0;
    utterance.rate = 1.0;
    
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userText = input.trim();
    const newMsg: Message = { id: Date.now().toString(), text: userText, sender: 'user', type: 'text' };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const historyText = messages.map(m => `**${m.sender === 'user' ? 'User' : 'Haven'}**: ${m.text}`).join('\n');
      const prompt = `You are Haven, an empathetic, helpful, and concise AI mental health companion. The user's name is ${user?.displayName || 'User'}. Their voice preference for you is ${profile?.coachVoice || 'neutral'}. Be calming, safe, and highly supportive without being overly enthusiastic or demanding. Use markdown for organization if needed.\n\nHere is the conversation history:\n${historyText}\n\n**User**: ${userText}\n**Haven**:`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const botText = response.text || "I'm here for you.";
      setMessages(prev => [...prev, { id: Date.now().toString() + 'bot', text: botText, sender: 'bot', type: 'text' }]);
      speakMessage(botText);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: Date.now().toString() + 'err', text: "I'm sorry, I'm having trouble connecting right now.", sender: 'bot', type: 'text' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[color:var(--bg-primary)] md:max-w-xl md:mx-auto relative">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-[color:var(--bg-secondary)]/50 to-transparent blur-3xl -z-10" />

      {/* Header */}
      <div className="pt-8 pb-4 px-6 md:px-8 bg-transparent z-10 sticky top-0">
        <h1 className="text-3xl font-serif font-semibold text-[color:var(--text-primary)] mb-6 tracking-tight">
          Connect
        </h1>
        
        {/* Mode Switcher */}
        <div className="flex p-1 bg-white/60 backdrop-blur-md rounded-[1.25rem] inset-0 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-white/50 mb-2">
          <button
            onClick={() => setMode('haven')}
            className={cn(
              "flex-1 py-2.5 text-sm font-semibold rounded-[1rem] transition-all",
              mode === 'haven' ? "bg-[color:var(--text-primary)] text-white shadow-sm" : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
            )}
          >
            Haven
          </button>
          <button
            onClick={() => setMode('direct')}
            className={cn(
              "flex-1 py-2.5 text-sm font-semibold rounded-[1rem] transition-all",
              mode === 'direct' ? "bg-white text-[color:var(--text-primary)] shadow-sm" : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
            )}
          >
             Chats
          </button>
          <button
            onClick={() => setMode('groups')}
            className={cn(
              "flex-1 py-2.5 text-sm font-semibold rounded-[1rem] transition-all",
              mode === 'groups' ? "bg-white text-[color:var(--text-primary)] shadow-sm" : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
            )}
          >
             Groups
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6 pb-40 hide-scrollbar scroll-smooth">
        {mode === 'haven' ? (
          <>
            {messages.map((msg) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id} 
                className={cn("flex gap-3", msg.sender === 'user' ? "flex-row-reverse" : "flex-row")}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  msg.sender === 'user' ? "bg-gray-200 text-gray-600" : "bg-[color:var(--accent-light)] text-[color:var(--accent)]"
                )}>
                  {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={cn(
                  "p-4 rounded-[1.5rem] max-w-[85%] shadow-sm",
                  msg.sender === 'user' 
                    ? "bg-[color:var(--text-primary)] text-white rounded-tr-sm" 
                    : "bg-white text-[color:var(--text-primary)] rounded-tl-sm text-sm leading-relaxed overflow-hidden border border-[color:var(--bg-secondary)]"
                )}>
                  {msg.sender === 'bot' ? (
                    <div className="markdown-body prose prose-sm prose-p:my-1">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex gap-3 flex-row mb-6">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[color:var(--accent-light)] text-[color:var(--accent)]">
                  <Bot size={16} />
                </div>
                <div className="p-4 rounded-[1.5rem] max-w-[80%] bg-white text-[color:var(--text-primary)] shadow-sm rounded-tl-sm text-sm flex items-center gap-2 border border-[color:var(--bg-secondary)]">
                  <Loader2 size={16} className="animate-spin text-[color:var(--accent)]" /> 
                  <span className="text-[color:var(--text-secondary)]">Haven is thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        ) : mode === 'direct' ? (
          <div className="space-y-4">
             <div className="flex justify-between items-center mb-2">
                 <h2 className="text-lg font-serif font-semibold text-[color:var(--text-primary)]">Messages</h2>
                 <button className="text-[color:var(--accent)] font-medium text-sm">New Chat</button>
             </div>
             
             {/* Mock Direct Chats */}
             {[
               { name: "Partner", msg: "I'll be there in 10 mins.", time: "10:30 AM", dot: true },
               { name: "Dr. Kamau", msg: "Remember your breathing exercises today.", time: "Yesterday", dot: false },
               { name: "Sarah", msg: "Are we still on for coffee?", time: "Oct 12", dot: false }
             ].map((chat, i) => (
                <div key={i} className="flex items-center gap-4 bg-white p-4 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-50 hover:border-[color:var(--accent-light)] transition-all cursor-pointer">
                   <div className="w-12 h-12 bg-[color:var(--bg-secondary)] rounded-full flex items-center justify-center text-[color:var(--accent)] font-bold">
                     {chat.name.charAt(0)}
                   </div>
                   <div className="flex-1 overflow-hidden">
                     <div className="flex justify-between items-center mb-1">
                        <h4 className="font-semibold text-[color:var(--text-primary)] text-sm truncate">{chat.name}</h4>
                        <span className="text-xs text-[color:var(--text-secondary)]">{chat.time}</span>
                     </div>
                     <p className="text-sm text-[color:var(--text-secondary)] truncate">{chat.msg}</p>
                   </div>
                   {chat.dot && <div className="w-2.5 h-2.5 bg-[color:var(--accent)] rounded-full"></div>}
                </div>
             ))}
          </div>
        ) : (
          <div className="space-y-4">
             <div className="flex justify-between items-center mb-2">
                 <h2 className="text-lg font-serif font-semibold text-[color:var(--text-primary)]">Support Groups</h2>
                 <button className="text-[color:var(--accent)] font-medium text-sm">Create Group</button>
             </div>
             
             {/* Mock Groups */}
             {[
               { name: "Anxiety Support CBO", mem: "24", msg: "We are meeting on Saturday.", time: "11:45 AM" },
               { name: "New Parents Connect", mem: "8", msg: "Has anyone tried the new sleep method?", time: "Yesterday" }
             ].map((grp, i) => (
                <div key={i} className="flex items-start gap-4 bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-50 hover:border-[color:var(--accent-light)] transition-all cursor-pointer">
                   <div className="w-12 h-12 bg-gradient-to-br from-[color:var(--bg-secondary)] to-[color:var(--accent-light)] rounded-[1.2rem] flex items-center justify-center text-[color:var(--accent)] font-bold">
                     {grp.name.charAt(0)}
                   </div>
                   <div className="flex-1 overflow-hidden">
                     <div className="flex justify-between items-center mb-1">
                        <h4 className="font-semibold text-[color:var(--text-primary)] text-sm truncate">{grp.name}</h4>
                     </div>
                     <p className="text-xs font-semibold text-[color:var(--accent)] mb-2">{grp.mem} Members</p>
                     <p className="text-sm text-[color:var(--text-secondary)] truncate bg-gray-50 px-3 py-2 rounded-xl">
                        {grp.msg}
                     </p>
                   </div>
                </div>
             ))}
             
             <button className="w-full mt-4 py-4 rounded-2xl bg-[color:var(--text-primary)] text-white font-medium text-sm hover:bg-[#1a231e] transition-colors">
                Discover More Groups
             </button>
          </div>
        )}
      </div>

      {/* Input Area */}
      {mode === 'haven' && (
        <div className="fixed bottom-24 md:bottom-28 left-4 right-4 md:left-auto md:right-auto md:w-[480px] md:translate-x-[-50%] md:left-[50%] z-30">
          <form onSubmit={handleSend} className="relative">
            <input 
              type="text" 
              placeholder="Talk to Haven..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="w-full bg-white/90 backdrop-blur-md border border-white/60 py-4 pl-6 pr-14 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] outline-none focus:border-[color:var(--accent)] transition-all text-sm disabled:opacity-50 text-[color:var(--text-primary)] placeholder-[color:var(--text-secondary)]"
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-2 bottom-2 w-12 bg-[color:var(--text-primary)] hover:bg-[#1a231e] transition-colors rounded-[1.5rem] flex items-center justify-center text-white disabled:opacity-50 shadow-sm"
            >
              <Send size={16} className="-ml-0.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
