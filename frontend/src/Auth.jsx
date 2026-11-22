import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Logo from './Logo';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';

const ALLOWED_DOMAIN = 'bitsathy.ac.in';

export default function Auth() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Shared Light/Dark theme state (defaults to Light Mode)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('saysphere_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });
  const isLight = theme === 'light';

  useEffect(() => {
    localStorage.setItem('saysphere_theme', theme);
  }, [theme]);

  const isValidCollegeEmail = (value) => {
    const clean = value.trim().toLowerCase();
    return clean.endsWith(`@${ALLOWED_DOMAIN}`) && clean.indexOf('@') > 0;
  };

  async function handleGoogleLogin() {
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (mode === 'signup' && !cleanName) {
      setErrorMsg('Please enter your name for your faculty dashboard.');
      return;
    }

    if (!isValidCollegeEmail(cleanEmail)) {
      setErrorMsg(`Please use your official @${ALLOWED_DOMAIN} college email address.`);
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: cleanName,
            full_name: cleanName,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data?.session) {
        setInfoMsg('Account created! Redirecting to your dashboard...');
      } else {
        setInfoMsg(
          'Account created! Confirm your @bitsathy.ac.in email if required, then sign in.'
        );
      }
    }

    setLoading(false);
  }

  // Theme tokens
  const pageBg = isLight
    ? 'bg-gradient-to-br from-indigo-50/85 via-slate-50 to-purple-50/65 text-slate-900'
    : 'bg-[#0B0F19] text-slate-100';
  const cardBg = isLight
    ? 'bg-white/95 border-slate-200/90 shadow-xl shadow-indigo-950/5'
    : 'bg-slate-900/80 border-slate-800/90 shadow-2xl';
  const pillBg = isLight
    ? 'bg-white/90 border-slate-200/90 text-slate-800 hover:border-indigo-300'
    : 'bg-slate-900/75 border-slate-800/90 text-slate-200 hover:border-indigo-500/40';
  const inputBg = isLight
    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
    : 'bg-[#0B0F19] border-slate-800 text-white placeholder-slate-500';
  const headingColor = isLight ? 'text-slate-900' : 'text-white';
  const subtextColor = isLight ? 'text-slate-600' : 'text-slate-400';

  return (
    <div
      className={`min-h-screen lg:h-screen lg:overflow-hidden w-full relative transition-colors duration-300 ${pageBg}`}
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
        @keyframes saysphereGradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
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
        .animate-saysphere-gradient-text {
          background-size: 220% 220%;
          animation: saysphereGradientFlow 6s ease infinite;
        }
        .animate-saysphere-gradient-aura {
          background-size: 200% 200%;
          animation: saysphereGradientFlow 9s ease-in-out infinite;
        }
      `}</style>

      {/* Balanced Animated Dot Pattern */}
      <div
        className="pointer-events-none animate-saysphere-dots absolute inset-0"
        style={{
          backgroundImage: isLight
            ? 'radial-gradient(rgba(79, 70, 229, 0.20) 1.2px, transparent 1.2px)'
            : 'radial-gradient(rgba(129, 140, 248, 0.24) 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
          maskImage:
            'radial-gradient(ellipse at 42% 48%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.68) 72%, rgba(0,0,0,0.18) 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at 42% 48%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.68) 72%, rgba(0,0,0,0.18) 100%)',
        }}
      />

      {/* Animated Ambient Glow Orbs */}
      <div
        className={`pointer-events-none animate-saysphere-orb absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full blur-3xl ${
          isLight ? 'bg-indigo-400/20' : 'bg-indigo-600/20'
        }`}
      />
      <div
        className={`pointer-events-none animate-saysphere-orb absolute -bottom-24 right-1/4 w-[24rem] h-[24rem] rounded-full blur-3xl ${
          isLight ? 'bg-purple-400/15' : 'bg-purple-600/15'
        }`}
        style={{ animationDelay: '3s' }}
      />

      {/* SINGLE-PAGE VIEWPORT CONTAINER */}
      <div className="relative z-10 max-w-7xl mx-auto h-full px-6 sm:px-10 py-5 lg:py-6 flex flex-col justify-between">
        {/* TOP BAR: STATIC LOGO + THEME SWITCHER */}
        <header className="animate-saysphere-up flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div
              className={`w-20 h-20 rounded-2xl border flex items-center justify-center shrink-0 ${
                isLight
                  ? 'bg-white border-indigo-200 shadow-lg shadow-indigo-600/10'
                  : 'bg-indigo-500/15 border-indigo-400/35 shadow-xl shadow-indigo-950/60'
              }`}
            >
              <Logo className="w-14 h-14" />
            </div>
            <div>
              <h1
                className={`text-3xl sm:text-4xl font-extrabold tracking-tight leading-none ${headingColor}`}
              >
                SaySphere
              </h1>
              <p
                className={`text-xs font-bold uppercase tracking-widest mt-1.5 ${
                  isLight ? 'text-indigo-700' : 'text-indigo-400'
                }`}
              >
                LIVE CLASSROOM POLLS
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition duration-200 hover:-translate-y-0.5 cursor-pointer shrink-0 ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-2xs'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-800'
            }`}
          >
            {isLight ? <Moon className="w-4 h-4 text-indigo-700" /> : <Sun className="w-4 h-4" />}
            <span>{isLight ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </header>

        {/* CENTER CONTENT */}
        <main className="my-auto py-4 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* LEFT SHOWCASE */}
          <div
            className="animate-saysphere-up relative lg:col-span-7 space-y-4 rounded-3xl p-5 sm:p-7 overflow-hidden"
            style={{ animationDelay: '0.08s' }}
          >
            <div
              className={`pointer-events-none animate-saysphere-gradient-aura absolute inset-0 rounded-3xl opacity-80 ${
                isLight
                  ? 'bg-gradient-to-r from-indigo-200/45 via-purple-200/40 to-sky-200/35'
                  : 'bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-fuchsia-600/15'
              }`}
            />

            <div className="relative z-10 space-y-4">
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold border ${
                  isLight
                    ? 'bg-indigo-100/90 border-indigo-200 text-indigo-800'
                    : 'bg-indigo-500/15 border-indigo-400/25 text-indigo-300'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Classroom Polling</span>
              </div>

              <h2
                className={`text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] ${headingColor}`}
              >
                Live classroom polls,{' '}
                <span className="animate-saysphere-gradient-text bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  made simple.
                </span>
              </h2>

              <p className={`text-base max-w-lg leading-relaxed font-medium ${subtextColor}`}>
                Share a QR code in class and collect honest, anonymous student responses in seconds.
              </p>

              <div className="flex flex-wrap gap-3 pt-1">
                <div
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold backdrop-blur-xs transition duration-200 hover:-translate-y-0.5 ${pillBg}`}
                >
                  <QrCode className="w-4 h-4 text-indigo-600" />
                  <span>Instant QR & Link</span>
                </div>
                <div
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold backdrop-blur-xs transition duration-200 hover:-translate-y-0.5 ${pillBg}`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>100% Anonymous</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SIGN-IN / SIGN-UP CARD */}
          <div
            className="animate-saysphere-up lg:col-span-5 flex justify-center lg:justify-end"
            style={{ animationDelay: '0.16s' }}
          >
            <div
              className={`w-full max-w-md border rounded-3xl p-6 sm:p-7 space-y-4 transition-all duration-300 ${cardBg}`}
            >
              <div>
                <h2 className={`text-2xl font-bold tracking-tight ${headingColor}`}>
                  {mode === 'login' ? 'Faculty Sign In' : 'Create Faculty Account'}
                </h2>
                <p className={`text-xs sm:text-sm mt-1 ${subtextColor}`}>
                  {mode === 'login'
                    ? 'Sign in to manage your polls and view results.'
                    : `Sign up with your @${ALLOWED_DOMAIN} email.`}
                </p>
              </div>

              {/* Google Sign-In */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className={`w-full flex items-center justify-center gap-3 disabled:opacity-50 font-semibold text-sm py-2.5 px-4 rounded-xl border transition duration-200 hover:-translate-y-0.5 cursor-pointer ${
                  isLight
                    ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                    : 'bg-white hover:bg-slate-100 text-slate-900 border-white'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <span>Continue with Google</span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center">
                <div
                  className={`flex-grow border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}
                />
                <span
                  className={`mx-3 text-[11px] font-bold uppercase tracking-wider ${subtextColor}`}
                >
                  Or email
                </span>
                <div
                  className={`flex-grow border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}
                />
              </div>

              {/* Mode Toggle */}
              <div
                className={`grid grid-cols-2 gap-1.5 p-1 rounded-xl border ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0B0F19] border-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                    setInfoMsg('');
                  }}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    mode === 'login'
                      ? 'bg-indigo-600 text-white shadow'
                      : isLight
                      ? 'text-slate-700 hover:text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg('');
                    setInfoMsg('');
                  }}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-indigo-600 text-white shadow'
                      : isLight
                      ? 'text-slate-700 hover:text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Alerts */}
              {errorMsg && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-600 rounded-xl p-2.5 text-xs font-medium leading-snug">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {infoMsg && (
                <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 rounded-xl p-2.5 text-xs font-medium leading-snug">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{infoMsg}</span>
                </div>
              )}

              {/* Email / Password Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                {mode === 'signup' && (
                  <div>
                    <label
                      className={`block text-xs font-bold mb-1 ${
                        isLight ? 'text-indigo-700' : 'text-indigo-300'
                      }`}
                    >
                      Your Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                      <input
                        type="text"
                        required={mode === 'signup'}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g., Rifa"
                        className={`w-full border focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2 text-sm font-medium focus:outline-none transition ${inputBg}`}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label
                    className={`block text-xs font-bold mb-1 ${
                      isLight ? 'text-indigo-700' : 'text-indigo-300'
                    }`}
                  >
                    College Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={`name@${ALLOWED_DOMAIN}`}
                      className={`w-full border focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2 text-sm font-medium focus:outline-none transition ${inputBg}`}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-xs font-bold mb-1 ${
                      isLight ? 'text-indigo-700' : 'text-indigo-300'
                    }`}
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className={`w-full border focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2 text-sm font-medium focus:outline-none transition ${inputBg}`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition duration-200 hover:-translate-y-0.5 shadow-lg shadow-indigo-600/20 cursor-pointer mt-1"
                >
                  <span>
                    {loading
                      ? 'Please wait...'
                      : mode === 'login'
                      ? 'Sign In to Dashboard'
                      : 'Create Faculty Account'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </main>

        {/* FIXED SINGLE-SCREEN FOOTER */}
        <footer className={`text-xs sm:text-sm font-semibold shrink-0 ${subtextColor}`}>
          @{ALLOWED_DOMAIN} faculty access
        </footer>
      </div>
    </div>
  );
}