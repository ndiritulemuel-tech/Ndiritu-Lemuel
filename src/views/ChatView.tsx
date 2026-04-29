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
  const [mode, setMode] = useState<'partner' | 'coach'>('coach');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: `Hi ${user?.displayName?.split(' ')[0] || 'there'}. I'm Aura, your relationship coach. How can I support you today?`, sender: 'bot', type: 'text' }
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
      const historyText = messages.map(m => `**${m.sender === 'user' ? 'User' : 'Aura'}**: ${m.text}`).join('\n');
      const prompt = `You are Aura, an empathetic, helpful, and concise AI relationship coach. The user's name is ${user?.displayName || 'User'}. Their voice preference for you is ${profile?.coachVoice || 'neutral'}. Be brief, direct, and highly supportive. Do not use generic platitudes. Use markdown for organization if needed.\n\nHere is the conversation history:\n${historyText}\n\n**User**: ${userText}\n**Aura**:`;
      
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
    <div className="flex flex-col h-screen bg-slate-50 md:max-w-xl md:mx-auto relative">
      {/* Header */}
      <div className="pt-6 pb-4 px-6 bg-white border-b border-gray-100 rounded-b-3xl z-10 card-shadow sticky top-0">
        <h1 className="text-2xl font-serif font-semibold text-[color:var(--text-primary)] mb-4">
          Connect
        </h1>
        
        {/* Mode Switcher */}
        <div className="flex p-1 bg-gray-100 rounded-full inset-0">
          <button
            onClick={() => setMode('partner')}
            className={cn(
              "flex-1 py-2 text-sm font-semibold rounded-full transition-all",
              mode === 'partner' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            )}
          >
             Partner
          </button>
          <button
            onClick={() => setMode('coach')}
            className={cn(
              "flex-1 py-2 text-sm font-semibold rounded-full transition-all",
              mode === 'coach' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            )}
          >
            Aura (Coach)
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 pb-32">
        {mode === 'coach' ? (
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
                  "p-4 rounded-3xl max-w-[85%]",
                  msg.sender === 'user' 
                    ? "bg-[color:var(--text-primary)] text-white rounded-tr-sm" 
                    : "bg-white text-gray-800 card-shadow rounded-tl-sm text-sm leading-relaxed overflow-hidden"
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
              <div className="flex gap-3 flex-row">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[color:var(--accent-light)] text-[color:var(--accent)]">
                  <Bot size={16} />
                </div>
                <div className="p-4 rounded-3xl max-w-[80%] bg-white text-gray-800 card-shadow rounded-tl-sm text-sm flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
               <Phone size={32} />
            </div>
            <h3 className="font-serif text-xl font-semibold mb-2">Partner</h3>
            <p className="text-sm text-gray-500 mb-6">Connect with your partner directly through Aura.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  if(profile?.partnerContact) window.open(`sms:${profile.partnerContact}`, '_self');
                  else alert('Please configure your partner contact in Profile Settings.');
                }}
                className="bg-white text-gray-900 border border-gray-200 px-6 py-3 rounded-full font-semibold text-sm flex items-center gap-2 card-shadow"
              >
                 <MessageCircle size={16} /> Text
              </button>
              <button 
                onClick={() => {
                  if(profile?.partnerContact) window.open(`tel:${profile.partnerContact}`, '_self');
                  else alert('Please configure your partner contact in Profile Settings.');
                }}
                className="bg-[color:var(--text-primary)] text-white px-6 py-3 rounded-full font-semibold text-sm flex items-center gap-2 card-shadow"
              >
                 <Phone size={16} /> Call
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="fixed bottom-[4rem] left-0 right-0 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pt-10 pb-4 px-4 md:max-w-xl md:mx-auto">
        <form onSubmit={handleSend} className="relative">
          <input 
            type="text" 
            placeholder={mode === 'coach' ? "Ask Aura a question..." : "Message Partner..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={mode === 'partner' || isLoading}
            className="w-full bg-white border border-gray-200 py-4 pl-5 pr-14 rounded-full card-shadow outline-none focus:border-[color:var(--accent)] transition-colors text-sm disabled:opacity-50"
          />
          <button 
            type="submit"
            disabled={mode === 'partner' || isLoading || !input.trim()}
            className="absolute right-2 top-2 bottom-2 w-10 bg-[color:var(--accent)] hover:opacity-90 transition-colors rounded-full flex items-center justify-center text-white disabled:opacity-50"
          >
            <Send size={16} className="-ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
