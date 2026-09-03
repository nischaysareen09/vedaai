'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

const STORAGE_KEY = 'vedaai:sidebar-collapsed';

function loadCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function persistCollapsed(value: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // Ignore write failures (private browsing, quota, etc.)
  }
}

interface SidebarContextValue {
  isCollapsed: boolean;
  /** false until we've checked localStorage on mount (avoids a layout flash) */
  isReady: boolean;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsCollapsed(loadCollapsed());
    setIsReady(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      persistCollapsed(next);
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ isCollapsed, isReady, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}

// Shared width constants so the sidebar and every page's content margin
// always agree — change these here, not as magic numbers elsewhere.
export const SIDEBAR_WIDTH_EXPANDED = 256; // px — matches Tailwind's w-64
export const SIDEBAR_WIDTH_COLLAPSED = 80; // px — matches Tailwind's w-20