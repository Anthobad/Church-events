import React, { useState } from 'react';
import { Language } from '../types';
import { translations } from '../services/i18n';
import { ShieldCheck, Lock, X, KeyRound, AlertCircle } from 'lucide-react';

interface AdminSignInModalProps {
  language: Language;
  onSuccess: () => void;
  onClose: () => void;
}

export const AdminSignInModal: React.FC<AdminSignInModalProps> = ({
  language,
  onSuccess,
  onClose
}) => {
  const t = translations[language];
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default church demo admin passwords: admin or church2025
    if (password === 'admin' || password === 'church2025' || password === '1234') {
      setError(false);
      onSuccess();
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <div
      id="admin-signin-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="admin-signin-card"
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200 p-6 space-y-5"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 end-4 p-2 text-stone-400 hover:text-stone-700 rounded-full transition-colors cursor-pointer shrink-0"
          aria-label={t.cancelBtn}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <div className="text-center">
          <h3 className="text-lg font-extrabold text-slate-900">
            {t.adminLoginTitle}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {language === 'fr'
              ? 'Accès administrateur pour gérer les événements et réservations'
              : language === 'en'
              ? 'Admin access to manage church events and reservations'
              : 'تسجيل دخول المشرفين لإدارة المناسبات وحجوزات الرعية'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{t.adminLoginError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>{t.adminPassword}</span>
            </label>
            <input
              type="password"
              autoFocus
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-medium text-stone-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-600"
            />
          </div>

          <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-normal flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              {language === 'fr' ? 'Mot de passe démo : ' : language === 'en' ? 'Demo password: ' : 'كلمة المرور التجريبية: '}
              <strong>admin</strong> {language === 'fr' ? 'ou' : language === 'en' ? 'or' : 'أو'} <strong>church2025</strong>
            </span>
          </div>

          <button
            id="admin-login-submit-btn"
            type="submit"
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            {t.loginBtn}
          </button>
        </form>
      </div>
    </div>
  );
};
