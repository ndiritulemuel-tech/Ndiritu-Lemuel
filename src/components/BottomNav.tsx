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
    <div className="fixed bottom-0 left-0 right-0 glass-nav pb-safe bg-white/80">
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
                  className="absolute inset-0 bg-[color:var(--accent-light)] opacity-40 rounded-2xl -z-0"
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
