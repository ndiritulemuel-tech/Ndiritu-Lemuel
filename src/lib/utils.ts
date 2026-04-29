import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPreferredVoice(preference: string): SpeechSynthesisVoice | null {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  
  if (voices.length === 0) return null;

  // Good english voices
  const enVoices = voices.filter(v => v.lang.startsWith('en'));
  const searchList = enVoices.length > 0 ? enVoices : voices;

  if (preference === 'female') {
    return searchList.find(v => 
      v.name.includes('Google US English') ||
      v.name.includes('Google UK English Female') ||
      v.name.toLowerCase().includes('samantha') || 
      v.name.toLowerCase().includes('victoria') ||
      v.name.toLowerCase().includes('karen') ||
      v.name.toLowerCase().includes('zira') ||
      v.name.toLowerCase().includes('moira') ||
      v.name.toLowerCase().includes('female')
    ) || searchList[0];
  }
  
  if (preference === 'male') {
    return searchList.find(v => 
      v.name.includes('Google UK English Male') ||
      v.name.toLowerCase().includes('alex') || 
      v.name.toLowerCase().includes('david') ||
      v.name.toLowerCase().includes('daniel') ||
      v.name.toLowerCase().includes('aaron') ||
      v.name.toLowerCase().includes('male')
    ) || searchList[0];
  }

  return searchList.find(v => v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('premium')) || searchList[0];
}
