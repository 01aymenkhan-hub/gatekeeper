'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth, Gate } from '@/context/AuthContext';
import { useLayout } from '@/context/LayoutContext';
import {
  DoorClosed,
  Clock,
  UserPlus,
  Briefcase,
  Search,
  ChevronDown,
  Building,
  Menu,
  Sun,
  Moon,
  Check,
} from 'lucide-react';

interface HeaderProps {
  onOpenCheckIn?: (category?: string) => void;
  onOpenCheckOut?: () => void;
  onOpenCheckStatus?: () => void;
}

export default function Header({
  onOpenCheckIn,
  onOpenCheckOut,
  onOpenCheckStatus,
}: HeaderProps) {
  const { currentGate, setCurrentGate, theme, toggleTheme } = useAuth();
  const { toggleMobileSidebar } = useLayout();
  const [gates, setGates] = useState<Gate[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isGateOpen, setIsGateOpen] = useState(false);
  const gateDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (gateDropdownRef.current && !gateDropdownRef.current.contains(event.target as Node)) {
        setIsGateOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsGateOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadGates = async () => {
      try {
        const res = await fetch('/api/gates');
        if (res.ok) {
          const data = await res.json();
          if (data.gates) {
            setGates(data.gates);
            if (!currentGate && data.gates.length > 0) {
              setCurrentGate(data.gates[0]);
            }
          }
        }
      } catch (e) {
        console.error('Error loading gates in header:', e);
      }
    };
    loadGates();
  }, []);

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0c121e]/90 backdrop-blur-md px-3 sm:px-4 md:px-5 lg:px-6 flex items-center justify-between gap-2 sm:gap-3 md:gap-4 sticky top-0 z-30 no-print transition-colors">
      {/* Left: Mobile Menu Toggle + Gate Selector + Clock */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3.5 min-w-0">
        {/* Mobile Hamburger Menu Toggle Button */}
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
          title="Open menu"
          aria-label="Open navigation menu"
        >
          <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Active Gate Selector Dropdown */}
        <div ref={gateDropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setIsGateOpen(!isGateOpen)}
            className="flex items-center gap-1.5 sm:gap-2.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all text-left cursor-pointer group"
            aria-expanded={isGateOpen}
            aria-haspopup="listbox"
          >
            <div className="p-1 rounded-lg bg-blue-100/70 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 shrink-0">
              <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>

            {/* Desktop label & full name */}
            <div className="hidden sm:block min-w-0 pr-1">
              <div className="flex items-center gap-1.5 leading-none mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                  Active Gate
                </span>
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[110px] sm:max-w-[130px] md:max-w-[150px] lg:max-w-[130px] xl:max-w-[200px]">
                {currentGate?.name || 'Select Gate'}
              </div>
            </div>

            {/* Mobile compact label */}
            <div className="sm:hidden flex items-center gap-1 pr-0.5">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[80px]">
                {currentGate?.name?.split(' ')[0] || 'Gate'}
              </span>
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 shrink-0 ${
                isGateOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
              }`}
            />
          </button>

          {/* Dropdown Floating Panel */}
          {isGateOpen && (
            <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Switch Active Gate
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Select the gate terminal for entries &amp; exits
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {gates.length} Gates
                </span>
              </div>

              <div className="p-1.5 max-h-64 overflow-y-auto space-y-1">
                {gates.map((gate) => {
                  const isSelected = currentGate?.id === gate.id;
                  return (
                    <button
                      key={gate.id}
                      type="button"
                      onClick={() => {
                        setCurrentGate(gate);
                        setIsGateOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-950'
                              : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        />
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-bold truncate ${
                              isSelected
                                ? 'text-blue-700 dark:text-blue-300'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {gate.name}
                          </p>
                          {gate.description && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {gate.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            gate.type === 'ENTRY'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : gate.type === 'EXIT'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                          }`}
                        >
                          {gate.type}
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Premium Live Date & Time Display (Visible on Tablet & Desktop, hidden on Mobile to prevent collisions) */}
        <div className="hidden md:flex items-center gap-2 sm:gap-2.5 px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shadow-2xs shrink-0 transition-colors">
          <div className="p-1 rounded-lg bg-blue-100/70 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 shrink-0">
            <Clock className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </div>

          <div className="flex flex-col min-w-0 pr-0.5 sm:pr-1">
            {/* TIME: 12-hour format, strong visual weight, focal point */}
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-xs lg:text-sm font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                {currentTime || '--:--'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Live Clock" />
            </div>

            {/* DATE: Secondary, clear and readable on wide desktop, hidden on compact tablet to prevent crowding */}
            <span className="hidden xl:block text-[10px] lg:text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-none mt-1 truncate">
              {currentDate}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Quick Action Buttons & Theme Toggle */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Quick Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          )}
          <span className="hidden xl:inline text-[11px] capitalize">{theme}</span>
        </button>

        {/* Check Status Button */}
        <button
          onClick={onOpenCheckStatus}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
          title="Search visitor status"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Status</span>
        </button>

        {/* Check Out Button */}
        <button
          onClick={onOpenCheckOut}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
          title="Check out visitor"
        >
          <DoorClosed className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="hidden sm:inline">Exit</span>
        </button>

        {/* Add Vendor (Desktop only) */}
        <button
          onClick={() => onOpenCheckIn && onOpenCheckIn('VENDOR')}
          className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
        >
          <Briefcase className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>+ Vendor</span>
        </button>

        {/* Add Visitor (Primary Action) */}
        <button
          onClick={() => onOpenCheckIn && onOpenCheckIn('VISITOR')}
          className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">+ Visitor</span>
          <span className="inline sm:hidden">+ Add</span>
        </button>
      </div>
    </header>
  );
}
