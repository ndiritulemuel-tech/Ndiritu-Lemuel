import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { motion } from 'motion/react';
import { HeartPulse } from 'lucide-react';

export function LoginView() {
  const { signIn, signInWithEmail, signUpWithEmail, resetPassword, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem('haven_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      if (isResetting) {
        await resetPassword(email);
        setSuccessMsg('Password reset email sent! Check your inbox.');
        setIsResetting(false);
        return;
      }
      
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }

      if (rememberMe) {
        localStorage.setItem('haven_remembered_email', email);
      } else {
        localStorage.removeItem('haven_remembered_email');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[color:var(--bg-primary)] p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white/60 backdrop-blur-md border border-white/50 rounded-[2.5rem] p-8 shadow-[0_8px_40px_rgb(0,0,0,0.04)] text-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[color:var(--accent-light)]/40 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
        
        <div className="w-20 h-20 bg-white rounded-[1.5rem] shadow-sm border border-gray-50 flex items-center justify-center mx-auto mb-6 relative z-10">
          <HeartPulse size={36} className="text-[color:var(--accent)]" />
        </div>
        <h1 className="text-4xl font-serif font-semibold text-[color:var(--text-primary)] mb-2 relative z-10">Haven</h1>
        <p className="text-[color:var(--text-secondary)] font-medium mb-8 relative z-10">A soft place to land.</p>
        
        {loading ? (
          <div className="animate-pulse flex space-x-2 justify-center mb-4 relative z-10">
            <div className="w-2 h-2 bg-[color:var(--accent)] rounded-full"></div>
            <div className="w-2 h-2 bg-[color:var(--accent)] rounded-full animation-delay-200"></div>
            <div className="w-2 h-2 bg-[color:var(--accent)] rounded-full animation-delay-400"></div>
          </div>
        ) : (
          <div className="relative z-10">
            <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
              {errorMsg && (
                <div className="text-[color:var(--distress)] text-sm font-medium bg-[color:var(--distress)]/10 p-3 rounded-xl">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="text-[color:var(--accent)] text-sm font-medium bg-[color:var(--accent)]/10 p-3 rounded-xl">
                  {successMsg}
                </div>
              )}
              <input 
                type="email" 
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full p-4 rounded-2xl bg-white border border-gray-100 outline-none focus:border-[color:var(--accent)] transition-colors text-sm"
              />
              {!isResetting && (
                <input 
                  type="password" 
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full p-4 rounded-2xl bg-white border border-gray-100 outline-none focus:border-[color:var(--accent)] transition-colors text-sm"
                />
              )}
              
              {!isResetting && (
                <div className="flex items-center justify-between text-sm px-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[color:var(--text-secondary)]">
                    <input 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="rounded text-[color:var(--accent)] focus:ring-[color:var(--accent)]"
                    />
                    Remember me
                  </label>
                  {!isSignUp && (
                    <button 
                      type="button" 
                      onClick={() => { setIsResetting(true); setErrorMsg(''); setSuccessMsg(''); }}
                      className="font-medium text-[color:var(--accent)] hover:text-[color:var(--text-primary)] transition-colors"
                      aria-label="Forgot password"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[color:var(--text-primary)] text-white py-4 rounded-2xl font-medium hover:bg-[#1a231e] transition-colors shadow-sm"
              >
                {isResetting ? 'Send Reset Link' : (isSignUp ? 'Create Account' : 'Sign In')}
              </button>
            </form>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-xs text-[color:var(--text-secondary)] font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            <button
              onClick={signIn}
              type="button"
              className="w-full bg-white text-[color:var(--text-primary)] border border-gray-200 py-3.5 rounded-2xl font-medium hover:bg-gray-50 transition-colors shadow-sm mb-4"
            >
              Continue with Google
            </button>
            
            <button
              type="button"
              onClick={() => {
                if (isResetting) {
                  setIsResetting(false);
                } else {
                  setIsSignUp(!isSignUp);
                }
              }}
              className="text-sm font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
            >
              {isResetting ? 'Back to sign in' : (isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up")}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
