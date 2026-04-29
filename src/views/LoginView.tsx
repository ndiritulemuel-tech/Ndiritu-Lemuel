import React from 'react';
import { useAuth } from '../AuthContext';
import { motion } from 'motion/react';
import { HeartPulse } from 'lucide-react';

export function LoginView() {
  const { signIn, loading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[color:var(--bg-primary)] p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-3xl p-8 card-shadow text-center"
      >
        <div className="w-20 h-20 bg-[color:var(--accent-light)] rounded-full flex items-center justify-center mx-auto mb-6">
          <HeartPulse size={40} className="text-[color:var(--accent)]" />
        </div>
        <h1 className="text-3xl font-serif font-semibold text-gray-900 mb-2">Aura</h1>
        <p className="text-gray-500 mb-8">Your couple's companion.</p>
        
        {loading ? (
          <div className="animate-pulse flex space-x-2 justify-center mb-4">
            <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
            <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
            <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
          </div>
        ) : (
          <button
            onClick={signIn}
            className="w-full bg-[color:var(--text-primary)] text-white py-4 rounded-full font-medium hover:opacity-90 transition-opacity"
          >
            Continue with Google
          </button>
        )}
      </motion.div>
    </div>
  );
}
