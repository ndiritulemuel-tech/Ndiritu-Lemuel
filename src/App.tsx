import React, { useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { SOSModal } from './components/SOSModal';
import { HomeView } from './views/HomeView';
import { JournalView } from './views/JournalView';
import { ChatView } from './views/ChatView';
import { ProfileView } from './views/ProfileView';
import { LoginView } from './views/LoginView';
import { useAuth } from './AuthContext';
import { ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const { user, profile } = useAuth();

  const renderView = () => {
    switch (currentTab) {
      case 'home': return <HomeView />;
      case 'journal': return <JournalView />;
      case 'chat': return <ChatView />;
      case 'profile': return <ProfileView />;
      default: return <HomeView />;
    }
  };

  if (!user || !profile) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-[color:var(--bg-primary)] font-sans relative overflow-x-hidden">
      
      {/* Top Floating SOS Button */}
      <div className="absolute top-6 right-4 sm:right-8 z-40">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsSOSOpen(true)}
          className="bg-[color:var(--distress)]/10 text-[color:var(--distress)] backdrop-blur-md p-3 px-4 rounded-full border border-white/50 shadow-sm flex items-center justify-center gap-2"
        >
          <ShieldAlert size={18} strokeWidth={2.5} />
          <span className="font-bold text-xs tracking-wider">SOS</span>
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={currentTab}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
           transition={{ duration: 0.2 }}
           className="h-full"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>

      <BottomNav currentTab={currentTab} setTab={setCurrentTab} />
      <SOSModal isOpen={isSOSOpen} onClose={() => setIsSOSOpen(false)} />
    </div>
  );
}
