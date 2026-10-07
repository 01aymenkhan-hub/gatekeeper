'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface Gate {
  id: string;
  name: string;
  type: 'ENTRY' | 'EXIT' | 'BOTH';
  description?: string | null;
  active?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR';
  gates?: Gate[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  theme: 'light' | 'dark';
  currentGate: Gate | null;
  setCurrentGate: (gate: Gate | null) => void;
  toggleTheme: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  theme: 'light',
  currentGate: null,
  setCurrentGate: () => {},
  toggleTheme: () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentGate, setCurrentGateState] = useState<Gate | null>(null);
  const router = useRouter();

  // Load theme (Light mode is the default)
  useEffect(() => {
    const savedTheme = localStorage.getItem('gk_theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'light';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('gk_theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
      return next;
    });
  };

  const setCurrentGate = (gate: Gate | null) => {
    setCurrentGateState(gate);
    if (gate) {
      localStorage.setItem('gk_current_gate', JSON.stringify(gate));
    } else {
      localStorage.removeItem('gk_current_gate');
    }
  };

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);

          // Restore or select gate
          const savedGate = localStorage.getItem('gk_current_gate');
          if (savedGate) {
            try {
              setCurrentGateState(JSON.parse(savedGate));
            } catch {
              // ignore
            }
          } else if (data.user.gates && data.user.gates.length > 0) {
            setCurrentGate(data.user.gates[0]);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      localStorage.removeItem('gk_current_gate');
      router.push('/login');
    } catch (e) {
      console.error('Logout error:', e);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        theme,
        currentGate,
        setCurrentGate,
        toggleTheme,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
