import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import Dashboard from './Dashboard';
import StudentPoll from './StudentPoll';

const ALLOWED_DOMAIN = '@bitsathy.ac.in';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if a student opened a QR code link (e.g., /?poll=12345)
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
        const userEmail = currentSession.user?.email?.toLowerCase() || '';
        if (!userEmail.endsWith(ALLOWED_DOMAIN)) {
          await supabase.auth.signOut();
          alert(`Access denied. Please sign in with a ${ALLOWED_DOMAIN} email.`);
          setSession(null);
          setLoading(false);
          return;
        }
      }
      setSession(currentSession);
      setLoading(false);
    };

    // Check current professor login session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Listen for login / logout changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, [pollId]);

  // If it's a student QR link, show the Student Poll page directly
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

  // If logged in, show Professor Dashboard; otherwise show Login / Sign Up
  return session ? <Dashboard user={session.user} /> : <Auth />;
}