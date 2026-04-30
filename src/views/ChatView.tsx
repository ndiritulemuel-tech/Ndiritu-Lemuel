import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Phone, MessageCircle, Loader2, Users, ArrowLeft, Trash2, Settings, UserPlus, UserMinus } from 'lucide-react';
import { cn, getPreferredVoice } from '../lib/utils';
import { motion } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../AuthContext';
import ReactMarkdown from 'react-markdown';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, where, arrayUnion, arrayRemove } from 'firebase/firestore';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  type: 'text';
}

export function ChatView() {
  const { user, profile, updateProfile } = useAuth();
  const [mode, setMode] = useState<'haven' | 'direct' | 'groups'>('haven');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: `Hi ${user?.displayName?.split(' ')[0] || 'there'}. I'm Haven, your gentle mental health companion. How can I support you today?`, sender: 'bot', type: 'text' }
  ]);
  
  // Group States
  const [realGroups, setRealGroups] = useState<any[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState('');
  
  // Direct Chat States
  const [directChats, setDirectChats] = useState<any[]>([]);
  const [activeDirectId, setActiveDirectId] = useState<string | null>(null);
  const [directMessages, setDirectMessages] = useState<any[]>([]);
  const [showCreateDirect, setShowCreateDirect] = useState(false);
  const [newDirectMember, setNewDirectMember] = useState('');
  
  // Active Group actions
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [typingIndicators, setTypingIndicators] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;
    let unsubscribe: any = () => {};
    
    if (mode === 'direct' && activeDirectId) {
      const q = query(collection(db, 'directChats', activeDirectId, 'typingIndicators'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const typists: string[] = [];
        snapshot.forEach(doc => {
          if (doc.id !== user.uid && doc.data().isTyping) {
            typists.push(doc.id);
          }
        });
        setTypingIndicators(typists);
      });
    } else if (mode === 'groups' && activeGroupId) {
      const q = query(collection(db, 'groups', activeGroupId, 'typingIndicators'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const typists: string[] = [];
        snapshot.forEach(doc => {
          if (doc.id !== user.uid && doc.data().isTyping) {
            typists.push(doc.id);
          }
        });
        setTypingIndicators(typists);
      });
    } else {
      setTypingIndicators([]);
    }
    
    return () => unsubscribe();
  }, [mode, activeDirectId, activeGroupId, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!user || (mode !== 'direct' && mode !== 'groups')) return;
    
    const collectionName = mode === 'direct' ? 'directChats' : 'groups';
    const activeId = mode === 'direct' ? activeDirectId : activeGroupId;
    if (!activeId) return;

    try {
      setDoc(doc(db, collectionName, activeId, 'typingIndicators', user.uid), {
        isTyping: true,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {}

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      try {
        deleteDoc(doc(db, collectionName, activeId, 'typingIndicators', user.uid));
      } catch (err) {}
    }, 2000);
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    if (ts.toDate) return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return '';
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, groupMessages, directMessages, isLoading]);

  useEffect(() => {
    if (!user) return;
    const q1 = query(collection(db, 'groups'), where('members', 'array-contains', user.uid));
    const unsub1 = onSnapshot(q1, (snapshot) => {
      setRealGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'groups'));
    
    const q2 = query(collection(db, 'directChats'), where('participants', 'array-contains', user.uid));
    const unsub2 = onSnapshot(q2, (snapshot) => {
      setDirectChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'directChats'));
    
    return () => { unsub1(); unsub2(); };
  }, [user]);

  useEffect(() => {
    if (!activeGroupId || !user) return;
    const q = query(collection(db, 'groups', activeGroupId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGroupMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `groups/${activeGroupId}/messages`));
    return unsubscribe;
  }, [activeGroupId, user]);

  useEffect(() => {
    if (!activeDirectId || !user) return;
    const q = query(collection(db, 'directChats', activeDirectId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDirectMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `directChats/${activeDirectId}/messages`));
    return unsubscribe;
  }, [activeDirectId, user]);

  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim()) return;
    const id = Date.now().toString();
    const docRef = doc(db, 'groups', id);
    try {
      await setDoc(docRef, {
        name: newGroupName.trim(),
        ownerId: user.uid,
        members: [user.uid, ...newGroupMembers.split(',').map(m => m.trim().toLowerCase()).filter(Boolean)],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupMembers('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `groups/${id}`);
    }
  };

  const handleCreateDirectChat = async () => {
    if (!user || !newDirectMember.trim() || newDirectMember.trim() === user.uid) return;
    const otherUserId = newDirectMember.trim().toLowerCase();
    const sortedParticipants = [user.uid, otherUserId].sort();
    const id = sortedParticipants.join('_');
    const docRef = doc(db, 'directChats', id);
    try {
      await setDoc(docRef, {
        participants: sortedParticipants,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setShowCreateDirect(false);
      setNewDirectMember('');
      setActiveDirectId(id);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `directChats/${id}`);
    }
  };

  const handleDirectMessageSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeDirectId || !input.trim()) return;
    
    const directChatSettings = directChats.find(c => c.id === activeDirectId);
    if (!directChatSettings) return;
    
    const otherParticipant = directChatSettings.participants.find((p: string) => p !== user.uid);
    if (otherParticipant && profile?.blockedUsers?.includes(otherParticipant)) {
      alert("You cannot send messages to a blocked user.");
      return;
    }
    
    const text = input.trim();
    setInput('');
    const msgId = Date.now().toString();
    try {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      try { deleteDoc(doc(db, 'directChats', activeDirectId, 'typingIndicators', user.uid)); } catch(err) {}

      await setDoc(doc(db, 'directChats', activeDirectId, 'messages', msgId), {
        text,
        senderId: user.uid,
        senderName: profile?.pseudonym || user.displayName || 'Anonymous',
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'directChats', activeDirectId), {
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `directChats/${activeDirectId}/messages/${msgId}`);
    }
  };

  const handleGroupMessageSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeGroupId || !input.trim()) return;
    
    const groupSettings = realGroups.find(g => g.id === activeGroupId);
    if (groupSettings && profile?.blockedUsers?.length) {
      const hasBlockedMember = groupSettings.members.some((m: string) => profile.blockedUsers.includes(m) && m !== user.uid);
      if (hasBlockedMember) {
        alert("You cannot send messages to this group because it contains a blocked user.");
        return;
      }
    }
    
    const text = input.trim();
    setInput('');
    const msgId = Date.now().toString();
    try {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      try { deleteDoc(doc(db, 'groups', activeGroupId, 'typingIndicators', user.uid)); } catch(err) {}

      await setDoc(doc(db, 'groups', activeGroupId, 'messages', msgId), {
        text,
        senderId: user.uid,
        senderName: profile?.pseudonym || user.displayName || 'Anonymous',
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'groups', activeGroupId), {
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `groups/${activeGroupId}/messages/${msgId}`);
    }
  };

  const handleLeaveGroup = async (groupId: string, isOwner: boolean) => {
    if (!user) return;
    if (confirm(isOwner ? 'You are the owner. Delete the group entirely?' : 'Leave this group?')) {
      try {
        if (isOwner) {
          await deleteDoc(doc(db, 'groups', groupId));
        } else {
          await updateDoc(doc(db, 'groups', groupId), {
            members: arrayRemove(user.uid),
            updatedAt: serverTimestamp()
          });
        }
        setActiveGroupId(null);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `groups/${groupId}`);
      }
    }
  };

  const handleRemoveMember = async (groupId: string, memberId: string) => {
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayRemove(memberId),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `groups/${groupId}`);
    }
  };
  
  const handleBlockUser = async (memberId: string) => {
    if (!user || memberId === user.uid) return;
    if (confirm('Block this user? You will no longer see their messages.')) {
      try {
        const currentBlocked = profile?.blockedUsers || [];
        if (!currentBlocked.includes(memberId)) {
          await updateProfile({ blockedUsers: [...currentBlocked, memberId] });
        }
      } catch (e) {
        console.error(e);
      }
    }
  };
  
  const handleAddMember = async (groupId: string) => {
    if (!addMemberEmail.trim()) return;
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayUnion(addMemberEmail.trim()),
        updatedAt: serverTimestamp()
      });
      setAddMemberEmail('');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `groups/${groupId}`);
    }
  };

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
             {activeDirectId ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-gray-50 top-4 sticky z-20">
                     <div className="flex items-center gap-3">
                       <button onClick={() => setActiveDirectId(null)} className="p-2 -ml-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors">
                         <ArrowLeft size={20} />
                       </button>
                       <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
                         {(() => {
                           const c = directChats.find(c => c.id === activeDirectId);
                           const other = c?.participants.find((p: string) => p !== user?.uid);
                           return other || 'Chat';
                         })()}
                       </h2>
                     </div>
                     <button onClick={() => {
                       const c = directChats.find(c => c.id === activeDirectId);
                       const other = c?.participants.find((p: string) => p !== user?.uid);
                       if (other) handleBlockUser(other);
                     }} className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors text-xs font-semibold">
                       Block
                     </button>
                  </div>
                  <div className="flex flex-col gap-4 pb-24">
                    {directMessages.filter(m => !(profile?.blockedUsers || []).includes(m.senderId)).length === 0 ? (
                      <p className="text-center text-gray-400 py-10">No messages yet.</p>
                    ) : (
                      directMessages.filter(m => !(profile?.blockedUsers || []).includes(m.senderId)).map((msg) => (
                        <div key={msg.id} className={cn("flex flex-col group", msg.senderId === user?.uid ? "items-end" : "items-start")}>
                          <div className="flex items-center gap-2">
                             {msg.senderId === user?.uid && (
                               <button 
                                 onClick={async () => {
                                   if (confirm('Delete this message?')) {
                                     try {
                                       await deleteDoc(doc(db, 'directChats', activeDirectId, 'messages', msg.id));
                                     } catch (e) {
                                       console.error(e);
                                     }
                                   }
                                 }}
                                 className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-full"
                               >
                                 <Trash2 size={14} />
                               </button>
                             )}
                             <div className={cn(
                               "px-4 py-3 rounded-2xl max-w-[85%] text-sm",
                               msg.senderId === user?.uid 
                                 ? "bg-[color:var(--accent)] text-white rounded-tr-sm" 
                                 : "bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)] rounded-tl-sm border border-gray-100 shadow-sm"
                             )}>
                               {msg.text}
                               <div className={cn("text-[10px] mt-1 flex", msg.senderId === user?.uid ? "text-white/80 justify-end" : "text-[color:var(--text-secondary)] justify-start")}>
                                 {formatTime(msg.createdAt)}
                               </div>
                             </div>
                          </div>
                        </div>
                      ))
                    )}
                    {typingIndicators.length > 0 && (
                      <div className="flex items-start">
                        <div className="px-4 py-3 rounded-2xl bg-[color:var(--bg-secondary)] text-[color:var(--text-secondary)] rounded-tl-sm text-sm flex items-center gap-2 max-w-[85%] border border-gray-100 shadow-sm font-medium italic">
                           <Loader2 size={12} className="animate-spin text-[color:var(--accent)]" /> 
                           User is typing...
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} className="h-4" />
                  </div>
                </div>
             ) : showCreateDirect ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-serif font-semibold text-[color:var(--text-primary)]">New Chat</h2>
                      <button onClick={() => setShowCreateDirect(false)} className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] font-medium text-sm transition-colors">Cancel</button>
                  </div>
                  <div className="bg-white p-5 rounded-3xl shadow-sm flex flex-col gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-1">User ID</label>
                      <input 
                        type="text" 
                        value={newDirectMember}
                        onChange={(e) => setNewDirectMember(e.target.value)}
                        placeholder="e.g. some_user_id"
                        className="w-full p-3 rounded-xl bg-gray-50 border outline-none text-sm"
                      />
                    </div>
                    <button 
                      onClick={handleCreateDirectChat}
                      disabled={!newDirectMember.trim()}
                      className="w-full mt-2 py-3 rounded-xl bg-[color:var(--text-primary)] text-white font-medium text-sm hover:bg-[#1a231e] disabled:opacity-50"
                    >
                      Start Chat
                    </button>
                  </div>
                </div>
             ) : (
                <>
                  <div className="flex justify-between items-center mb-2">
                      <h2 className="text-lg font-serif font-semibold text-[color:var(--text-primary)] flex items-center gap-2"><MessageCircle size={20}/> Messages</h2>
                      <button onClick={() => setShowCreateDirect(true)} className="text-[color:var(--accent)] font-medium text-sm bg-[color:var(--accent-light)] px-3 py-1.5 rounded-full">New Chat</button>
                  </div>
                  
                  {directChats.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-3xl border border-gray-50">
                      <MessageCircle size={32} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">No direct messages yet.</p>
                      <p className="text-sm text-gray-400 mt-1">Start a chat with a user ID.</p>
                    </div>
                  ) : directChats.map((chat) => {
                     const other = chat.participants.find((p: string) => p !== user?.uid) || 'Unknown';
                     return (
                        <div key={chat.id} onClick={() => setActiveDirectId(chat.id)} className="flex items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-50 hover:border-[color:var(--accent-light)] cursor-pointer">
                           <div className="w-12 h-12 bg-gradient-to-br from-[color:var(--bg-secondary)] to-[color:var(--accent-light)] rounded-[1.2rem] flex items-center justify-center text-[color:var(--accent)] font-bold">
                             {other.charAt(0).toUpperCase()}
                           </div>
                           <div className="flex-1 overflow-hidden">
                             <div className="flex justify-between items-center mb-1">
                                <h4 className="font-semibold text-[color:var(--text-primary)] text-sm truncate">{other}</h4>
                             </div>
                           </div>
                        </div>
                     );
                  })}
                </>
             )}
          </div>
        ) : mode === 'groups' ? (
          <div className="space-y-4">
             {activeGroupId ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-gray-50 top-4 sticky z-20">
                     <div className="flex items-center gap-3">
                       <button onClick={() => setActiveGroupId(null)} className="p-2 -ml-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors">
                         <ArrowLeft size={20} />
                       </button>
                       <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
                         {realGroups.find(g => g.id === activeGroupId)?.name || 'Group Chat'}
                       </h2>
                     </div>
                     <button onClick={() => setShowGroupSettings(!showGroupSettings)} className="p-2 text-gray-500 hover:text-[color:var(--accent)] hover:bg-gray-100 rounded-full transition-colors">
                       <Settings size={20} />
                     </button>
                  </div>
                  
                  {showGroupSettings && (() => {
                     const activeGrp = realGroups.find(g => g.id === activeGroupId);
                     if (!activeGrp) return null;
                     const isOwner = activeGrp.ownerId === user?.uid;
                     return (
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50">
                           <h3 className="font-semibold mb-3">Settings</h3>
                           <div className="mb-4">
                             <p className="text-xs text-gray-500 uppercase font-bold mb-2 tracking-wider">Members ({activeGrp.members?.length || 0})</p>
                             <div className="space-y-2">
                               {activeGrp.members?.map((m: string) => (
                                 <div key={m} className="flex justify-between items-center text-sm">
                                   <span className="truncate flex-1">{m} {m === activeGrp.ownerId ? '(Owner)' : ''}</span>
                                   <div className="flex gap-1">
                                     {m !== user?.uid && (
                                       <button onClick={() => handleBlockUser(m)} className="text-orange-500 p-1 hover:bg-orange-50 rounded text-xs px-2 border border-orange-200">
                                         Block
                                       </button>
                                     )}
                                     {isOwner && m !== user?.uid && (
                                       <button onClick={() => handleRemoveMember(activeGroupId, m)} className="text-red-500 p-1 hover:bg-red-50 rounded">
                                         <UserMinus size={14} />
                                       </button>
                                     )}
                                   </div>
                                 </div>
                               ))}
                             </div>
                           </div>
                           
                           {isOwner && (
                             <div className="mb-4 flex gap-2">
                               <input 
                                 type="text" 
                                 value={addMemberEmail}
                                 onChange={(e) => setAddMemberEmail(e.target.value)}
                                 placeholder="Add user ID..."
                                 className="flex-1 p-2 rounded-lg bg-gray-50 border outline-none text-sm"
                               />
                               <button onClick={() => handleAddMember(activeGroupId)} className="bg-[color:var(--accent)] text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1">
                                 <UserPlus size={14} /> Add
                               </button>
                             </div>
                           )}
                           
                           <button 
                             onClick={() => handleLeaveGroup(activeGroupId, isOwner)}
                             className="w-full flex items-center justify-center gap-2 text-red-600 bg-red-50 py-3 rounded-xl font-medium hover:bg-red-100 transition-colors mt-2"
                           >
                             <Trash2 size={16} /> {isOwner ? 'Delete Group' : 'Leave Group'}
                           </button>
                        </div>
                     );
                  })()}

                  <div className="flex flex-col gap-4 pb-24">
                    {groupMessages.filter(m => !(profile?.blockedUsers || []).includes(m.senderId)).length === 0 ? (
                      <p className="text-center text-gray-400 py-10">No messages yet. Send a message to start!</p>
                    ) : (
                      groupMessages.filter(m => !(profile?.blockedUsers || []).includes(m.senderId)).map((msg) => (
                        <div key={msg.id} className={cn("flex flex-col group", msg.senderId === user?.uid ? "items-end" : "items-start")}>
                          <span className="text-xs text-gray-400 mb-1 px-2">{msg.senderName}</span>
                          <div className="flex items-center gap-2">
                             {msg.senderId === user?.uid && (
                               <button 
                                 onClick={async () => {
                                   if (confirm('Delete this message?')) {
                                     try {
                                       await deleteDoc(doc(db, 'groups', activeGroupId, 'messages', msg.id));
                                     } catch (e) {
                                       console.error(e);
                                     }
                                   }
                                 }}
                                 className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-full"
                               >
                                 <Trash2 size={14} />
                               </button>
                             )}
                             <div className={cn(
                               "px-4 py-3 rounded-2xl max-w-[85%] text-sm",
                               msg.senderId === user?.uid 
                                 ? "bg-[color:var(--accent)] text-white rounded-tr-sm" 
                                 : "bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)] rounded-tl-sm border border-gray-100 shadow-sm"
                             )}>
                               {msg.text}
                               <div className={cn("text-[10px] mt-1 flex", msg.senderId === user?.uid ? "text-white/80 justify-end" : "text-[color:var(--text-secondary)] justify-start")}>
                                 {formatTime(msg.createdAt)}
                               </div>
                             </div>
                          </div>
                        </div>
                      ))
                    )}
                    {typingIndicators.length > 0 && (
                      <div className="flex items-start">
                        <div className="px-4 py-3 rounded-2xl bg-[color:var(--bg-secondary)] text-[color:var(--text-secondary)] rounded-tl-sm text-sm flex items-center gap-2 max-w-[85%] border border-gray-100 shadow-sm font-medium italic">
                           <Loader2 size={12} className="animate-spin text-[color:var(--accent)]" /> 
                           {typingIndicators.length === 1 ? 'Someone is typing...' : `${typingIndicators.length} people are typing...`}
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} className="h-4" />
                  </div>
                </div>
             ) : showCreateGroup ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-serif font-semibold text-[color:var(--text-primary)]">Create Group</h2>
                      <button onClick={() => setShowCreateGroup(false)} className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] font-medium text-sm transition-colors">Cancel</button>
                  </div>
                  <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-50 flex flex-col gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-1">Group Name</label>
                      <input 
                        type="text" 
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="e.g. Wellness Walkers"
                        className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-[color:var(--accent)] transition-colors text-sm text-[color:var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-1">Invite Members (User IDs, comma-separated)</label>
                      <input 
                        type="text" 
                        value={newGroupMembers}
                        onChange={(e) => setNewGroupMembers(e.target.value)}
                        placeholder="e.g. user_id_1, user_id_2"
                        className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-[color:var(--accent)] transition-colors text-sm text-[color:var(--text-primary)]"
                      />
                    </div>
                    <button 
                      onClick={handleCreateGroup}
                      disabled={!newGroupName.trim()}
                      className="w-full mt-2 py-3 rounded-xl bg-[color:var(--text-primary)] text-white font-medium text-sm hover:bg-[#1a231e] transition-colors disabled:opacity-50"
                    >
                      Create Group
                    </button>
                  </div>
                </div>
             ) : (
                <>
                  <div className="flex justify-between items-center mb-2">
                      <h2 className="text-lg font-serif font-semibold text-[color:var(--text-primary)] flex items-center gap-2"><Users size={20}/> Support Groups</h2>
                      <button onClick={() => setShowCreateGroup(true)} className="text-[color:var(--accent)] font-medium text-sm bg-[color:var(--accent-light)] px-3 py-1.5 rounded-full">Create</button>
                  </div>
                  
                  {realGroups.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-3xl border border-gray-50">
                      <Users size={32} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">You aren't in any groups yet.</p>
                      <p className="text-sm text-gray-400 mt-1">Create one to start chatting with others.</p>
                    </div>
                  ) : realGroups.map((grp) => (
                      <div key={grp.id} onClick={() => setActiveGroupId(grp.id)} className="flex items-start gap-4 bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-50 hover:border-[color:var(--accent-light)] transition-all cursor-pointer">
                        <div className="w-12 h-12 bg-gradient-to-br from-[color:var(--bg-secondary)] to-[color:var(--accent-light)] rounded-[1.2rem] flex items-center justify-center text-[color:var(--accent)] font-bold text-lg">
                          {(grp.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden pt-1">
                          <div className="flex justify-between items-center mb-1">
                              <h4 className="font-semibold text-[color:var(--text-primary)] text-base truncate">{grp.name}</h4>
                          </div>
                          <p className="text-xs font-semibold text-[color:var(--accent)] mb-1">{grp.members?.length || 0} Members</p>
                        </div>
                      </div>
                  ))}
                </>
             )}
          </div>
        ) : null}
      </div>

      {/* Input Area */}
      {(mode === 'haven' || (mode === 'groups' && activeGroupId) || (mode === 'direct' && activeDirectId)) && (
        <div className="fixed bottom-24 md:bottom-28 left-4 right-4 md:left-auto md:right-auto md:w-[480px] md:translate-x-[-50%] md:left-[50%] z-30">
           <form onSubmit={mode === 'haven' ? handleSend : mode === 'direct' ? handleDirectMessageSend : handleGroupMessageSend} className="relative">
            <input 
              type="text" 
              placeholder={mode === 'haven' ? "Talk to Haven..." : "Type your message..."}
              value={input}
              onChange={handleInputChange}
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
