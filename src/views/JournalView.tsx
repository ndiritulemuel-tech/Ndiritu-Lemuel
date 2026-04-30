import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Plus, Calendar, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'daily' | 'milestone';
  createdAt: any;
  updatedAt: any;
}

export function JournalView() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'daily' | 'milestone'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<'daily' | 'milestone'>('daily');
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentPrompt, setCurrentPrompt] = useState('What is one thing that felt heavy today?');
  const [isNotReady, setIsNotReady] = useState(false);

  const prompts = [
    "What is one thing that felt heavy today?",
    "What is one small win you had today?",
    "What is something you can let go of today?",
    "Name a moment where you felt at peace today, even briefly.",
    "What is one thing your body needs right now?",
    "What is a gentle boundary you can set for tomorrow?"
  ];

  const shufflePrompt = () => {
    const random = prompts[Math.floor(Math.random() * prompts.length)];
    setCurrentPrompt(random);
    setNewTitle(''); // Allow user to just answer the prompt
  };

  const openNewEntry = () => {
    setIsCreating(true);
    setIsNotReady(false);
    shufflePrompt();
  };

  useEffect(() => {
    if (!user) return;
    const journalsRef = collection(db, 'users', user.uid, 'journals');
    const q = query(journalsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as JournalEntry[];
      setEntries(fetched);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/journals`);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const handleEditClick = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setNewTitle(entry.title);
    setNewContent(entry.content);
    setNewType(entry.type);
    setIsCreating(true);
  };

  const handleCreate = async () => {
    if (!user || !newTitle.trim() || !newContent.trim()) return;
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const now = new Date().toISOString();
    
    // If editingId is set, update existing, otherwise create new
    const newDocRef = editingId ? doc(db, 'users', user.uid, 'journals', editingId) : doc(collection(db, 'users', user.uid, 'journals'));
    
    // For updates we must preserve the original createdAt
    // To do this simply, we'll get the old entry's createdAt if editing
    const oldEntry = editingId ? entries.find(e => e.id === editingId) : null;

    const entryData = {
      title: newTitle,
      content: newContent,
      date: editingId ? (oldEntry?.date || dateStr) : dateStr,
      type: newType,
      createdAt: editingId ? (oldEntry?.createdAt || serverTimestamp()) : serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(newDocRef, {
          title: newTitle,
          content: newContent,
          date: oldEntry?.date || dateStr,
          type: newType,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(newDocRef, entryData);
      }
      setIsCreating(false);
      setEditingId(null);
      setNewTitle('');
      setNewContent('');
      setNewType('daily');
    } catch (e) {
      handleFirestoreError(e, editingId ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/journals/${newDocRef.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (confirm('Are you sure you want to delete this entry?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'journals', id));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/journals/${id}`);
      }
    }
  };

  const filteredEntries = entries.filter(e => filter === 'all' || e.type === filter);

  return (
    <div className="pb-24 px-4 sm:px-6 md:max-w-xl md:mx-auto pt-6 min-h-screen relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-serif font-semibold text-[color:var(--text-primary)]">
          Journal
        </h1>
        <button 
          onClick={openNewEntry}
          className="w-10 h-10 bg-[color:var(--accent)] text-white rounded-full flex items-center justify-center card-shadow hover:scale-105 transition-transform"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex gap-2 mb-8 bg-gray-100/60 p-1.5 rounded-full overflow-x-auto hide-scrollbar">
        {[ 
          { id: 'all', label: 'All Entries' }, 
          { id: 'daily', label: 'Daily', icon: Lock },
          { id: 'milestone', label: 'Milestones', icon: Calendar }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as 'all' | 'daily' | 'milestone')}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              filter === tab.id 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.icon && <tab.icon size={14} />}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {isLoading ? (
          <p className="text-[color:var(--text-secondary)] text-center py-10 animate-pulse">Loading entries...</p>
        ) : filteredEntries.length === 0 ? (
          <p className="text-[color:var(--text-secondary)] text-center py-10">No entries found. Write your first journal!</p>
        ) : (
          filteredEntries.map(entry => (
            <motion.div 
              key={entry.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-50 hover:border-[color:var(--accent-light)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] group"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[1rem] bg-[color:var(--bg-secondary)] flex items-center justify-center text-[color:var(--accent)] group-hover:scale-105 transition-transform">
                    {entry.type === 'milestone' ? <Calendar size={16} /> : <Lock size={16} />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[color:var(--text-primary)] text-sm">{entry.title}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] uppercase font-bold text-[color:var(--accent)] bg-[color:var(--accent)]/10 px-2 py-0.5 rounded-full tracking-wider">
                        {entry.type}
                      </span>
                      <span className="text-[11px] text-[color:var(--text-secondary)] font-medium">{entry.date}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center mt-1">
                  <button 
                    onClick={() => handleEditClick(entry)}
                    className="text-gray-400 hover:text-[color:var(--accent)] text-xs font-semibold px-2 transition-colors"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(entry.id)}
                    className="text-gray-400 hover:text-red-500 text-xs font-semibold px-2 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="pl-[3.25rem]">
                <p className="text-[color:var(--text-secondary)] text-sm leading-relaxed whitespace-pre-wrap opacity-90 line-clamp-3">
                  {entry.content}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-12 sm:pb-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-serif font-semibold text-[color:var(--text-primary)]">
                    {isNotReady ? 'Breathe With Me' : (newTitle ? 'Edit Entry' : 'Micro-Journal')}
                 </h2>
                 <button onClick={() => setIsCreating(false)} className="p-3 bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)] rounded-full hover:bg-[color:var(--accent-light)] transition-colors">
                    <X size={20} />
                 </button>
              </div>
              
              {isNotReady ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
                   <div className="w-32 h-32 rounded-full border-4 border-[color:var(--bg-secondary)] animate-[pulse_4s_ease-in-out_infinite] flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full bg-[color:var(--bg-secondary)] animate-[ping_4s_ease-in-out_infinite] opacity-50 absolute"></div>
                      <span className="text-[color:var(--accent)] font-medium text-lg z-10">Inhale...</span>
                   </div>
                   <div className="max-w-xs space-y-3">
                     <p className="text-[color:var(--text-primary)] font-medium">It's okay to step back.</p>
                     <p className="text-[color:var(--text-secondary)] text-sm leading-relaxed">
                       You don't have to write anything right now. Take a few deep breaths, matching the pulsing circle. 
                       Close the app if you need to. You are safe.
                     </p>
                   </div>
                   <button 
                     onClick={() => setIsCreating(false)}
                     className="mt-4 px-6 py-3 bg-[color:var(--text-primary)] hover:bg-[#1a231e] text-white rounded-xl font-medium transition-colors"
                   >
                     I'm done for now
                   </button>
                </div>
              ) : (
                <div className="space-y-4">
                   {!editingId && (
                     <div className="bg-[color:var(--bg-secondary)] p-4 rounded-xl border border-[color:var(--accent-light)] relative">
                       <p className="text-[color:var(--text-primary)] font-medium text-sm pr-8 leading-relaxed">
                         {currentPrompt}
                       </p>
                       <button 
                         onClick={shufflePrompt}
                         className="absolute top-3 right-3 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] p-1 rounded-full hover:bg-white/50 transition-colors"
                         title="Change prompt"
                       >
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                       </button>
                     </div>
                   )}

                   <input 
                     type="text" 
                     value={newTitle}
                     onChange={e => setNewTitle(e.target.value)}
                     placeholder={editingId ? "Title your entry..." : "Use the prompt as your title, or write your own..."}
                     className="w-full text-base font-medium p-3 bg-gray-50/50 rounded-xl outline-none focus:bg-white border border-transparent focus:border-[color:var(--accent)] transition-colors"
                   />

                   <textarea 
                     rows={5}
                     value={newContent}
                     onChange={e => setNewContent(e.target.value)}
                     placeholder="Write as much or as little as you need..."
                     className="w-full p-3 outline-none resize-none bg-gray-50/50 rounded-xl focus:bg-white border border-transparent focus:border-[color:var(--accent)] transition-colors text-sm"
                   />
                   
                   <div className="flex flex-col sm:flex-row gap-3 pt-2">
                     <button 
                       onClick={() => setIsNotReady(true)}
                       className="w-full sm:w-1/3 border-2 border-[color:var(--bg-secondary)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)] py-3 rounded-xl font-medium transition-colors text-sm"
                     >
                       I'm Not Ready
                     </button>
                     <button 
                       onClick={handleCreate}
                       disabled={!newContent.trim()}
                       className="w-full sm:w-2/3 bg-[color:var(--text-primary)] text-white py-3 rounded-xl font-medium disabled:opacity-50 hover:bg-[#1a231e] transition-colors"
                     >
                       Save Entry
                     </button>
                   </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
