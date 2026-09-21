import React, { useState } from 'react';
import { Language } from '../types';
import { translations } from '../services/i18n';
import { supabase } from '../services/storage';
import { ShieldCheck, Lock, User, X, AlertCircle, Loader2 } from 'lucide-react';

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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    if (!supabase) {
      setIsLoading(false);
      setErrorMessage(
        language === 'ar'
          ? 'تعذر الاتصال بـ Supabase. يرجى التحقق من إعدادات الربط.'
          : language === 'fr'
          ? 'Connexion Supabase introuvable. Vérifiez les paramètres.'
          : 'Supabase connection is not available. Please verify credentials.'
      );
      return;
    }

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setIsLoading(false);
      setErrorMessage(t.adminLoginError);
      return;
    }

    let resolvedEmail: string | null = null;

    try {
      // 1. Look up user in profiles table by username (case-insensitive)
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, username')
        .ilike('username', trimmedUser)
        .maybeSingle();

      if (profile?.email) {
        resolvedEmail = profile.email;
      }
    } catch (err) {
      console.warn('Profile username lookup notice:', err);
    }

    // Build candidates list: resolved profile email, or direct input
    const candidates: string[] = resolvedEmail
      ? [resolvedEmail]
      : trimmedUser.includes('@')
      ? [trimmedUser]
      : [
          `${trimmedUser.toLowerCase()}@church.org`,
          trimmedUser
        ];

    let signedIn = false;
    let authErrorDetail: string | null = null;

    try {
      for (const emailCandidate of candidates) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailCandidate,
          password: password
        });

        if (!error && data?.session?.user) {
          signedIn = true;
          break;
        } else if (error) {
          authErrorDetail = error.message;
        }
      }

      if (signedIn) {
        setIsLoading(false);
        onSuccess();
        onClose();
      } else {
        setIsLoading(false);
        const detailLower = (authErrorDetail || '').toLowerCase();
        if (detailLower.includes('email logins are disabled')) {
          setErrorMessage(
            language === 'ar'
              ? 'تسجيل الدخول عبر البريد الإلكتروني معطل في إعدادات Supabase (Authentication ➔ Providers ➔ Email).'
              : language === 'fr'
              ? 'La connexion par email est désactivée dans Supabase (Authentication ➔ Providers ➔ Email).'
              : 'Email logins are disabled in your Supabase project (Authentication ➔ Providers ➔ Email).'
          );
        } else if (detailLower.includes('email not confirmed')) {
          setErrorMessage(
            language === 'ar'
              ? 'حساب المشرف غير مفعل أو يتطلب تأكيد البريد في Supabase.'
              : language === 'fr'
              ? 'Compte administrateur en attente d’activation ou de confirmation dans Supabase.'
              : 'Admin account requires email confirmation in Supabase.'
          );
        } else {
          setErrorMessage(authErrorDetail ? `${t.adminLoginError} (${authErrorDetail})` : t.adminLoginError);
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || t.adminLoginError);
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
          disabled={isLoading}
          className="absolute top-4 end-4 p-2 text-stone-400 hover:text-stone-700 rounded-full transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          aria-label={t.cancelBtn}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shrink-0 shadow-2xs">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <div className="text-center">
          <h3 className="text-lg font-extrabold text-slate-900">
            {t.adminLoginTitle}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {language === 'fr'
              ? 'Accès sécurisé Supabase réservé aux administrateurs'
              : language === 'en'
              ? 'Secure Supabase access reserved for church administrators'
              : 'تسجيل دخول آمن عبر Supabase مخصص لمشرفي الكنيسة فقط'}
          </p>
        </div>

        {errorMessage && (
          <div
            id="admin-login-error-alert"
            className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>{t.adminUsername}</span>
            </label>
            <input
              id="admin-username-input"
              type="text"
              autoFocus
              required
              disabled={isLoading}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="admin"
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-medium text-stone-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-600 disabled:bg-stone-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>{t.adminPassword}</span>
            </label>
            <input
              id="admin-password-input"
              type="password"
              required
              disabled={isLoading}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-medium text-stone-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-600 disabled:bg-stone-100"
            />
          </div>

          <button
            id="admin-login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 transition-colors shadow-xs cursor-pointer shrink-0 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>
                  {language === 'fr'
                    ? 'Vérification...'
                    : language === 'en'
                    ? 'Authenticating...'
                    : 'جاري التحقق...'}
                </span>
              </>
            ) : (
              <span>{t.loginBtn}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
