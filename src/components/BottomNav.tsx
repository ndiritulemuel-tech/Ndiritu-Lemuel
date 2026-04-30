import React from 'react';
import { Home, BookHeart, MessageCircle, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface BottomNavProps {
  currentTab: string;
  setTab: (tab: string) => void;
}

export function BottomNav({ currentTab, setTab }: BottomNavProps) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'journal', icon: BookHeart, label: 'Journal' },
    { id: 'chat', icon: MessageCircle, label: 'Connect' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-auto md:w-[480px] md:translate-x-[-50%] md:left-[50%] glass-nav bg-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-[2rem] border border-white/40">
      <div className="flex items-center justify-around px-2 py-3">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className="relative flex flex-col items-center justify-center w-16 h-12"
            >
              <div className={cn(
                "p-1.5 transition-colors z-10",
                isActive ? "text-[color:var(--accent)]" : "text-gray-400"
              )}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-colors z-10",
                isActive ? "text-[color:var(--accent)]" : "text-gray-400"
              )}>
                {tab.label}
              </span>
              
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute inset-0 bg-[color:var(--accent)]/10 rounded-[1.25rem] -z-0"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
