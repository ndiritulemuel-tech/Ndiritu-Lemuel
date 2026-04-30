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
        className="w-full max-w-sm bg-white/60 backdrop-blur-md border border-[color:var(--accent-light)] rounded-[2.5rem] p-8 shadow-[0_8px_40px_rgb(0,0,0,0.04)] text-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[color:var(--accent-light)]/40 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
        
        <div className="w-20 h-20 bg-white rounded-[1.5rem] shadow-sm border border-gray-50 flex items-center justify-center mx-auto mb-6 relative z-10">
          <HeartPulse size={36} className="text-[color:var(--accent)]" />
        </div>
        <h1 className="text-4xl font-serif font-semibold text-[color:var(--text-primary)] mb-2 relative z-10">Haven</h1>
        <p className="text-[color:var(--text-secondary)] font-medium mb-10 relative z-10">A soft place to land.</p>
        
        {loading ? (
          <div className="animate-pulse flex space-x-2 justify-center mb-4 relative z-10">
            <div className="w-2 h-2 bg-[color:var(--accent)] rounded-full"></div>
            <div className="w-2 h-2 bg-[color:var(--accent)] rounded-full animation-delay-200"></div>
            <div className="w-2 h-2 bg-[color:var(--accent)] rounded-full animation-delay-400"></div>
          </div>
        ) : (
          <button
            onClick={signIn}
            className="w-full bg-[color:var(--text-primary)] text-white py-4 rounded-[1rem] font-medium hover:bg-[#1a231e] transition-colors relative z-10 shadow-sm"
          >
            Continue with Google
          </button>
        )}
      </motion.div>
    </div>
  );
}
