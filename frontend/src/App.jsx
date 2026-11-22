import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import Dashboard from './Dashboard';
import StudentPoll from './StudentPoll';

const ALLOWED_DOMAIN = '@bitsathy.ac.in';

function getBitsathyRole(email) {
  if (!email) return 'invalid';
  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith(ALLOWED_DOMAIN)) return 'invalid';

  const localPart = normalized.split('@')[0];
  return /\d/.test(localPart) ? 'student' : 'faculty';
}

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState('faculty'); // 'faculty' | 'student'
  const [loading, setLoading] = useState(true);

  // Check if someone opened a QR code link (e.g., /?poll=12345)
  const params = new URLSearchParams(window.location.search);
  const pollId = params.get('poll');

  useEffect(() => {
    document.title = 'SaySphere — Live Classroom Polls';
  }, []);

  useEffect(() => {
    if (pollId) {
      setLoading(false);
      return;
    }

    const handleSession = async (currentSession) => {
      if (currentSession) {
        const userEmail = currentSession.user?.email || '';
        const detectedRole = getBitsathyRole(userEmail);

        if (detectedRole === 'invalid') {
          await supabase.auth.signOut();
          alert(`Access denied. Please sign in with a ${ALLOWED_DOMAIN} email.`);
          setSession(null);
          setLoading(false);
          return;
        }

        setRole(detectedRole);
      }

      setSession(currentSession);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, [pollId]);

  if (pollId) {
    return <StudentPoll pollId={pollId} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-slate-400">
        Loading SaySphere...
      </div>
    );
  }

  return session ? <Dashboard user={session.user} role={role} /> : <Auth />;
}