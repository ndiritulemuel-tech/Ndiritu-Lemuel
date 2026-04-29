import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Settings, Shield, LogOut, Phone, Palette, UserCircle, Check } from 'lucide-react';
import { motion } from 'motion/react';

export function ProfileView() {
  const { user, profile, signOut, updateProfile } = useAuth();
  
  const [partnerContact, setPartnerContact] = useState(profile?.partnerContact || '');
  const [coachVoice, setCoachVoice] = useState(profile?.coachVoice && profile.coachVoice !== 'neutral' ? profile.coachVoice : 'female');
  const [coachColors, setCoachColors] = useState(profile?.coachColors || 'default');
  
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await updateProfile({
      partnerContact,
      coachVoice,
      coachColors
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="pb-24 px-4 sm:px-6 md:max-w-xl md:mx-auto pt-6 min-h-screen">
      <h1 className="text-3xl font-serif font-semibold text-[color:var(--text-primary)] mb-8">
        Profile
      </h1>
      
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 bg-[color:var(--accent-light)] rounded-full flex items-center justify-center text-3xl text-[color:var(--accent)] mb-4 font-bold shadow-sm">
          {user?.displayName ? user.displayName.charAt(0) : 'U'}
        </div>
        <h2 className="font-serif text-xl font-semibold">{user?.displayName || 'User'}</h2>
        <p className="text-sm text-gray-500">{user?.email}</p>
      </div>
      
      <div className="space-y-6">
        
        {/* Settings Section */}
        <section className="bg-white p-6 rounded-3xl card-shadow">
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 text-gray-800">
            <Settings size={20} className="text-[color:var(--accent)]"/>
            Aura Coach Preferences
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <UserCircle size={16}/> Voice Preference
              </label>
              <select 
                value={coachVoice}
                onChange={(e) => setCoachVoice(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
          </div>
        </section>

        {/* Emergency Section */}
        <section className="bg-white p-6 rounded-3xl card-shadow">
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 text-gray-800">
            <Shield size={20} className="text-[color:var(--distress)]"/>
            Emergency Contact
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Phone size={16}/> Partner's Number
            </label>
            <input 
              type="tel"
              value={partnerContact}
              onChange={(e) => setPartnerContact(e.target.value)}
              placeholder="e.g. +254 700 000000"
              className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[color:var(--distress)]"
            />
            <p className="text-xs text-gray-500 mt-2">
              This number is called instantly when selecting "Call Partner" from the SOS menu.
            </p>
          </div>
        </section>

        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 bg-[color:var(--text-primary)] text-white p-4 rounded-2xl font-semibold transition-colors disabled:opacity-75"
        >
          {saved ? <><Check size={20}/> Saved</> : 'Save Preferences'}
        </motion.button>
        
        <button 
          onClick={signOut}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-red-50 text-red-600 p-4 rounded-2xl font-semibold hover:bg-red-100 transition-colors"
        >
          <LogOut size={20} /> Sign Out
        </button>

      </div>
    </div>
  );
}
