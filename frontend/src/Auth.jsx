import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Logo from './Logo';
import { AlertCircle, Sun, Moon } from 'lucide-react';

const ALLOWED_DOMAIN = 'bitsathy.ac.in';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Shared Light/Dark theme state (defaults to Light Mode)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('saysphere_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });
  const isLight = theme === 'light';

  useEffect(() => {
    localStorage.setItem('saysphere_theme', theme);
  }, [theme]);

  async function handleGoogleLogin() {
    setErrorMsg('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          hd: ALLOWED_DOMAIN,
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  }

  // Theme tokens
  const pageBg = isLight
    ? 'bg-gradient-to-br from-indigo-50/85 via-slate-50 to-purple-50/65 text-slate-900'
    : 'bg-[#0B0F19] text-slate-100';
  const cardBg = isLight
    ? 'bg-white/95 border-slate-200/90 shadow-2xl shadow-indigo-950/10'
    : 'bg-slate-900/80 border-slate-800/90 shadow-2xl shadow-black/50';
  const headingColor = isLight ? 'text-slate-900' : 'text-white';
  const subtextColor = isLight ? 'text-slate-600' : 'text-slate-400';

  return (
    <div
      className={`min-h-screen w-full relative overflow-hidden transition-colors duration-300 ${pageBg}`}
    >
      <style>{`
        @keyframes saysphereFadeUp {
          0% { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes saysphereOrb {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(18px, -14px) scale(1.06); }
        }
        @keyframes saysphereDotsDrift {
          0% { background-position: 0px 0px; }
          100% { background-position: 24px 24px; }
        }
        .animate-saysphere-up {
          animation: saysphereFadeUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .animate-saysphere-orb {
          animation: saysphereOrb 8s ease-in-out infinite;
        }
        .animate-saysphere-dots {
          animation: saysphereDotsDrift 14s linear infinite;
        }
      `}</style>

      {/* Subtle Animated Dot Pattern */}
      <div
        className="pointer-events-none animate-saysphere-dots absolute inset-0"
        style={{
          backgroundImage: isLight
            ? 'radial-gradient(rgba(79, 70, 229, 0.18) 1.2px, transparent 1.2px)'
            : 'radial-gradient(rgba(129, 140, 248, 0.22) 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
          maskImage:
            'radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 65%, rgba(0,0,0,0.12) 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 65%, rgba(0,0,0,0.12) 100%)',
        }}
      />

      {/* Ambient Glow Orbs */}
      <div
        className={`pointer-events-none animate-saysphere-orb absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full blur-3xl ${
          isLight ? 'bg-indigo-400/20' : 'bg-indigo-600/20'
        }`}
      />
      <div
        className={`pointer-events-none animate-saysphere-orb absolute -bottom-24 -right-24 w-[26rem] h-[26rem] rounded-full blur-3xl ${
          isLight ? 'bg-purple-400/15' : 'bg-purple-600/15'
        }`}
        style={{ animationDelay: '3s' }}
      />

      {/* MAIN VIEWPORT CONTAINER */}
      <div className="relative z-10 max-w-5xl mx-auto min-h-screen px-6 py-6 flex flex-col justify-between">
        {/* TOP BAR: THEME SWITCHER */}
        <header className="flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition duration-200 hover:-translate-y-0.5 cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-2xs'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-800'
            }`}
          >
            {isLight ? <Moon className="w-4 h-4 text-indigo-700" /> : <Sun className="w-4 h-4" />}
            <span>{isLight ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </header>

        {/* CENTERED SIGN-IN CARD */}
        <main className="my-auto flex items-center justify-center py-8">
          <div
            className={`animate-saysphere-up w-full max-w-md border rounded-3xl p-8 sm:p-10 text-center space-y-6 backdrop-blur-md transition-all duration-300 ${cardBg}`}
          >
            {/* Brand Logo & Title */}
            <div className="flex flex-col items-center space-y-3">
              <div
                className={`w-20 h-20 rounded-2xl border flex items-center justify-center ${
                  isLight
                    ? 'bg-indigo-50/70 border-indigo-200 shadow-md shadow-indigo-600/10'
                    : 'bg-indigo-500/15 border-indigo-400/35 shadow-lg shadow-indigo-950/60'
                }`}
              >
                <Logo className="w-14 h-14" />
              </div>

              <div>
                <h1 className={`text-3xl font-extrabold tracking-tight ${headingColor}`}>
                  SaySphere
                </h1>
                <p
                  className={`text-[11px] font-bold uppercase tracking-widest mt-1 ${
                    isLight ? 'text-indigo-700' : 'text-indigo-400'
                  }`}
                >
                  LIVE CLASSROOM POLLS
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className={`border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`} />

            {/* Sign-In Prompt */}
            <div className="space-y-1">
              <h2 className={`text-xl font-bold tracking-tight ${headingColor}`}>Sign In</h2>
              <p className={`text-xs sm:text-sm ${subtextColor}`}>
                Use your <span className="font-semibold">@{ALLOWED_DOMAIN}</span> Google account
                (Faculty &amp; Students).
              </p>
            </div>

            {/* Error Alert */}
            {errorMsg && (
              <div className="flex items-start gap-2 text-left bg-red-500/10 border border-red-500/30 text-red-600 rounded-xl p-3 text-xs font-medium leading-snug">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-3 disabled:opacity-50 font-semibold text-sm py-3.5 px-5 rounded-xl border transition duration-200 hover:-translate-y-0.5 shadow-lg cursor-pointer ${
                isLight
                  ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900 shadow-slate-900/15'
                  : 'bg-white hover:bg-slate-100 text-slate-900 border-white shadow-black/20'
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.54-1.14 2.85-2.4 3.72v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.02z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>{loading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
            </button>
          </div>
        </main>

        {/* FOOTER */}
        <footer className={`text-center text-xs sm:text-sm font-semibold shrink-0 ${subtextColor}`}>
          @{ALLOWED_DOMAIN} faculty &amp; student access
        </footer>
      </div>
    </div>
  );
}