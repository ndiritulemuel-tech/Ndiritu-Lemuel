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
          onClick={() => setIsCreating(true)}
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
          <p className="text-gray-500 text-center py-10 animate-pulse">Loading entries...</p>
        ) : filteredEntries.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No entries found. Write your first journal!</p>
        ) : (
          filteredEntries.map(entry => (
            <motion.div 
              key={entry.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-5 rounded-[2rem]",
                entry.type === 'milestone' 
                  ? "bg-white card-shadow" 
                  : "bg-white/60 backdrop-blur-md border border-[color:var(--accent-light)]"
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    entry.type === 'milestone' ? "bg-[color:var(--accent-light)] text-[color:var(--accent)]" : "bg-gray-100 text-gray-500"
                  )}>
                    {entry.type === 'milestone' ? <Calendar size={14} /> : <Lock size={14} />}
                  </div>
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-widest",
                    entry.type === 'milestone' ? "text-[color:var(--accent)]" : "text-gray-500"
                  )}>
                    {entry.type}
                  </span>
                </div>
                <span className="text-xs text-gray-400 font-medium">{entry.date}</span>
              </div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-serif text-lg font-semibold">{entry.title}</h3>
                <div className="flex items-center">
                  <button 
                    onClick={() => handleEditClick(entry)}
                    className="text-gray-400 hover:text-[color:var(--accent)] text-xs font-semibold px-2"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(entry.id)}
                    className="text-gray-400 hover:text-red-500 text-xs font-semibold px-2"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                {entry.content}
              </p>
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
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-xl rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-12 sm:pb-6 shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-serif font-semibold">{newTitle ? 'Edit Entry' : 'New Entry'}</h2>
                 <button onClick={() => setIsCreating(false)} className="p-2 bg-gray-100 rounded-full">
                    <X size={20} />
                 </button>
              </div>
              
              <div className="space-y-4">
                 <select 
                   value={newType} 
                   onChange={(e) => setNewType(e.target.value as 'daily'|'milestone')}
                   className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-[color:var(--accent)]"
                 >
                    <option value="daily">Daily Journal (Private)</option>
                    <option value="milestone">Milestone Memory</option>
                 </select>

                 <input 
                   type="text" 
                   value={newTitle}
                   onChange={e => setNewTitle(e.target.value)}
                   placeholder="Title your entry..."
                   className="w-full text-lg font-medium p-3 border-b border-gray-100 outline-none focus:border-[color:var(--accent)]"
                 />

                 <textarea 
                   rows={6}
                   value={newContent}
                   onChange={e => setNewContent(e.target.value)}
                   placeholder="What's on your mind?"
                   className="w-full p-3 outline-none resize-none bg-gray-50 rounded-xl focus:bg-white border border-transparent focus:border-[color:var(--accent)] transition-colors"
                 />
                 
                 <button 
                   onClick={handleCreate}
                   disabled={!newTitle.trim() || !newContent.trim()}
                   className="w-full bg-[color:var(--text-primary)] text-white py-4 rounded-xl font-semibold disabled:opacity-50"
                 >
                   Save Entry
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
