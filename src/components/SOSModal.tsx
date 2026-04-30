import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HeartPulse, Phone, AlertTriangle, ShieldAlert, X, Wind, Volume2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { getPreferredVoice } from '../lib/utils';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SOSModal({ isOpen, onClose }: SOSModalProps) {
  const { profile } = useAuth();
  const [view, setView] = useState<'menu' | 'breathing' | 'crisis'>('menu');
  const [isBreathingVoice, setIsBreathingVoice] = useState(false);

  const handleTrustedContactCall = () => {
    if (profile?.partnerContact) {
      window.open(`tel:${profile.partnerContact}`, '_self');
    } else {
      alert("Please configure your trusted contact in the Profile tab first.");
    }
  };

  const startBreathing = (withVoice: boolean) => {
    setIsBreathingVoice(withVoice);
    setView('breathing');
    if (withVoice) {
      const utterance = new SpeechSynthesisUtterance("Take a deep breath in... and out. We are here with you. Focus on your heartbeat.");
      const voicePref = 'female';
      const voice = getPreferredVoice(voicePref);
      if (voice) utterance.voice = voice;
      
      utterance.pitch = 1.0;
      utterance.rate = 0.8; // Slow down for breathing
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleClose = () => {
    window.speechSynthesis.cancel();
    setView('menu');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black z-[100]"
          />
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 bg-white z-[101] rounded-t-[2.5rem] p-6 pb-12 shadow-[0_-20px_40px_rgb(0,0,0,0.08)] max-h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif text-[color:var(--distress)] font-semibold flex items-center gap-2">
                <HeartPulse size={28} />
                Safety Plan
              </h2>
              <button 
                onClick={handleClose}
                className="p-2 bg-gray-100 rounded-full text-[color:var(--text-secondary)] hover:bg-gray-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            {view === 'menu' && (
              <>
                <p className="text-[color:var(--text-secondary)] mb-8 font-medium">
                  Take a deep breath. We are here to help you through this moment.
                </p>
                <div className="grid gap-3">
                  <button onClick={handleTrustedContactCall} className="flex items-center gap-4 bg-[#FFF5F5] hover:bg-[#FFE3E3] transition-colors p-4 rounded-[1.5rem] group shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-red-50">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[color:var(--distress)] group-hover:scale-105 transition-transform shadow-sm">
                      <Phone size={24} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 text-base">Call Trusted Contact</h3>
                      <p className="text-xs text-[color:var(--text-secondary)]">Alert them that you need support</p>
                    </div>
                  </button>
                  
                  <div className="flex gap-3">
                    <button onClick={() => startBreathing(false)} className="flex-1 flex flex-col items-center justify-center gap-3 bg-[color:var(--bg-secondary)] hover:bg-[color:var(--accent-light)] transition-colors p-5 rounded-[1.5rem] group shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-[color:var(--bg-secondary)]">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[color:var(--accent)] group-hover:scale-105 transition-transform shadow-sm">
                        <Wind size={20} />
                      </div>
                      <div className="text-center">
                        <h3 className="font-medium text-sm text-[color:var(--text-primary)]">Text Breathing</h3>
                      </div>
                    </button>
                    
                    <button onClick={() => startBreathing(true)} className="flex-1 flex flex-col items-center justify-center gap-3 bg-[color:var(--bg-secondary)] hover:bg-[color:var(--accent-light)] transition-colors p-5 rounded-[1.5rem] group shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-[color:var(--bg-secondary)]">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[color:var(--accent)] group-hover:scale-105 transition-transform shadow-sm">
                        <Volume2 size={20} />
                      </div>
                      <div className="text-center">
                        <h3 className="font-medium text-sm text-[color:var(--text-primary)]">Voice Breathing</h3>
                      </div>
                    </button>
                  </div>
                  
                  <button onClick={() => setView('crisis')} className="flex items-center gap-4 bg-[color:var(--blue-soft)] hover:bg-blue-100/50 transition-colors p-4 rounded-[1.5rem] group shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-blue-50">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform shadow-sm">
                      <AlertTriangle size={24} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-[color:var(--text-primary)] text-base">Crisis Lines</h3>
                      <p className="text-xs text-[color:var(--text-secondary)]">Connect with professional help</p>
                    </div>
                  </button>
                </div>
              </>
            )}

            {view === 'breathing' && (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  className="w-32 h-32 bg-[color:var(--accent-light)] rounded-full flex items-center justify-center mb-8"
                >
                  <div className="w-16 h-16 bg-[color:var(--accent)] rounded-full" />
                </motion.div>
                <h3 className="text-2xl font-serif mb-2 text-[color:var(--text-primary)]">Breathe In... Breathe Out...</h3>
                <p className="text-[color:var(--text-secondary)]">
                  {isBreathingVoice ? "Listen to the voice and follow the rhythm." : "Follow the pulsating circle. Inhale as it grows, exhale as it shrinks."}
                </p>
                <button onClick={() => { window.speechSynthesis.cancel(); setView('menu'); }} className="mt-8 text-sm font-semibold text-[color:var(--text-primary)] p-2">
                  Back to Menu
                </button>
              </div>
            )}

            {view === 'crisis' && (
              <div className="space-y-4">
                <p className="text-[color:var(--text-secondary)] mb-4 font-medium">National Emergency & Crisis Lines:</p>
                <div className="space-y-3">
                  <a href="tel:999" className="block p-4 border border-gray-100 rounded-2xl flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <h4 className="font-semibold text-[color:var(--text-primary)]">Police & Ambulance</h4>
                      <p className="text-sm text-[color:var(--text-secondary)]">General Emergency</p>
                    </div>
                    <span className="font-bold text-lg text-[color:var(--accent)]">999 / 112</span>
                  </a>
                  <a href="tel:1195" className="block p-4 border border-gray-100 rounded-2xl flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <h4 className="font-semibold text-[color:var(--text-primary)]">Gender Violence</h4>
                      <p className="text-sm text-[color:var(--text-secondary)]">GVRC Toll Free</p>
                    </div>
                    <span className="font-bold text-lg text-[color:var(--accent)]">1195</span>
                  </a>
                  <a href="tel:1199" className="block p-4 border border-gray-100 rounded-2xl flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <h4 className="font-semibold text-[color:var(--text-primary)]">Kenya Red Cross</h4>
                      <p className="text-sm text-[color:var(--text-secondary)]">Emergency Response</p>
                    </div>
                    <span className="font-bold text-lg text-[color:var(--accent)]">1199</span>
                  </a>
                  <a href="tel:1190" className="block p-4 border border-gray-100 rounded-2xl flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <h4 className="font-semibold text-[color:var(--text-primary)]">Befrienders Kenya</h4>
                      <p className="text-sm text-[color:var(--text-secondary)]">Suicide Prevention</p>
                    </div>
                    <span className="font-bold text-lg text-[color:var(--accent)]">+254 722 178 177</span>
                  </a>
                </div>
                <button onClick={() => setView('menu')} className="w-full mt-4 text-sm font-semibold text-[color:var(--text-primary)] p-2 text-center">
                  Back to Menu
                </button>
              </div>
            )}
            
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
