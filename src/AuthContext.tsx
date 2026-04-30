import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { User, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

export interface UserProfile {
  email: string;
  avatarUrl?: string;
  pseudonym?: string;
  supportFocus?: string;
  identityPref?: string;
  partnerContact: string;
  coachColors: string;
  coachVoice: string;
  blockedUsers?: string[];
  createdAt: any;
  updatedAt: any;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signUpWithEmail: (e: string, p: string) => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  resetPassword: (e: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signUpWithEmail: async () => {},
  signInWithEmail: async () => {},
  resetPassword: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      setUser(currUser);
      if (currUser) {
        // Removed emailVerified check to allow seamless email/password login in demo
        const userDocRef = doc(db, 'users', currUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // Create default profile
            const newProfile: UserProfile = {
              email: currUser.email || '',
              partnerContact: '',
              coachColors: 'default',
              coachVoice: 'female',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            setDoc(userDocRef, newProfile).catch(e => handleFirestoreError(e, OperationType.CREATE, 'users/' + currUser.uid));
          }
          // we have the profile now, stop loading
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'users/' + currUser.uid);
          setLoading(false);
        });
        return () => unsubscribeProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
       console.error("Sign in failed", error);
    }
  };

  const signUpWithEmail = async (e: string, p: string) => {
    try {
      await createUserWithEmailAndPassword(auth, e, p);
    } catch (error) {
      console.error("Sign up failed", error);
      throw error;
    }
  };

  const signInWithEmail = async (e: string, p: string) => {
    try {
      await signInWithEmailAndPassword(auth, e, p);
    } catch (error) {
      console.error("Sign in failed", error);
      throw error;
    }
  };

  const resetPassword = async (e: string) => {
    try {
      await sendPasswordResetEmail(auth, e);
    } catch (error) {
      console.error("Password reset failed", error);
      throw error;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userDocRef, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'users/' + user.uid);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUpWithEmail, signInWithEmail, resetPassword, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
