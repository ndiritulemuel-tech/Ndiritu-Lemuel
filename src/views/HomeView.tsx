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
        const prompt = `You are a concise, empathetic relationship/wellness coach. The user is named ${user.displayName || 'User'} and is currently feeling ${myMood.mood}. Give a 1-sentence supportive, reasonable, and actionable short tip.`;
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
    
    let locationStr = 'Unknown Location';
    try {
       // Attempt to get location automatically if permitted
       // If in Kenya, default to a Kenyan location text if we can't get coords easily
       locationStr = 'Nairobi, Kenya'; 
    } catch(e) {}

    const newMoodRef = doc(collection(db, 'users', user.uid, 'moods'));
    
    try {
      await setDoc(newMoodRef, {
        mood: selectedMood,
        location: locationStr,
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
      cheerful: '😁', grateful: '🥰', whimsical: '🧚', romantic: '💖', 
      hopeful: '🌱', reflective: '🤔', calm: '😌', melancholy: '🌧️', 
      boredom: '🥱', irritated: '😒', gloomy: '😔', anxious: '😟', 
      lonely: '🚶', resentful: '😠', mysterious: '🔮', ominous: '🌩️', idyllic: '🌸'
    };
    return emojiMap[mood] || '🙂';
  };

  return (
    <div className="pb-24 px-4 sm:px-6 md:max-w-xl md:mx-auto pt-6 min-h-screen">
      {/* Header */}
      <h1 className="text-3xl font-serif mb-1 font-semibold text-[color:var(--text-primary)]">
        Good Morning, {user?.displayName?.split(' ')[0] || 'User'}
      </h1>
      <p className="text-[color:var(--text-secondary)] font-medium text-sm mb-8 flex items-center gap-1.5">
        <Calendar size={16} />
        {format(today, 'EEEE, MMMM do')}
      </p>

      {/* Primary Action Card: Daily Check-in */}
      <motion.div 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsMoodModalOpen(true)}
        className="bg-gradient-to-br from-[color:var(--accent)] to-[#FF70A6] p-6 rounded-[2rem] shadow-xl mb-6 relative overflow-hidden group cursor-pointer text-white"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl opacity-20 -mr-10 -mt-10 pointer-events-none" />
        <div className="relative z-10 flex justify-between items-start mb-4">
          <div className="w-12 h-12 bg-white/20 text-white rounded-full flex items-center justify-center text-2xl shadow-sm backdrop-blur-md border border-white/30">
            {myMood ? getMoodEmoji(myMood.mood) : '❓'}
          </div>
          <span className="bg-white text-[color:var(--accent)] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
            Daily Log
          </span>
        </div>
        <h2 className="text-xl font-semibold mb-2 text-white z-10 relative">
          {myMood ? `You felt ${myMood.mood} let's update it` : 'Log your Mood'}
        </h2>
        <p className="text-white/90 text-sm leading-relaxed max-w-[85%] z-10 relative font-medium">
          How are you feeling right now? Tap to track your emotional state.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Connection Tool / Suggestion */}
        <div className="bg-[#F5F3FF] p-5 rounded-[2rem] border border-purple-100 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-purple-700 font-bold mb-3 flex items-center gap-1">
              <Sparkles size={12} /> Coach Tip
            </h3>
            <p className="font-medium text-purple-900 text-sm leading-snug mb-3">
              {coachTip}
            </p>
          </div>
        </div>
        <div className="bg-[#F0FDF4] p-5 rounded-[2rem] border border-green-100 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-green-700 font-bold mb-3 flex items-center gap-1">
              <MapPin size={12} /> Location
            </h3>
            <p className="font-medium text-green-900 text-sm leading-snug mb-3">
               {myMood ? myMood.location : 'Nairobi, Kenya'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Recent Activity / Timeline */}
      <div className="mt-8">
        <h3 className="font-serif text-xl font-semibold text-gray-900 mb-4">Recent Moments</h3>
        <div className="space-y-4">
          {recentJournals.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent journals...</p>
          ) : (
            recentJournals.map((item, i) => (
              <div key={item.id} className="flex gap-4 items-center bg-white p-4 rounded-2xl card-shadow">
                 <div className={`w-3 h-10 rounded-full ${item.type === 'milestone' ? 'bg-[color:var(--accent)]' : 'bg-[#CC99FF]'}`} />
                 <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider font-mono">{item.type}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-400">{item.date}</span>
                    </div>
                    <p className="font-medium text-gray-800 text-sm truncate">{item.title}</p>
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
            className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end sm:justify-center items-center sm:p-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-xl rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-12 sm:pb-6 shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-serif font-semibold text-[color:var(--text-primary)]">How are you feeling?</h2>
                 <button onClick={() => setIsMoodModalOpen(false)} className="p-2 bg-gray-100 rounded-full">
                    <X size={20} />
                 </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-8 max-h-60 overflow-y-auto p-2 hide-scrollbar">
                {([
                  ['cheerful', '😁', 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200'], 
                  ['grateful', '🥰', 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200'], 
                  ['whimsical', '🧚', 'bg-purple-50 hover:bg-purple-100 border-purple-200'], 
                  ['romantic', '💖', 'bg-pink-50 hover:bg-pink-100 border-pink-200'], 
                  ['hopeful', '🌱', 'bg-green-50 hover:bg-green-100 border-green-200'], 
                  ['reflective', '🤔', 'bg-gray-50 hover:bg-gray-100 border-gray-200'], 
                  ['calm', '😌', 'bg-blue-50 hover:bg-blue-100 border-blue-200'], 
                  ['melancholy', '🌧️', 'bg-blue-50 hover:bg-blue-100 border-blue-200'], 
                  ['boredom', '🥱', 'bg-gray-50 hover:bg-gray-100 border-gray-200'], 
                  ['irritated', '😒', 'bg-red-50 hover:bg-red-100 border-red-200'], 
                  ['gloomy', '😔', 'bg-gray-50 hover:bg-gray-100 border-gray-200'], 
                  ['anxious', '😟', 'bg-orange-50 hover:bg-orange-100 border-orange-200'], 
                  ['lonely', '🚶', 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200'], 
                  ['resentful', '😠', 'bg-red-50 hover:bg-red-100 border-red-200'], 
                  ['mysterious', '🔮', 'bg-purple-50 hover:bg-purple-100 border-purple-200'], 
                  ['ominous', '🌩️', 'bg-slate-50 hover:bg-slate-100 border-slate-200'], 
                  ['idyllic', '🌸', 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200']
                ] as const).map(([moodStr, emoji, colors]) => (
                  <button 
                    key={moodStr}
                    onClick={() => setSelectedMood(moodStr as any)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ${colors} ${selectedMood === moodStr ? 'border-[color:var(--text-primary)] scale-105 shadow-md' : 'border-transparent'}`}
                  >
                    <span className="text-3xl">{emoji}</span>
                    <span className="font-semibold text-gray-800 capitalize text-xs">{moodStr}</span>
                  </button>
                ))}
              </div>

              <button 
                onClick={logMood}
                disabled={isLogging}
                className="w-full bg-[color:var(--text-primary)] text-white py-4 rounded-xl font-semibold disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isLogging ? <Loader2 className="animate-spin" size={20}/> : 'Save Mood'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
