'use client';

import React, { useRef } from 'react';
import { Calendar, X } from 'lucide-react';

interface DateFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  title?: string;
  id?: string;
  min?: string;
  max?: string;
  label?: string;
}

export default function DateFilterInput({
  value,
  onChange,
  placeholder = 'Select date',
  className = '',
  title = 'Filter by date',
  id,
  min,
  max,
  label,
}: DateFilterInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleContainerClick = () => {
    if (inputRef.current) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          inputRef.current.showPicker();
        } catch {
          inputRef.current.focus();
        }
      } else {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </label>
      )}
      <div
        onClick={handleContainerClick}
        className={`group relative flex items-center w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 shadow-2xs transition-all cursor-pointer ${className}`}
        title={title}
      >
        {/* Left Calendar Icon - Styled to match Gatekeeper inputs */}
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors flex items-center justify-center">
          <Calendar className="w-3.5 h-3.5" />
        </div>

        {/* Modern Date Input */}
        <input
          ref={inputRef}
          id={id}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          className="w-full pl-8.5 pr-7 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 bg-transparent rounded-xl focus:outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
        />

        {/* Clear Date Button (visible only when date is set) */}
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Clear date filter"
            aria-label="Clear date filter"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
