import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Logo from './Logo';
import {
  CheckCircle2,
  Star,
  AlertCircle,
  ShieldCheck,
  Send,
  BarChart2,
} from 'lucide-react';

export default function StudentPoll({ pollId }) {
  const [poll, setPoll] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const alreadySubmitted = localStorage.getItem(`saysphere_submitted_${pollId}`);
    if (alreadySubmitted) {
      setSubmitted(true);
    }

    async function fetchPoll() {
      setLoading(true);
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select('*')
        .eq('id', pollId)
        .single();

      if (pollError || !pollData) {
        setError('Poll not found. Please check the QR code and try again.');
        setLoading(false);
        return;
      }

      const { data: qData, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('poll_id', pollId)
        .order('order_index', { ascending: true });

      if (qError) {
        setError('Could not load poll questions.');
      } else {
        setPoll(pollData);
        setQuestions(qData || []);
      }
      setLoading(false);
    }

    fetchPoll();
  }, [pollId]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    for (const q of questions) {
      if (!answers[q.id] || String(answers[q.id]).trim() === '') {
        setError('Please answer all questions before submitting.');
        return;
      }
    }

    setSubmitting(true);
    const { error: insertError } = await supabase.from('responses').insert([
      {
        poll_id: pollId,
        answers,
      },
    ]);

    if (insertError) {
      setError('Submission failed. Please try again.');
    } else {
      localStorage.setItem(`saysphere_submitted_${pollId}`, 'true');
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-slate-400 text-sm">
        Loading poll...
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center backdrop-blur">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-white">Poll Not Found</h2>
          <p className="text-slate-400 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (poll?.status !== 'Active') {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center backdrop-blur">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-white">{poll?.title}</h2>
          <p className="text-slate-400 text-sm mt-2">
            This poll is currently closed and no longer accepting responses.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center backdrop-blur relative z-10 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-9 h-9 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Response Recorded!</h2>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            Thank you for sharing your anonymous feedback on{' '}
            <span className="text-indigo-400 font-semibold">SaySphere</span>. You can close this tab
            now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 relative overflow-hidden pb-16">
      {/* Subtle Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      {/* Top Bar */}
      <header className="max-w-3xl mx-auto px-4 pt-6 pb-4 flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <Logo className="w-9 h-9 shrink-0" />
          <span className="font-bold text-base tracking-tight text-white">SaySphere</span>
        </div>

        {/* Anonymous Trust Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-left leading-tight">
            <p className="text-[11px] font-semibold text-white">Anonymous Poll</p>
            <p className="text-[10px] text-slate-400">No Login • No Personal Data</p>
          </div>
        </div>
      </header>

      {/* Main Centered Poll Container */}
      <main className="max-w-3xl mx-auto px-4 mt-2 relative z-10">
        {/* Poll Title Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 mb-6 backdrop-blur shadow-xl">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 items-center justify-center shrink-0">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <span className="inline-block text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 mb-2">
                {poll.type || 'Poll'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {poll.title}
              </h1>
              {poll.description && (
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">{poll.description}</p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Questions Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {questions.map((q, index) => (
            <div
              key={q.id}
              className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 backdrop-blur shadow-lg"
            >
              {/* Question Heading */}
              <div className="flex items-start gap-3 mb-5">
                <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-indigo-600/30">
                  {index + 1}
                </span>
                <p className="text-white font-semibold text-base sm:text-lg leading-snug">
                  {q.question_text}
                </p>
              </div>

              {/* Multiple Choice (2-Column Tappable Cards) */}
              {q.question_type === 'mcq' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(q.options || []).map((opt, idx) => {
                    const selected = answers[q.id] === opt;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAnswerChange(q.id, opt)}
                        className={`w-full text-left px-4 py-3.5 rounded-2xl border text-sm transition-all flex items-center gap-3 cursor-pointer ${
                          selected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold shadow-md shadow-indigo-500/10'
                            : 'bg-[#0B0F19]/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            selected ? 'border-indigo-400' : 'border-slate-600'
                          }`}
                        >
                          {selected && <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />}
                        </span>
                        <span className="leading-snug">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 1-5 Star Rating */}
              {q.question_type === 'rating' && (
                <div className="flex items-center gap-2 sm:gap-3">
                  {[1, 2, 3, 4, 5].map((num) => {
                    const active = Number(answers[q.id]) >= num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleAnswerChange(q.id, num)}
                        className={`flex-1 py-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          active
                            ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                            : 'bg-[#0B0F19]/80 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Star
                          className={`w-5 h-5 sm:w-6 sm:h-6 ${
                            active ? 'fill-amber-400 text-amber-400' : ''
                          }`}
                        />
                        <span className="text-xs font-semibold">{num}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Short Text with 0 / 300 Counter */}
              {q.question_type === 'text' && (
                <div>
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full bg-[#0B0F19]/80 border border-slate-800 rounded-2xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                  <div className="text-right text-[11px] text-slate-500 mt-1.5 font-medium">
                    {(answers[q.id] || '').length} / 300
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Submit Button */}
          <div className="pt-2 flex justify-center">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto sm:min-w-[260px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] disabled:opacity-50 text-white font-semibold py-3.5 px-8 rounded-2xl transition shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : 'Submit Response'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}