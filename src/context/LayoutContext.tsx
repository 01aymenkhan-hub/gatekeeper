'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface LayoutContextType {
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  isDesktopCollapsed: boolean;
  setIsDesktopCollapsed: (collapsed: boolean) => void;
  toggleDesktopSidebar: () => void;
}

const LayoutContext = createContext<LayoutContextType>({
  isMobileSidebarOpen: false,
  setIsMobileSidebarOpen: () => {},
  toggleMobileSidebar: () => {},
  closeMobileSidebar: () => {},
  isDesktopCollapsed: false,
  setIsDesktopCollapsed: () => {},
  toggleDesktopSidebar: () => {},
});

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem('gk_sidebar_collapsed');
      if (savedCollapsed !== null) {
        setIsDesktopCollapsed(savedCollapsed === 'true');
      } else if (typeof window !== 'undefined' && window.innerWidth < 1280) {
        // Default to collapsed (icon-only mode) on tablet and 1024px screens so content gets full width
        setIsDesktopCollapsed(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  const toggleDesktopSidebar = () => {
    setIsDesktopCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('gk_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <LayoutContext.Provider
      value={{
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        toggleMobileSidebar,
        closeMobileSidebar,
        isDesktopCollapsed,
        setIsDesktopCollapsed,
        toggleDesktopSidebar,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
