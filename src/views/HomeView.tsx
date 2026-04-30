import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Sparkles, MapPin, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, limit, serverTimestamp } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export function HomeView() {
  const today = new Date();
  const { user } = useAuth();
  
  const [recentJournals, setRecentJournals] = useState<any[]>([]);
  const [partnerMood, setPartnerMood] = useState<any>(null); // For future partner integration
  const [myMood, setMyMood] = useState<any>(null);
  const [coachTip, setCoachTip] = useState('"Take a deep breath and appreciate one small thing today."');
  
  const [isMoodModalOpen, setIsMoodModalOpen] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [selectedMood, setSelectedMood] = useState<'cheerful' | 'calm' | 'melancholy' | 'irritated' | 'idyllic' | any>('cheerful');

  useEffect(() => {
    if (!user) return;
    
    // Fetch recent journals
    const journalsRef = collection(db, 'users', user.uid, 'journals');
    const jq = query(journalsRef, orderBy('createdAt', 'desc'), limit(3));
    const unsubJournals = onSnapshot(jq, (snapshot) => {
      setRecentJournals(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, error => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/journals`));

    // Fetch my latest mood
    const moodsRef = collection(db, 'users', user.uid, 'moods');
    const mq = query(moodsRef, orderBy('createdAt', 'desc'), limit(1));
    const unsubMoods = onSnapshot(mq, (snapshot) => {
      if (!snapshot.empty) setMyMood(snapshot.docs[0].data());
    }, error => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/moods`));

    return () => {
      unsubJournals();
      unsubMoods();
    };
  }, [user]);

  useEffect(() => {
    if (!user || !myMood) return;
    const generateTip = async () => {
      try {
        const prompt = `You are a calm, unobtrusive mental health companion. The user is named ${user.displayName || 'User'} and logged their feeling as ${myMood.mood}. Give a 1-sentence grounding technique or gentle supportive thought. Do not be overly enthusiastic or demanding.`;
        const response = await ai.models.generateContent({
           model: 'gemini-2.5-flash',
           contents: prompt
        });
        if (response.text) {
           setCoachTip(`"${response.text.replace(/["*]/g, '').trim()}"`);
        }
      } catch (err) {
        console.error("Tip generation failed", err);
      }
    };
    generateTip();
  }, [user, myMood?.mood]);

  const logMood = async () => {
    if (!user) return;
    setIsLogging(true);
    
    const newMoodRef = doc(collection(db, 'users', user.uid, 'moods'));
    
    try {
      await setDoc(newMoodRef, {
        mood: selectedMood,
        createdAt: serverTimestamp()
      });
      setIsMoodModalOpen(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/moods`);
    } finally {
      setIsLogging(false);
    }
  };

  const getMoodEmoji = (mood: string) => {
    const emojiMap: Record<string, string> = {
      calm: '😌', content: '🙂', energized: '✨', 
      exhausted: '🔋', overwhelmed: '🌊', anxious: '🦋', 
      sad: '🌧️', numb: '🌫️', irritable: '⚡', 
      healing: '🌱', triggered: '🚨',
      joyful: '🥳', hopeful: '🌈', grateful: '🙏',
      lonely: '🧊', frustrated: '😤', insecure: '🥀',
      nostalgic: '📼', confused: '🌀', peaceful: '🕊️',
      focused: '🎯', romantic: '💌', scattered: '🍂'
    };
    return emojiMap[mood] || '🙂';
  };

  return (
    <div className="pb-32 px-4 sm:px-6 md:max-w-xl md:mx-auto pt-8 min-h-screen relative">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-br from-[color:var(--accent-light)]/40 to-transparent blur-3xl -z-10" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif mb-1 font-semibold text-[color:var(--text-primary)] tracking-tight">
            Hello, {user?.displayName?.split(' ')[0] || 'Friend'}
          </h1>
          <p className="text-[color:var(--text-secondary)] font-medium text-sm flex items-center gap-1.5 opacity-80">
            <Calendar size={14} />
            {format(today, 'EEEE, MMMM do')}
          </p>
        </div>
        <div className="w-12 h-12 bg-white rounded-[1rem] shadow-sm flex items-center justify-center text-[color:var(--accent)] font-serif font-bold text-lg border border-white/60">
          {(user?.displayName || 'F').charAt(0)}
        </div>
      </div>

      {/* Primary Action Card: Daily Check-in */}
      <motion.div 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsMoodModalOpen(true)}
        className="bg-white p-6 rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.04)] mb-6 relative overflow-hidden group cursor-pointer border border-white/60"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[color:var(--accent-light)] to-[color:var(--bg-secondary)] rounded-full blur-3xl opacity-40 -mr-16 -mt-16 pointer-events-none transition-transform group-hover:scale-110" />
        
        <div className="relative z-10 flex justify-between items-start mb-5">
          <div className="w-14 h-14 bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)] rounded-[1.25rem] flex items-center justify-center text-3xl shadow-sm border border-[color:var(--accent-light)]/50">
            {myMood ? getMoodEmoji(myMood.mood) : '💭'}
          </div>
          <span className="bg-[color:var(--text-primary)] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
            Quick Check-in
          </span>
        </div>
        <h2 className="text-2xl font-serif font-semibold mb-2 text-[color:var(--text-primary)] z-10 relative">
          {myMood ? `You logged "${myMood.mood}" today.` : 'How is your energy right now?'}
        </h2>
        <p className="text-[color:var(--text-secondary)] text-sm leading-relaxed max-w-[90%] z-10 relative font-medium opacity-90">
          No typing required. Just tap an icon to log your state and maintain your self-care streak.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Connection Tool / Suggestion */}
        <div className="bg-white p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-blue-50/50 flex flex-col justify-between col-span-2 sm:col-span-1 min-h-[140px] relative overflow-hidden">
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-[color:var(--blue-soft)] rounded-full blur-2xl opacity-60 pointer-events-none" />
          <div className="relative z-10">
            <div className="w-8 h-8 bg-[color:var(--blue-soft)]/50 rounded-full flex items-center justify-center mb-3 text-blue-700">
               <Sparkles size={14} />
            </div>
            <h3 className="text-[10px] uppercase tracking-widest text-blue-800/80 font-bold mb-2">
              Anchor Thought
            </h3>
            <p className="font-medium text-[color:var(--text-primary)] text-sm leading-snug">
              {coachTip}
            </p>
          </div>
        </div>
        
        <div className="bg-[color:var(--text-primary)] text-white p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-gray-800 flex flex-col justify-between col-span-2 sm:col-span-1 min-h-[140px] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[color:var(--accent)]/30 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <h3 className="text-[10px] uppercase tracking-widest text-[#A2B8A9] font-bold mb-2 flex items-center gap-1">
              <Sparkles className="text-[color:var(--accent)] opacity-80" size={12} /> Self-Care Streak
            </h3>
            <div className="flex items-end gap-1.5 mb-2 mt-4">
               <span className="text-4xl font-serif">3</span>
               <span className="text-sm font-medium text-[#A2B8A9] pb-1.5">Days</span>
            </div>
            <p className="font-medium text-[#D1DDCC] text-xs leading-snug">
               Every check-in is a win.
            </p>
          </div>
        </div>
      </div>
      
      {/* Recent Activity / Timeline */}
      <div className="mt-8">
        <h3 className="font-serif text-xl font-semibold text-[color:var(--text-primary)] mb-4 flex items-center justify-between">
          Recent Notes
          <span className="text-xs font-sans text-[color:var(--text-secondary)] uppercase tracking-wider font-semibold opacity-60">View all</span>
        </h3>
        <div className="space-y-3">
          {recentJournals.length === 0 ? (
            <p className="text-[color:var(--text-secondary)] text-sm mb-4">You haven't written anything recently. Take your time.</p>
          ) : (
            recentJournals.map((item, i) => (
              <div key={item.id} className="group cursor-pointer flex gap-4 items-center bg-white p-4 rounded-[1.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-gray-50 hover:border-[color:var(--accent-light)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                 <div className="w-12 h-12 rounded-[1.25rem] bg-[color:var(--bg-secondary)] flex items-center justify-center text-[color:var(--accent)] group-hover:scale-105 transition-transform">
                   <Calendar size={18} />
                 </div>
                 <div className="flex-1 overflow-hidden">
                    <p className="font-semibold text-[color:var(--text-primary)] text-sm truncate mb-0.5">{item.title}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-[color:var(--accent)] bg-[color:var(--accent)]/10 px-2 py-0.5 rounded-full tracking-wider">{item.type || 'journal'}</span>
                      <span className="text-[11px] text-[color:var(--text-secondary)] font-medium">{item.date || 'Recently'}</span>
                    </div>
                 </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {isMoodModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center sm:p-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-12 sm:pb-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                 <div>
                   <h2 className="text-2xl font-serif font-semibold text-[color:var(--text-primary)]">Energy Check-In</h2>
                   <p className="text-sm text-[color:var(--text-secondary)] mt-1">Tap what feels most true right now.</p>
                 </div>
                 <button onClick={() => setIsMoodModalOpen(false)} className="p-3 bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)] rounded-full hover:bg-[color:var(--accent-light)] transition-colors">
                    <X size={20} />
                 </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-8 max-h-96 overflow-y-auto p-2 hide-scrollbar">
                {([
                  ['joyful', '🥳', 'bg-amber-50 hover:bg-amber-100 border-amber-200'],
                  ['calm', '😌', 'bg-blue-50/50 hover:bg-blue-100 border-blue-200'], 
                  ['content', '🙂', 'bg-green-50/50 hover:bg-green-100 border-green-200'], 
                  ['energized', '✨', 'bg-yellow-50/50 hover:bg-yellow-100 border-yellow-200'], 
                  ['hopeful', '🌈', 'bg-sky-50 hover:bg-sky-100 border-sky-200'],
                  ['grateful', '🙏', 'bg-rose-50 hover:bg-rose-100 border-rose-200'],
                  ['healing', '🌱', 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200'], 
                  ['peaceful', '🕊️', 'bg-teal-50 hover:bg-teal-100 border-teal-200'],
                  ['focused', '🎯', 'bg-purple-50 hover:bg-purple-100 border-purple-200'],
                  ['romantic', '💌', 'bg-pink-50 hover:bg-pink-100 border-pink-200'],
                  ['exhausted', '🔋', 'bg-slate-100 hover:bg-slate-200 border-slate-300'], 
                  ['overwhelmed', '🌊', 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200'], 
                  ['anxious', '🦋', 'bg-orange-50 hover:bg-orange-100 border-orange-200'], 
                  ['sad', '🌧️', 'bg-blue-100 hover:bg-blue-200 border-blue-300'], 
                  ['lonely', '🧊', 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200'],
                  ['numb', '🌫️', 'bg-gray-100 hover:bg-gray-200 border-gray-300'], 
                  ['irritable', '⚡', 'bg-red-50 hover:bg-red-100 border-red-200'], 
                  ['frustrated', '😤', 'bg-orange-100 hover:bg-orange-200 border-orange-300'],
                  ['insecure', '🥀', 'bg-stone-100 hover:bg-stone-200 border-stone-300'],
                  ['confused', '🌀', 'bg-violet-50 hover:bg-violet-100 border-violet-200'],
                  ['scattered', '🍂', 'bg-amber-100 hover:bg-amber-200 border-amber-300'],
                  ['nostalgic', '📼', 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200'],
                  ['triggered', '🚨', 'bg-red-100 hover:bg-red-200 border-red-300']
                ] as const).map(([moodStr, emoji, colors]) => (
                  <button 
                    key={moodStr}
                    onClick={() => setSelectedMood(moodStr as any)}
                    className={`flex flex-col items-center justify-center gap-2 py-4 rounded-[1.5rem] border-2 transition-all duration-200 ${colors} ${selectedMood === moodStr ? 'ring-2 ring-offset-2 ring-[color:var(--text-primary)] border-[color:var(--text-primary)] scale-[1.02] shadow-md opacity-100' : 'border-transparent opacity-80 hover:opacity-100'}`}
                  >
                    <span className="text-3xl filter saturate-75">{emoji}</span>
                    <span className="font-medium text-[color:var(--text-primary)] capitalize text-xs tracking-wide">{moodStr}</span>
                  </button>
                ))}
              </div>

              <button 
                onClick={logMood}
                disabled={isLogging}
                className="w-full bg-[color:var(--text-primary)] hover:bg-[#1a231e] text-white py-4 rounded-xl font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isLogging ? <Loader2 className="animate-spin text-white/50" size={20}/> : 'Save Changes'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
