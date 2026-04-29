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
      <div className="fixed top-6 right-4 sm:right-8 z-50">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsSOSOpen(true)}
          className="bg-[color:var(--distress)] text-white p-3 rounded-full shadow-[0_8px_30px_rgba(255,59,48,0.4)] flex items-center justify-center gap-2"
        >
          <ShieldAlert size={20} />
          <span className="font-bold text-sm tracking-wide hidden sm:block">SOS</span>
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
