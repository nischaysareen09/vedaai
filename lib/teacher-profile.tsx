'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

export interface TeacherProfile {
  teacherName: string;
  schoolName: string;
  schoolArea?: string;
}

const STORAGE_KEY = 'vedaai:teacher-profile';

function loadProfile(): TeacherProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistProfile(profile: TeacherProfile) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

interface TeacherProfileContextValue {
  profile: TeacherProfile | null;
  /** false until we've checked localStorage on mount (avoids a flash of the setup modal) */
  isReady: boolean;
  isEditing: boolean;
  openEditor: () => void;
  closeEditor: () => void;
  saveProfile: (profile: TeacherProfile) => void;
}

const TeacherProfileContext = createContext<TeacherProfileContextValue | null>(null);

export function TeacherProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const existing = loadProfile();
    setProfile(existing);
    setIsReady(true);
    // First-ever visit: pop the setup form automatically.
    if (!existing) setIsEditing(true);
  }, []);

  const openEditor = useCallback(() => setIsEditing(true), []);
  const closeEditor = useCallback(() => setIsEditing(false), []);

  const saveProfileAndClose = useCallback((next: TeacherProfile) => {
    persistProfile(next);
    setProfile(next);
    setIsEditing(false);
  }, []);

  return (
    <TeacherProfileContext.Provider
      value={{ profile, isReady, isEditing, openEditor, closeEditor, saveProfile: saveProfileAndClose }}
    >
      {children}
    </TeacherProfileContext.Provider>
  );
}

export function useTeacherProfile() {
  const ctx = useContext(TeacherProfileContext);
  if (!ctx) throw new Error('useTeacherProfile must be used within TeacherProfileProvider');
  return ctx;
}