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

  const handlePartnerCall = () => {
    if (profile?.partnerContact) {
      window.open(`tel:${profile.partnerContact}`, '_self');
    } else {
      alert("Please configure your partner's contact in the Profile tab first.");
    }
  };

  const startBreathing = (withVoice: boolean) => {
    setIsBreathingVoice(withVoice);
    setView('breathing');
    if (withVoice) {
      const utterance = new SpeechSynthesisUtterance("Take a deep breath in... and out. We are here with you. Focus on your heartbeat.");
      const voicePref = profile?.coachVoice && profile.coachVoice !== 'neutral' ? profile.coachVoice : 'female';
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
            className="fixed inset-x-0 bottom-0 bg-white z-[101] rounded-t-[2.5rem] p-6 pb-12 card-shadow max-h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif text-[color:var(--distress)] font-semibold flex items-center gap-2">
                <HeartPulse size={28} />
                Distress Tools
              </h2>
              <button 
                onClick={handleClose}
                className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            {view === 'menu' && (
              <>
                <p className="text-gray-600 mb-8 font-medium">
                  Take a deep breath. We are here to help you through this moment.
                </p>
                <div className="grid gap-4">
                  <button onClick={handlePartnerCall} className="flex items-center gap-4 bg-[#FFF5F5] hover:bg-[#FFE3E3] transition-colors p-4 rounded-3xl group">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#D94A4A] group-hover:scale-105 transition-transform card-shadow">
                      <Phone size={24} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 text-lg">Call Partner</h3>
                      <p className="text-sm text-gray-500">Alert them that you need support</p>
                    </div>
                  </button>
                  
                  <div className="flex gap-2">
                    <button onClick={() => startBreathing(false)} className="flex-1 flex items-center gap-4 bg-orange-50 hover:bg-orange-100 transition-colors p-4 rounded-3xl group">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-orange-500 group-hover:scale-105 transition-transform card-shadow">
                        <Wind size={20} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">Text Breathing</h3>
                      </div>
                    </button>
                    
                    <button onClick={() => startBreathing(true)} className="flex-1 flex items-center gap-4 bg-orange-50 hover:bg-orange-100 transition-colors p-4 rounded-3xl group">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-orange-500 group-hover:scale-105 transition-transform card-shadow">
                        <Volume2 size={20} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">Voice Breathing</h3>
                      </div>
                    </button>
                  </div>
                  
                  <button onClick={() => setView('crisis')} className="flex items-center gap-4 bg-blue-50 hover:bg-blue-100 transition-colors p-4 rounded-3xl group">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform card-shadow">
                      <AlertTriangle size={24} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 text-lg">Crisis Lines (Kenya)</h3>
                      <p className="text-sm text-gray-500">Connect with professional help</p>
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
                  className="w-32 h-32 bg-orange-100 rounded-full flex items-center justify-center mb-8"
                >
                  <div className="w-16 h-16 bg-orange-300 rounded-full" />
                </motion.div>
                <h3 className="text-2xl font-serif mb-2">Breathe In... Breathe Out...</h3>
                <p className="text-gray-500">
                  {isBreathingVoice ? "Listen to the voice and follow the rhythm." : "Follow the pulsating circle. Inhale as it grows, exhale as it shrinks."}
                </p>
                <button onClick={() => { window.speechSynthesis.cancel(); setView('menu'); }} className="mt-8 text-sm font-semibold text-gray-500 p-2">
                  Back to Menu
                </button>
              </div>
            )}

            {view === 'crisis' && (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4 font-medium">National Emergency & Crisis Lines in Kenya:</p>
                <div className="space-y-3">
                  <a href="tel:999" className="block p-4 border border-gray-100 rounded-2xl flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <h4 className="font-semibold text-gray-900">Police / Emergency</h4>
                      <p className="text-sm text-gray-500">General Emergency</p>
                    </div>
                    <span className="font-bold text-lg text-blue-600">999 / 112</span>
                  </a>
                  <a href="tel:1195" className="block p-4 border border-gray-100 rounded-2xl flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <h4 className="font-semibold text-gray-900">Gender Violence Check</h4>
                      <p className="text-sm text-gray-500">GVRC Toll Free</p>
                    </div>
                    <span className="font-bold text-lg text-blue-600">1195</span>
                  </a>
                  <a href="tel:1199" className="block p-4 border border-gray-100 rounded-2xl flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <h4 className="font-semibold text-gray-900">Kenya Red Cross</h4>
                      <p className="text-sm text-gray-500">Ambulance & Emergency Response</p>
                    </div>
                    <span className="font-bold text-lg text-blue-600">1199</span>
                  </a>
                  <a href="tel:1190" className="block p-4 border border-gray-100 rounded-2xl flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <h4 className="font-semibold text-gray-900">Befrienders Kenya</h4>
                      <p className="text-sm text-gray-500">Suicide Prevention</p>
                    </div>
                    <span className="font-bold text-lg text-blue-600">+254 722 178 177</span>
                  </a>
                </div>
                <button onClick={() => setView('menu')} className="w-full mt-4 text-sm font-semibold text-gray-500 p-2 text-center">
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
