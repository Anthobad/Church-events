import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../services/i18n';
import { Plus, LogOut, ShieldCheck, Globe, ChevronDown, Check } from 'lucide-react';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isAdmin: boolean;
  onOpenAdminSignIn: () => void;
  onAdminSignOut: () => void;
  onOpenCreateEvent: () => void;
}

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
];

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  isAdmin,
  onOpenAdminSignIn,
  onAdminSignOut,
  onOpenCreateEvent
}) => {
  const t = translations[language];
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLangLabel = LANGUAGES.find((l) => l.code === language)?.label || 'العربية';

  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-30 w-full backdrop-blur-md bg-white/85 border-b border-stone-200/80 shadow-xs transition-colors"
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-3 min-w-0">
        {/* Title saying 'Events' depending on language (top start) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          <h1
            id="page-title-events"
            className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 select-none flex items-center gap-1.5 sm:gap-2 truncate"
          >
            <span className="truncate">{t.eventsTitle}</span>
            {isAdmin && (
              <span
                id="admin-status-badge"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 shrink-0"
                title="Admin Mode Active"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">Admin</span>
              </span>
            )}
          </h1>
        </div>

        {/* Action Controls: Language Switcher + Admin Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Language Dropdown Switcher */}
          <div id="language-dropdown-container" ref={langDropdownRef} className="relative shrink-0">
            <button
              id="language-dropdown-btn"
              type="button"
              onClick={() => setIsLangOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={isLangOpen}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-stone-100/90 hover:bg-stone-200/80 border border-stone-200/80 text-xs sm:text-sm font-bold text-stone-800 shadow-2xs transition-all cursor-pointer select-none shrink-0"
            >
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-700 shrink-0" />
              <span>{currentLangLabel}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-stone-500 transition-transform duration-200 shrink-0 ${
                  isLangOpen ? 'rotate-180 text-amber-700' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isLangOpen && (
              <div
                id="language-dropdown-menu"
                className="absolute end-0 mt-1.5 w-36 rounded-2xl bg-white/95 backdrop-blur-md border border-stone-200 shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                {LANGUAGES.map((langItem) => {
                  const isSelected = language === langItem.code;
                  return (
                    <button
                      key={langItem.code}
                      id={`lang-opt-${langItem.code}`}
                      type="button"
                      onClick={() => {
                        onLanguageChange(langItem.code);
                        setIsLangOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-start transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50 text-amber-900 font-bold'
                          : 'text-stone-700 hover:bg-stone-100/80'
                      }`}
                    >
                      <span>{langItem.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-700 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Admin Action: Sign in OR ("+" add event + sign out icon) */}
          {!isAdmin ? (
            <button
              id="admin-signin-btn"
              type="button"
              onClick={onOpenAdminSignIn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span>{t.adminSignIn}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                id="admin-add-event-btn"
                type="button"
                onClick={onOpenCreateEvent}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-amber-700 hover:bg-amber-800 text-white shadow-xs transition-all cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                title={t.addEvent}
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="hidden xs:inline sm:inline">{t.addEvent}</span>
              </button>

              <button
                id="admin-signout-btn"
                type="button"
                onClick={onAdminSignOut}
                className="p-1.5 sm:p-2 rounded-xl text-stone-700 hover:text-red-700 hover:bg-red-50 border border-stone-200 transition-colors cursor-pointer active:scale-95 shrink-0"
                title={t.adminSignOut}
                aria-label={t.adminSignOut}
              >
                <LogOut className="w-4 h-4 shrink-0" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
