import React, { useState, useEffect, useRef } from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { THEMES, getSavedTheme, saveAndApplyUserTheme } from '../lib/theme';

export default function ThemeSelector({ user, role, currentRole }) {
 
  const resolvedRole = currentRole || role;

  const [isOpen, setIsOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState(() => getSavedTheme(user, resolvedRole));
  const dropdownRef = useRef(null);

  useEffect(() => {
    const currentTheme = getSavedTheme(user, resolvedRole);
    setActiveTheme(currentTheme);
    saveAndApplyUserTheme(user, resolvedRole, currentTheme);
  }, [user, resolvedRole]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectTheme = (themeId) => {
    setActiveTheme(themeId);
    saveAndApplyUserTheme(user, resolvedRole, themeId);
    setIsOpen(false);
  };

  const currentThemeObj = THEMES.find(t => t.id === activeTheme) || THEMES[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer border border-gray-200 dark:border-slate-700"
        title="Customize UI Theme"
      >
        <Palette size={15} className="text-gray-500 dark:text-gray-400" />
        <span className="hidden md:inline-block">{currentThemeObj.name}</span>
        <span
          className="h-3 w-3 rounded-full shrink-0 shadow-xs border border-white dark:border-slate-900"
          style={{ backgroundColor: currentThemeObj.primaryColor }}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-800 z-50 p-2 animate-in fade-in zoom-in duration-150">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" /> Theme Palette
            </span>
            <span className="text-[9px] bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-extrabold px-1.5 py-0.5 rounded uppercase">
              {resolvedRole}
            </span>
          </div>

          <div className="py-1 space-y-1 max-h-64 overflow-y-auto">
            {THEMES.map((t) => {
              const isSelected = t.id === activeTheme;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTheme(t.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-bold border border-blue-150 dark:border-slate-700'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-800/60 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-4 w-4 rounded-full border border-gray-300 dark:border-slate-700 shadow-xs shrink-0"
                      style={{ backgroundColor: t.primaryColor }}
                    />
                    <span>{t.name}</span>
                  </div>

                  {isSelected && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
