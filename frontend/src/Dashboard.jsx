import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import Logo from './Logo';
import {
  Plus,
  Trash2,
  QrCode,
  BarChart3,
  LogOut,
  Copy,
  Check,
  X,
  RefreshCw,
  Power,
  ArrowLeft,
  Search,
  LayoutGrid,
  CheckCircle2,
  Clock,
  Pencil,
  RotateCcw,
  Menu,
  Smartphone,
  ShieldCheck,
  Star,
  Download,
  FileText,
  Calendar,
  ChevronUp,
  ChevronDown,
  Link2,
  Maximize2,
  Minimize2,
  Settings,
  KeyRound,
  Save,
  Sun,
  Moon,
  MessageSquarePlus,
  PieChart,
  Radio,
  Eye,
  EyeOff,
} from 'lucide-react';

const CHART_COLORS = [
  '#4F46E5', // indigo-600
  '#9333EA', // purple-600
  '#059669', // emerald-600
  '#D97706', // amber-600
  '#E11D48', // rose-600
  '#0284C7', // sky-600
];

const FEEDBACK_PREFIX = '[LINKED_FEEDBACK]';

const hexToRgb = (hex) => {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const createEmptyQuestion = () => ({
  question_text: '',
  question_type: 'mcq',
  options: ['', ''],
  allow_feedback: false,
  feedback_prompt: 'Feedback (Optional)',
});

export default function Dashboard({ user }) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  // 'list' | 'create' | 'results' | 'analytics' | 'session' | 'settings'
  const [view, setView] = useState('list');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectorMode, setProjectorMode] = useState(false);

  // Default to Light Mode ('light' | 'dark')
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('saysphere_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });
  const isLight = theme === 'light';

  useEffect(() => {
    localStorage.setItem('saysphere_theme', theme);
  }, [theme]);

  // Faculty Settings state (synced with Supabase user_metadata)
  const meta = user?.user_metadata || {};
  const initialName = meta.display_name || meta.full_name || '';
  const [displayName, setDisplayName] = useState(initialName);
  const [defaultCategory, setDefaultCategory] = useState(meta.default_category || 'Poll');
  const [defaultStatus, setDefaultStatus] = useState(meta.default_status || 'Active');
  const [savingSettings, setSavingSettings] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState({ type: '', text: '' });

  useEffect(() => {
    const syncedName =
      user?.user_metadata?.display_name || user?.user_metadata?.full_name || '';
    if (syncedName) {
      setDisplayName(syncedName);
    }
  }, [user]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Closed'

  // Create / Edit Poll state (preserved across navigation until saved or explicitly cleared)
  const [editingPollId, setEditingPollId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState(meta.default_category || 'Poll');
  const [questions, setQuestions] = useState([createEmptyQuestion()]);
  const [saving, setSaving] = useState(false);
  const [showStudentPreview, setShowStudentPreview] = useState(false);

  // In-page Delete Confirmation Modal state
  const [pollToDelete, setPollToDelete] = useState(null);
  const [deletingPoll, setDeletingPoll] = useState(false);

  // QR Modal & Card Quick-Copy state
  const [qrPoll, setQrPoll] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedCardId, setCopiedCardId] = useState(null);

  // Single Poll Results & PDF Report state
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [pollQuestions, setPollQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [showPdfReport, setShowPdfReport] = useState(false);

  // Global Analytics & Live Session state (across all polls)
  const [allQuestionsMap, setAllQuestionsMap] = useState({});
  const [allResponsesMap, setAllResponsesMap] = useState({});
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [analyticsPollId, setAnalyticsPollId] = useState('');

  useEffect(() => {
    fetchPolls();
  }, [user.id]);

  // Auto-refresh single poll results every 5 seconds while viewing Results
  useEffect(() => {
    if (view !== 'results' || !selectedPoll || showPdfReport) return;
    const interval = setInterval(() => {
      fetchResults(selectedPoll, true);
    }, 5000);
    return () => clearInterval(interval);
  }, [view, selectedPoll, showPdfReport]);

  // Auto-refresh global analytics / live session every 5 seconds while open
  useEffect(() => {
    if ((view !== 'analytics' && view !== 'session') || polls.length === 0) return;
    const interval = setInterval(() => {
      fetchAllPollsData(polls, true);
    }, 5000);
    return () => clearInterval(interval);
  }, [view, polls]);

  async function fetchPolls() {
    setLoading(true);
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (!error) {
      const list = data || [];
      setPolls(list);
      if (list.length > 0 && !analyticsPollId) {
        setAnalyticsPollId(list[0].id);
      }
      fetchAllPollsData(list, true);
    }
    setLoading(false);
  }

  async function fetchAllPollsData(pollList = polls, silent = false) {
    if (!pollList || pollList.length === 0) {
      setAllQuestionsMap({});
      setAllResponsesMap({});
      return;
    }
    if (!silent) setLoadingGlobal(true);

    const ids = pollList.map((p) => p.id);
    const [{ data: qData }, { data: rData }] = await Promise.all([
      supabase
        .from('questions')
        .select('*')
        .in('poll_id', ids)
        .order('order_index', { ascending: true }),
      supabase
        .from('responses')
        .select('*')
        .in('poll_id', ids)
        .order('submitted_at', { ascending: false }),
    ]);

    const qMap = {};
    const rMap = {};
    ids.forEach((id) => {
      qMap[id] = [];
      rMap[id] = [];
    });

    (qData || []).forEach((q) => {
      if (qMap[q.poll_id]) qMap[q.poll_id].push(q);
    });
    (rData || []).forEach((r) => {
      if (rMap[r.poll_id]) rMap[r.poll_id].push(r);
    });

    setAllQuestionsMap(qMap);
    setAllResponsesMap(rMap);
    setLoadingGlobal(false);
  }

  async function fetchResults(poll, silent = false) {
    if (!silent) setLoadingResults(true);
    setSelectedPoll(poll);
    setView('results');
    setSidebarOpen(false);

    const [{ data: qData }, { data: rData }] = await Promise.all([
      supabase
        .from('questions')
        .select('*')
        .eq('poll_id', poll.id)
        .order('order_index', { ascending: true }),
      supabase
        .from('responses')
        .select('*')
        .eq('poll_id', poll.id)
        .order('submitted_at', { ascending: false }),
    ]);

    setPollQuestions(qData || []);
    setResponses(rData || []);
    setLoadingResults(false);
  }

  const formatCreatedDate = (dateStr) => {
    if (!dateStr) return 'Just now';
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return 'Just now';
    return parsed.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Extract feedback notes linked right after a question (or standalone text questions)
  const extractQuestionFeedbackNotes = (qIndex, questionsArr, sourceResponses) => {
    const currentQ = questionsArr[qIndex];
    const notes = [];

    if (currentQ?.question_type === 'text') {
      sourceResponses.forEach((r) => {
        const val = r.answers?.[currentQ.id];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          notes.push(String(val).trim());
        }
      });
    }

    const nextQ = questionsArr[qIndex + 1];
    if (
      nextQ &&
      nextQ.question_type === 'text' &&
      String(nextQ.question_text || '').startsWith(FEEDBACK_PREFIX)
    ) {
      sourceResponses.forEach((r) => {
        const val = r.answers?.[nextQ.id];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          notes.push(String(val).trim());
        }
      });
    }

    return notes;
  };

  // Build concise summary + readable feedback entries for a question
  const buildQuestionSummary = (q, qIndex, questionsArr = pollQuestions, sourceResponses = responses) => {
    const qAnswers = sourceResponses
      .map((r) => r.answers?.[q.id])
      .filter((v) => v !== undefined && v !== null && String(v).trim() !== '');

    const linkedNotes = extractQuestionFeedbackNotes(qIndex, questionsArr, sourceResponses);

    if (q.question_type === 'mcq') {
      const opts = q.options || [];
      if (qAnswers.length === 0) {
        return {
          total: 0,
          headline: 'No responses submitted yet.',
          breakdown: [],
          feedbackNotes: linkedNotes,
        };
      }
      const breakdown = opts.map((opt) => {
        const votes = qAnswers.filter((a) => a === opt).length;
        const pct = Math.round((votes / qAnswers.length) * 100);
        return { label: opt, votes, pct };
      });
      const sorted = [...breakdown].sort((a, b) => b.votes - a.votes);
      const top = sorted[0];
      return {
        total: qAnswers.length,
        headline: `Leading choice: "${top.label}" (${top.votes}/${qAnswers.length} • ${top.pct}%)`,
        breakdown,
        feedbackNotes: linkedNotes,
      };
    }

    if (q.question_type === 'rating') {
      if (qAnswers.length === 0) {
        return {
          total: 0,
          headline: 'No responses submitted yet.',
          breakdown: [],
          feedbackNotes: linkedNotes,
        };
      }
      const avg = (
        qAnswers.reduce((sum, val) => sum + Number(val), 0) / qAnswers.length
      ).toFixed(1);
      const breakdown = [5, 4, 3, 2, 1].map((star) => {
        const votes = qAnswers.filter((a) => Number(a) === star).length;
        const pct = Math.round((votes / qAnswers.length) * 100);
        return { label: `${star} ★`, votes, pct };
      });
      return {
        total: qAnswers.length,
        headline: `Average rating: ${avg} / 5.0 (${qAnswers.length} ${
          qAnswers.length === 1 ? 'rating' : 'ratings'
        })`,
        breakdown,
        feedbackNotes: linkedNotes,
      };
    }

    return {
      total: qAnswers.length,
      headline:
        qAnswers.length > 0
          ? `${qAnswers.length} feedback ${
              qAnswers.length === 1 ? 'response' : 'responses'
            } collected anonymously.`
          : 'No feedback submitted yet.',
      breakdown: [],
      feedbackNotes: qAnswers.map((item) => String(item).trim()),
    };
  };

  // Build SVG conic-gradient style for clean Pie/Donut charts
  const buildPieGradient = (breakdown) => {
    const totalVotes = breakdown.reduce((sum, item) => sum + item.votes, 0);
    if (totalVotes === 0) return 'conic-gradient(#CBD5E1 0deg 360deg)';
    let currentAngle = 0;
    const segments = breakdown.map((item, idx) => {
      const slice = (item.votes / totalVotes) * 360;
      const start = currentAngle;
      const end = currentAngle + slice;
      currentAngle = end;
      const color = CHART_COLORS[idx % CHART_COLORS.length];
      return `${color} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  };

  // Direct downloadable A4 Poll Results PDF with visual colored charts + overall analysis
  const handleDownloadPdf = () => {
    if (!selectedPoll) return;

    const visibleQuestions = pollQuestions.filter(
      (q) => !(q.question_type === 'text' && String(q.question_text || '').startsWith(FEEDBACK_PREFIX))
    );

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = 18;

    const ensureSpace = (neededHeight) => {
      if (y + neededHeight > pageHeight - 16) {
        doc.addPage();
        y = 18;
      }
    };

    doc.setFillColor(79, 70, 229);
    doc.roundedRect(margin, y, contentWidth, 22, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SaySphere - Poll Results & Visual Charts', margin + 6, y + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}`,
      margin + 6,
      y + 16
    );
    y += 30;

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    const titleLines = doc.splitTextToSize(selectedPoll.title || 'Poll Results', contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 6.5 + 3;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const facultyLabel = displayName.trim() || 'Faculty Member';
    doc.text(
      `Total Anonymous Responses: ${responses.length}   |   Questions: ${
        visibleQuestions.length
      }   |   Created: ${formatCreatedDate(selectedPoll.created_at)}   |   Faculty: ${facultyLabel}`,
      margin + 4,
      y + 7.5
    );
    y += 18;

    const overallResponsesCount =
      totalGlobalResponses > 0 ? totalGlobalResponses : responses.length;
    const overallPollsCount = polls.length > 0 ? polls.length : 1;
    const avgVotesPerPoll = (overallResponsesCount / overallPollsCount).toFixed(1);
    const totalFeedbackNotes = visibleQuestions.reduce((acc, q, qIdx) => {
      const rawIndex = pollQuestions.findIndex((item) => item.id === q.id);
      const s = buildQuestionSummary(
        q,
        rawIndex >= 0 ? rawIndex : qIdx,
        pollQuestions,
        responses
      );
      return acc + s.feedbackNotes.length;
    }, 0);

    ensureSpace(34);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 28, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(79, 70, 229);
    doc.text('OVERALL ANALYSIS', margin + 4, y + 6.5);

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `Total Polls: ${overallPollsCount}     |     All Workspace Votes: ${overallResponsesCount}     |     Avg Votes / Poll: ${avgVotesPerPoll}     |     Poll Feedback Notes: ${totalFeedbackNotes}`,
      margin + 4,
      y + 13.5
    );

    const maxVolume = Math.max(
      1,
      ...polls.map((p) => (allResponsesMap[p.id] || []).length),
      responses.length
    );
    const currentPollRatio = Math.min(1, responses.length / maxVolume);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `This poll's share vs. highest poll volume: ${Math.round(currentPollRatio * 100)}%`,
      margin + 4,
      y + 20
    );
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(margin + 4, y + 22, contentWidth - 8, 2.5, 1, 1, 'F');
    doc.setFillColor(147, 51, 234);
    doc.roundedRect(
      margin + 4,
      y + 22,
      Math.max((contentWidth - 8) * currentPollRatio, 2),
      2.5,
      1,
      1,
      'F'
    );
    y += 35;

    visibleQuestions.forEach((q, idx) => {
      const rawIndex = pollQuestions.findIndex((item) => item.id === q.id);
      const summary = buildQuestionSummary(
        q,
        rawIndex >= 0 ? rawIndex : idx,
        pollQuestions,
        responses
      );
      const qLines = doc.splitTextToSize(`Q${idx + 1}. ${q.question_text}`, contentWidth - 4);
      const hLines = doc.splitTextToSize(summary.headline, contentWidth - 10);
      const hasChart = summary.breakdown.length > 0;
      const chartHeight = hasChart ? 7 + summary.breakdown.length * 11 : 0;
      const needed =
        10 +
        qLines.length * 5 +
        hLines.length * 4.5 +
        chartHeight +
        summary.feedbackNotes.length * 8 +
        8;
      ensureSpace(Math.min(needed, 110));

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(qLines, margin, y);
      y += qLines.length * 5 + 2;

      const boxH = hLines.length * 4.5 + 4.5;
      doc.setFillColor(238, 242, 255);
      doc.setDrawColor(199, 210, 254);
      doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(67, 56, 202);
      doc.text(hLines, margin + 4, y + 5);
      y += boxH + 4;

      if (hasChart) {
        const totalVotesInChart = summary.breakdown.reduce((acc, item) => acc + item.votes, 0);

        if (totalVotesInChart > 0) {
          ensureSpace(10);
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(margin, y, contentWidth, 4.5, 1.5, 1.5, 'F');
          let stackX = margin;
          summary.breakdown.forEach((row, rIdx) => {
            if (row.votes <= 0) return;
            const segW = (contentWidth * row.votes) / totalVotesInChart;
            const rgb = hexToRgb(CHART_COLORS[rIdx % CHART_COLORS.length]);
            doc.setFillColor(rgb.r, rgb.g, rgb.b);
            doc.rect(stackX, y, segW, 4.5, 'F');
            stackX += segW;
          });
          y += 8;
        }

        summary.breakdown.forEach((row, rIdx) => {
          ensureSpace(11);
          const rgb = hexToRgb(CHART_COLORS[rIdx % CHART_COLORS.length]);

          doc.setFillColor(rgb.r, rgb.g, rgb.b);
          doc.circle(margin + 2.5, y + 2.3, 1.4, 'F');

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.2);
          doc.setTextColor(30, 41, 59);
          doc.text(String(row.label), margin + 6, y + 3.5);

          doc.setFont('helvetica', 'bold');
          doc.text(`${row.votes} (${row.pct}%)`, pageWidth - margin, y + 3.5, {
            align: 'right',
          });

          const barY = y + 5.2;
          doc.setFillColor(226, 232, 240);
          doc.roundedRect(margin + 6, barY, contentWidth - 6, 2.6, 1.2, 1.2, 'F');
          if (row.pct > 0) {
            doc.setFillColor(rgb.r, rgb.g, rgb.b);
            doc.roundedRect(
              margin + 6,
              barY,
              Math.max(((contentWidth - 6) * row.pct) / 100, 2.5),
              2.6,
              1.2,
              1.2,
              'F'
            );
          }
          y += 11;
        });
      }

      if (summary.feedbackNotes.length > 0) {
        ensureSpace(8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(79, 70, 229);
        doc.text('Feedback:', margin + 2, y + 3.5);
        y += 5;

        summary.feedbackNotes.forEach((note, nIdx) => {
          const noteLines = doc.splitTextToSize(`${nIdx + 1}. "${note}"`, contentWidth - 8);
          ensureSpace(noteLines.length * 4.5 + 4);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85);
          doc.text(noteLines, margin + 4, y + 3.5);
          y += noteLines.length * 4.5 + 3;
        });
      }

      y += 2;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
    });

    const safeFileName = (selectedPoll.title || 'saysphere-results')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    doc.save(`${safeFileName || 'saysphere-results'}-results.pdf`);
  };

  // Save Settings to Supabase user_metadata
  async function handleSaveSettings(e) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsNotice({ type: '', text: '' });

    const cleanName = displayName.trim();
    const { error } = await supabase.auth.updateUser({
      data: {
        display_name: cleanName,
        full_name: cleanName,
        default_category: defaultCategory,
        default_status: defaultStatus,
      },
    });

    if (error) {
      setSettingsNotice({ type: 'error', text: error.message });
    } else {
      setSettingsNotice({ type: 'success', text: 'Preferences saved!' });
      setTimeout(() => setSettingsNotice({ type: '', text: '' }), 3000);
    }
    setSavingSettings(false);
  }

  // Working Password Reset via Supabase Auth
  async function handleSendPasswordReset() {
    setSettingsNotice({ type: '', text: '' });
    const targetEmail = (user?.email || '').trim();
    if (!targetEmail) {
      setSettingsNotice({ type: 'error', text: 'No email address found for this account.' });
      return;
    }

    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setSettingsNotice({ type: 'error', text: error.message });
    } else {
      setSettingsNotice({
        type: 'success',
        text: `Password reset email sent to ${targetEmail}. Check your inbox (and spam folder).`,
      });
    }
    setSendingReset(false);
  }

  const resetForm = () => {
    setEditingPollId(null);
    setTitle('');
    setDescription('');
    setType(defaultCategory || 'Poll');
    setQuestions([createEmptyQuestion()]);
  };

  // Universal navigation helpers (never wipe unsaved drafts)
  const openListView = () => {
    setProjectorMode(false);
    setShowPdfReport(false);
    setView('list');
    setSidebarOpen(false);
  };

  const openCreateView = () => {
    setProjectorMode(false);
    setShowPdfReport(false);
    if (!editingPollId && !title && questions.length === 1 && !questions[0].question_text) {
      setType(defaultCategory || 'Poll');
    }
    setView('create');
    setSidebarOpen(false);
  };

  const openAnalyticsView = () => {
    setProjectorMode(false);
    setShowPdfReport(false);
    if (polls.length > 0 && (!analyticsPollId || !polls.some((p) => p.id === analyticsPollId))) {
      setAnalyticsPollId(polls[0].id);
    }
    fetchAllPollsData(polls, false);
    setView('analytics');
    setSidebarOpen(false);
  };

  const openSessionView = () => {
    setProjectorMode(false);
    setShowPdfReport(false);
    fetchAllPollsData(polls, false);
    setView('session');
    setSidebarOpen(false);
  };

  const openSettingsView = () => {
    setProjectorMode(false);
    setShowPdfReport(false);
    setSettingsNotice({ type: '', text: '' });
    setView('settings');
    setSidebarOpen(false);
  };

  const getPollUrl = (pollId) => `${window.location.origin}/?poll=${pollId}`;

  const copyLink = (pollId) => {
    navigator.clipboard.writeText(getPollUrl(pollId));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCardLink = (pollId) => {
    navigator.clipboard.writeText(getPollUrl(pollId));
    setCopiedCardId(pollId);
    setTimeout(() => setCopiedCardId(null), 2000);
  };

  // Question builder & inline feedback helpers
  const addQuestion = () => {
    setQuestions([...questions, createEmptyQuestion()]);
  };

  const toggleFeedbackBelowQuestion = (index) => {
    const updated = [...questions];
    const nextState = !updated[index].allow_feedback;
    updated[index] = {
      ...updated[index],
      allow_feedback: nextState,
      feedback_prompt: updated[index].feedback_prompt || 'Feedback (Optional)',
    };
    setQuestions(updated);
  };

  const updateFeedbackPrompt = (index, value) => {
    const updated = [...questions];
    updated[index] = {
      ...updated[index],
      feedback_prompt: value,
    };
    setQuestions(updated);
  };

  const removeQuestion = (index) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const moveQuestion = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const updated = [...questions];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setQuestions(updated);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    if (
      field === 'question_type' &&
      value === 'mcq' &&
      (!updated[index].options || updated[index].options.length < 2)
    ) {
      updated[index].options = ['', ''];
    }
    setQuestions(updated);
  };

  const addOption = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].options.push('');
    setQuestions(updated);
  };

  const updateOption = (qIndex, optIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  const removeOption = (qIndex, optIndex) => {
    const updated = [...questions];
    if (updated[qIndex].options.length <= 2) return;
    updated[qIndex].options.splice(optIndex, 1);
    setQuestions(updated);
  };

  // Clean feedback label without any internal prefix
  const cleanFeedbackLabel = (rawText) => {
    const stripped = String(rawText || '')
      .replaceAll(FEEDBACK_PREFIX, '')
      .trim();
    return stripped || 'Feedback (Optional)';
  };

  // Expand builder question rows + linked feedback rows for Supabase persistence
  const expandQuestionsForDatabase = (pollId, rawQuestions) => {
    const rows = [];
    rawQuestions.forEach((q) => {
      const orderIndex = rows.length;
      const baseText =
        q.question_type === 'text'
          ? cleanFeedbackLabel(q.question_text)
          : q.question_text.trim();

      rows.push({
        poll_id: pollId,
        question_text: baseText,
        question_type: q.question_type,
        options:
          q.question_type === 'mcq' ? (q.options || []).map((o) => o.trim()).filter(Boolean) : [],
        order_index: orderIndex,
      });

      if (q.question_type !== 'text' && q.allow_feedback) {
        rows.push({
          poll_id: pollId,
          question_text: `${FEEDBACK_PREFIX} ${cleanFeedbackLabel(q.feedback_prompt)}`,
          question_type: 'text',
          options: [],
          order_index: rows.length,
        });
      }
    });
    return rows;
  };

  // Reconstruct main question cards + attached feedback when editing an existing poll
  const hydrateQuestionsFromDatabase = (qData) => {
    if (!qData || qData.length === 0) {
      return [createEmptyQuestion()];
    }

    const hydrated = [];
    for (let i = 0; i < qData.length; i++) {
      const row = qData[i];
      const isLinkedFeedback =
        row.question_type === 'text' &&
        String(row.question_text || '').startsWith(FEEDBACK_PREFIX);

      if (isLinkedFeedback) {
        if (hydrated.length > 0) {
          hydrated[hydrated.length - 1].allow_feedback = true;
          hydrated[hydrated.length - 1].feedback_prompt = cleanFeedbackLabel(row.question_text);
        }
        continue;
      }

      hydrated.push({
        id: row.id,
        question_text: cleanFeedbackLabel(row.question_text),
        question_type: row.question_type,
        options:
          row.question_type === 'mcq'
            ? row.options && row.options.length >= 2
              ? row.options
              : ['', '']
            : ['', ''],
        allow_feedback: false,
        feedback_prompt: 'Feedback (Optional)',
      });
    }

    return hydrated.length > 0 ? hydrated : [createEmptyQuestion()];
  };

  // COPY / DUPLICATE POLL (strips [LINKED_FEEDBACK] cleanly)
  async function handleDuplicatePoll(poll) {
    setLoading(true);
    const { data: qData, error: fetchError } = await supabase
      .from('questions')
      .select('*')
      .eq('poll_id', poll.id)
      .order('order_index', { ascending: true });

    if (fetchError) {
      alert('Failed to copy poll questions: ' + fetchError.message);
      setLoading(false);
      return;
    }

    const { data: newPoll, error: pollError } = await supabase
      .from('polls')
      .insert([
        {
          title: `${poll.title} (Copy)`,
          description: poll.description || '',
          type: poll.type,
          status: defaultStatus || 'Active',
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (pollError || !newPoll) {
      alert('Failed to duplicate poll: ' + (pollError?.message || 'Unknown error'));
      setLoading(false);
      return;
    }

    if (qData && qData.length > 0) {
      const clonedQuestions = qData.map((q, index) => {
        const isLinked =
          q.question_type === 'text' &&
          String(q.question_text || '').startsWith(FEEDBACK_PREFIX);
        const labelText = cleanFeedbackLabel(q.question_text);

        return {
          poll_id: newPoll.id,
          question_text: isLinked ? `${FEEDBACK_PREFIX} ${labelText}` : labelText,
          question_type: q.question_type,
          options: q.options || [],
          order_index: index,
        };
      });

      await supabase.from('questions').insert(clonedQuestions);
    }

    await fetchPolls();
  }

  // LOAD POLL INTO EDIT MODE
  async function startEditPoll(poll) {
    const { data: qData, error } = await supabase
      .from('questions')
      .select('*')
      .eq('poll_id', poll.id)
      .order('order_index', { ascending: true });

    if (error) {
      alert('Failed to load poll for editing: ' + error.message);
      return;
    }

    setEditingPollId(poll.id);
    setTitle(poll.title);
    setDescription(poll.description || '');
    setType(poll.type || 'Poll');
    setQuestions(hydrateQuestionsFromDatabase(qData));
    setProjectorMode(false);
    setShowPdfReport(false);
    setView('create');
    setSidebarOpen(false);
  }

  // SAVE (CREATE OR UPDATE) POLL
  async function handleSavePoll(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    if (editingPollId) {
      const { error: pollError } = await supabase
        .from('polls')
        .update({
          title: title.trim(),
          description: description.trim(),
          type,
        })
        .eq('id', editingPollId)
        .eq('created_by', user.id);

      if (pollError) {
        alert('Failed to update poll: ' + pollError.message);
        setSaving(false);
        return;
      }

      await supabase.from('questions').delete().eq('poll_id', editingPollId);
      const expandedRows = expandQuestionsForDatabase(editingPollId, questions);
      const { error: qError } = await supabase.from('questions').insert(expandedRows);

      if (qError) {
        alert('Poll updated, but failed to save questions: ' + qError.message);
        setSaving(false);
        return;
      }

      resetForm();
      await fetchPolls();
      setView('list');
      setSaving(false);
      return;
    }

    const { data: newPoll, error: pollError } = await supabase
      .from('polls')
      .insert([
        {
          title: title.trim(),
          description: description.trim(),
          type,
          status: defaultStatus || 'Active',
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (pollError || !newPoll) {
      alert('Failed to create poll: ' + (pollError?.message || 'Unknown error'));
      setSaving(false);
      return;
    }

    const formattedQuestions = expandQuestionsForDatabase(newPoll.id, questions);
    const { error: qError } = await supabase.from('questions').insert(formattedQuestions);

    if (qError) {
      alert('Poll created, but failed to save questions: ' + qError.message);
    } else {
      resetForm();
      await fetchPolls();
      setView('list');
      setQrPoll(newPoll);
    }

    setSaving(false);
  }

  // RESET ALL RESPONSES FOR A POLL
  async function handleResetResponses(poll, customCount) {
    const countToShow =
      typeof customCount === 'number' ? customCount : responses.length;
    if (
      !window.confirm(
        `Reset "${poll.title}"? This will permanently delete all ${countToShow} saved student responses so you can reuse it fresh.`
      )
    ) {
      return;
    }

    const { error } = await supabase.from('responses').delete().eq('poll_id', poll.id);

    if (error) {
      alert('Failed to reset responses: ' + error.message);
    } else {
      if (selectedPoll?.id === poll.id) {
        setResponses([]);
      }
      setAllResponsesMap((prev) => ({
        ...prev,
        [poll.id]: [],
      }));
    }
  }

  async function toggleStatus(poll) {
    const nextStatus = poll.status === 'Active' ? 'Closed' : 'Active';
    const { error } = await supabase
      .from('polls')
      .update({ status: nextStatus })
      .eq('id', poll.id)
      .eq('created_by', user.id);

    if (!error) {
      setPolls((prev) => prev.map((p) => (p.id === poll.id ? { ...p, status: nextStatus } : p)));
    }
  }

  // CONFIRM & DELETE POLL VIA IN-PAGE MODAL
  async function confirmDeletePoll() {
    if (!pollToDelete) return;
    setDeletingPoll(true);
    const targetId = pollToDelete.id;

    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', targetId)
      .eq('created_by', user.id);

    if (!error) {
      setPolls((prev) => prev.filter((p) => p.id !== targetId));
      setAllResponsesMap((prev) => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
      setPollToDelete(null);
    } else {
      alert('Failed to delete poll: ' + error.message);
    }

    setDeletingPoll(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // Stats & Filtered Polls
  const activePolls = polls.filter((p) => p.status === 'Active');
  const activeCount = activePolls.length;
  const closedCount = polls.filter((p) => p.status !== 'Active').length;

  const totalGlobalResponses = Object.values(allResponsesMap).reduce(
    (sum, list) => sum + (list?.length || 0),
    0
  );
  const activeSessionResponses = activePolls.reduce(
    (sum, p) => sum + (allResponsesMap[p.id]?.length || 0),
    0
  );

  const filteredPolls = polls.filter((poll) => {
    const matchesStatus = statusFilter === 'All' || poll.status === statusFilter;
    const matchesSearch =
      poll.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (poll.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Purposeful Sidebar Menu (Overview, Charts & Analysis, Live Session, Settings)
  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutGrid,
      badge: polls.length,
      active: view === 'list',
      onClick: openListView,
    },
    {
      id: 'analytics',
      label: 'Charts & Analysis',
      icon: PieChart,
      badge: totalGlobalResponses,
      active: view === 'analytics' || view === 'results',
      onClick: openAnalyticsView,
    },
    {
      id: 'session',
      label: 'Live Session',
      icon: Radio,
      badge: activeSessionResponses,
      active: view === 'session',
      onClick: openSessionView,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: null,
      active: view === 'settings',
      onClick: openSettingsView,
    },
  ];

  // Theme & high-legibility label tokens
  const shellBg = isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0B0F19] text-slate-100';
  const sidebarBg = isLight
    ? 'bg-white border-slate-200 text-slate-800'
    : 'bg-[#0D1220] border-slate-800/80 text-slate-100';
  const cardBg = isLight
    ? 'bg-white border-slate-200 shadow-xs'
    : 'bg-slate-900/50 border-slate-800/80';
  const fieldBg = isLight
    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
    : 'bg-[#0B0F19] border-slate-800 text-white placeholder-slate-500';
  const headingText = isLight ? 'text-slate-900' : 'text-white';
  const bodySubtext = isLight ? 'text-slate-600' : 'text-slate-300';
  const coloredLabel = isLight
    ? 'text-indigo-700 font-semibold text-sm'
    : 'text-indigo-300 font-semibold text-sm';

  // Reusable Universal Back Bar for every page (desktop + mobile)
  const UniversalBackButton = ({ label = 'Back to Overview' }) => (
    <div className="mb-5">
      <button
        type="button"
        onClick={openListView}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition cursor-pointer ${
          isLight
            ? 'bg-white hover:bg-indigo-50 text-indigo-700 border-slate-200 hover:border-indigo-300 shadow-2xs'
            : 'bg-slate-900 hover:bg-slate-800 text-indigo-300 border-slate-800 hover:border-indigo-500/40'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{label}</span>
      </button>
    </div>
  );

  // Selected poll data for the Charts & Analysis view
  const activeAnalyticsPoll =
    polls.find((p) => p.id === analyticsPollId) || polls[0] || null;
  const activeAnalyticsQuestions = activeAnalyticsPoll
    ? allQuestionsMap[activeAnalyticsPoll.id] || []
    : [];
  const activeAnalyticsResponses = activeAnalyticsPoll
    ? allResponsesMap[activeAnalyticsPoll.id] || []
    : [];
  const maxPollResponseCount = Math.max(
    1,
    ...polls.map((p) => (allResponsesMap[p.id] || []).length)
  );

  return (
    <div className={`min-h-screen flex transition-colors duration-200 ${shellBg}`}>
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      {/* LEFT SIDEBAR (Hidden in Projector Mode) */}
      {!projectorMode && (
        <aside
          className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 border-r flex flex-col justify-between transition-transform duration-200 ${sidebarBg} ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div>
            {/* Brand Header + Dark/Light Toggle (Full Unclipped Subtitle) */}
            <div
              className={`px-3.5 py-4 border-b flex items-center justify-between gap-1.5 ${
                isLight ? 'border-slate-200' : 'border-slate-800/80'
              }`}
            >
              <div
                onClick={openListView}
                className="flex items-center gap-2 cursor-pointer min-w-0"
              >
                <Logo className="w-8 h-8 shrink-0" />
                <div className="min-w-0">
                  <h1 className={`font-bold text-base tracking-tight leading-tight ${headingText}`}>
                    SaySphere
                  </h1>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 whitespace-nowrap">
                    LIVE CLASSROOM POLLS
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                  title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                  className={`p-2 rounded-xl border transition cursor-pointer ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-amber-300'
                  }`}
                >
                  {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setSidebarOpen(false)}
                  className={`lg:hidden p-1.5 rounded-lg ${bodySubtext}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Primary Action */}
            <div className="p-4">
              <button
                onClick={openCreateView}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Poll</span>
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="px-3 space-y-1">
              <p className={`px-3 pb-1.5 text-xs font-bold uppercase tracking-wider ${coloredLabel}`}>
                Menu
              </p>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                      item.active
                        ? isLight
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                        : isLight
                        ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== null && (
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          item.active
                            ? isLight
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-indigo-500/25 text-indigo-200'
                            : isLight
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Faculty Account + Logout */}
          <div
            className={`p-4 border-t space-y-3 ${
              isLight ? 'border-slate-200' : 'border-slate-800/80'
            }`}
          >
            <div
              onClick={openSettingsView}
              className={`rounded-xl p-3 border cursor-pointer transition ${
                isLight
                  ? 'bg-indigo-50/60 hover:bg-indigo-50 border-indigo-200/80'
                  : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800/80'
              }`}
            >
              <p className={`text-xs font-bold uppercase tracking-wider ${coloredLabel}`}>
                {displayName.trim() || 'Faculty Account'}
              </p>
              <p className={`text-xs font-medium truncate mt-1 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                {user?.email || ''}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className={`w-full flex items-center justify-center gap-2 text-xs font-semibold py-2.5 px-3 rounded-xl border transition cursor-pointer ${
                isLight
                  ? 'text-slate-800 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
                  : 'text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border-slate-800'
              }`}
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      )}

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Top Bar */}
        {!projectorMode && (
          <header
            className={`lg:hidden sticky top-0 z-20 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between ${
              isLight
                ? 'bg-white/95 border-slate-200'
                : 'bg-[#0B0F19]/85 border-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setSidebarOpen(true)}
                className={`p-2 rounded-xl border cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-800'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Menu className="w-4 h-4" />
              </button>
              <Logo className="w-6 h-6 shrink-0" />
              <span className={`font-bold text-sm ${headingText}`}>SaySphere</span>
            </div>

            <div className="flex items-center gap-2">
              {view !== 'list' && (
                <button
                  type="button"
                  onClick={openListView}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                    isLight
                      ? 'bg-slate-100 border-slate-200 text-slate-800'
                      : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                className={`p-2 rounded-xl border cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-800'
                    : 'bg-slate-900 border-slate-800 text-amber-300'
                }`}
              >
                {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={openCreateView}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>
          </header>
        )}

        <main
          className={`flex-1 w-full mx-auto px-4 sm:px-8 py-8 ${
            projectorMode ? 'max-w-5xl py-10' : 'max-w-6xl'
          }`}
        >
          {/* VIEW 1: OVERVIEW (POLLS LIST) */}
          {view === 'list' && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${headingText}`}>
                  {displayName.trim() ? `Welcome, ${displayName.trim()}` : 'Faculty Dashboard'}
                </h2>
                <p className={`text-sm font-medium mt-1 ${bodySubtext}`}>
                  Create anonymous classroom polls, project QR codes, and track live responses.
                </p>
              </div>

              {/* 3 KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`border rounded-2xl p-5 flex items-center gap-4 ${cardBg}`}>
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${bodySubtext}`}>Total Polls</p>
                    <p className={`text-2xl font-bold ${headingText}`}>{polls.length}</p>
                  </div>
                </div>

                <div className={`border rounded-2xl p-5 flex items-center gap-4 ${cardBg}`}>
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${bodySubtext}`}>Active Now</p>
                    <p className={`text-2xl font-bold ${headingText}`}>{activeCount}</p>
                  </div>
                </div>

                <div className={`border rounded-2xl p-5 flex items-center gap-4 ${cardBg}`}>
                  <div
                    className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
                      isLight
                        ? 'bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-slate-800/80 border-slate-700/60 text-slate-300'
                    }`}
                  >
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${bodySubtext}`}>Closed Polls</p>
                    <p className={`text-2xl font-bold ${headingText}`}>{closedCount}</p>
                  </div>
                </div>
              </div>

              {/* Search + Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div
                  className={`flex items-center gap-1.5 p-1 rounded-xl border w-fit ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-900/70 border-slate-800/80'
                  }`}
                >
                  {['All', 'Active', 'Closed'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setStatusFilter(tab)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        statusFilter === tab
                          ? 'bg-indigo-600 text-white shadow'
                          : isLight
                          ? 'text-slate-700 hover:text-slate-900'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your polls..."
                    className={`w-full border rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500 transition ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                        : 'bg-slate-900/70 border-slate-800/80 text-white placeholder-slate-500'
                    }`}
                  />
                </div>
              </div>

              {/* Polls List */}
              {loading ? (
                <div className={`text-center py-16 text-sm font-medium ${bodySubtext}`}>
                  Loading your polls...
                </div>
              ) : filteredPolls.length === 0 ? (
                <div className={`border rounded-2xl p-12 text-center ${cardBg}`}>
                  <p className={`font-semibold ${headingText}`}>
                    {polls.length === 0 ? 'No polls created yet' : 'No matching polls found'}
                  </p>
                  <p className={`text-xs font-medium mt-1.5 ${bodySubtext}`}>
                    {polls.length === 0
                      ? 'Click "New Poll" to create your first classroom poll.'
                      : 'Try clearing your search or switching the filter tab.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3.5">
                  {filteredPolls.map((poll) => (
                    <div
                      key={poll.id}
                      className={`border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${cardBg}`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              poll.status === 'Active'
                                ? isLight
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : isLight
                                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                poll.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {poll.status}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                              isLight
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                            }`}
                          >
                            {poll.type}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${bodySubtext}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            Created {formatCreatedDate(poll.created_at)}
                          </span>
                        </div>
                        <h3 className={`text-base sm:text-lg font-semibold ${headingText}`}>
                          {poll.title}
                        </h3>
                        {poll.description && (
                          <p className={`text-xs sm:text-sm mt-0.5 ${bodySubtext}`}>
                            {poll.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setQrPoll(poll)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            isLight
                              ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                              : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/30'
                          }`}
                        >
                          <QrCode className="w-4 h-4" />
                          <span>QR Code</span>
                        </button>

                        <button
                          onClick={() => copyCardLink(poll.id)}
                          title="Copy student poll link"
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            isLight
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700/60'
                          }`}
                        >
                          {copiedCardId === poll.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Link2 className="w-3.5 h-3.5" />
                              <span>Link</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => fetchResults(poll)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            isLight
                              ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                              : 'bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700/60'
                          }`}
                        >
                          <BarChart3 className="w-4 h-4" />
                          <span>Results</span>
                        </button>

                        <button
                          onClick={() => startEditPoll(poll)}
                          title="Edit Poll"
                          className={`p-2 rounded-xl border transition cursor-pointer ${
                            isLight
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
                          }`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDuplicatePoll(poll)}
                          title="Duplicate Poll for another class"
                          className={`p-2 rounded-xl border transition cursor-pointer ${
                            isLight
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
                          }`}
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => toggleStatus(poll)}
                          title={poll.status === 'Active' ? 'Close Poll' : 'Reopen Poll'}
                          className={`p-2 rounded-xl border transition cursor-pointer ${
                            isLight
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setPollToDelete(poll)}
                          title="Delete Poll"
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 rounded-xl transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: POLL STUDIO + OPTIONAL TOGGLEABLE STUDENT PREVIEW */}
          {view === 'create' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <UniversalBackButton label="Back to Overview" />

                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowStudentPreview((prev) => !prev)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      showStudentPreview
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : isLight
                        ? 'bg-white hover:bg-indigo-50 text-indigo-700 border-slate-200 hover:border-indigo-300'
                        : 'bg-slate-900 hover:bg-slate-800 text-indigo-300 border-slate-800'
                    }`}
                  >
                    {showStudentPreview ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        <span>Hide Student Preview</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>Preview Student View</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-500 cursor-pointer px-2 py-1"
                  >
                    Clear Draft
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <h2 className={`text-2xl font-bold ${headingText}`}>
                  {editingPollId ? 'Edit Poll Studio' : 'Poll Studio'}
                </h2>
                <p className={`text-sm font-medium mt-0.5 ${bodySubtext}`}>
                  {editingPollId
                    ? 'Update your poll details or questions below. Click "Preview Student View" anytime to inspect the mobile layout.'
                    : 'Build your questions below. Click "+ Add Feedback" to attach an optional feedback box to a question.'}
                </p>
              </div>

              <div
                className={
                  showStudentPreview
                    ? 'grid grid-cols-1 xl:grid-cols-12 gap-7 items-start'
                    : 'w-full'
                }
              >
                {/* LEFT / MAIN COLUMN: BUILDER FORM */}
                <form
                  onSubmit={handleSavePoll}
                  className={showStudentPreview ? 'xl:col-span-7 space-y-6' : 'space-y-6'}
                >
                  <div className={`border rounded-2xl p-6 space-y-4 ${cardBg}`}>
                    <div>
                      <label className={`block mb-1.5 ${coloredLabel}`}>Poll Title *</label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., SSG Class & Hackathon Poll"
                        className={`w-full border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 ${fieldBg}`}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`block mb-1.5 ${coloredLabel}`}>
                          Description (optional)
                        </label>
                        <input
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Short instructions for students"
                          className={`w-full border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 ${fieldBg}`}
                        />
                      </div>

                      <div>
                        <label className={`block mb-1.5 ${coloredLabel}`}>Category</label>
                        <select
                          value={type}
                          onChange={(e) => setType(e.target.value)}
                          className={`w-full border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 ${fieldBg}`}
                        >
                          <option value="Poll">Quick Poll</option>
                          <option value="Feedback">Class Feedback</option>
                          <option value="Survey">Survey</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Questions List */}
                  <div className="space-y-4">
                    {questions.map((q, qIndex) => (
                      <div
                        key={qIndex}
                        className={`border rounded-2xl p-6 space-y-4 ${cardBg}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
                            <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs">
                              {qIndex + 1}
                            </span>
                            Question {qIndex + 1}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => moveQuestion(qIndex, -1)}
                              disabled={qIndex === 0}
                              title="Move question up"
                              className={`p-1.5 rounded-lg border disabled:opacity-30 transition cursor-pointer ${
                                isLight
                                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                                  : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
                              }`}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveQuestion(qIndex, 1)}
                              disabled={qIndex === questions.length - 1}
                              title="Move question down"
                              className={`p-1.5 rounded-lg border disabled:opacity-30 transition cursor-pointer ${
                                isLight
                                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                                  : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
                              }`}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            {questions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeQuestion(qIndex)}
                                className="ml-1 text-xs font-semibold text-red-600 hover:text-red-500 cursor-pointer"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input
                            type="text"
                            required
                            value={q.question_text}
                            onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                            placeholder="Type your question here..."
                            className={`sm:col-span-2 border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 ${fieldBg}`}
                          />

                          <select
                            value={q.question_type}
                            onChange={(e) => updateQuestion(qIndex, 'question_type', e.target.value)}
                            className={`border rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 ${fieldBg}`}
                          >
                            <option value="mcq">Multiple Choice</option>
                            <option value="rating">1 to 5 Star Rating</option>
                            <option value="text">Feedback</option>
                          </select>
                        </div>

                        {q.question_type === 'mcq' && (
                          <div className="space-y-2.5 pt-1">
                            <label className={`block ${coloredLabel}`}>Options</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {q.options.map((opt, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    required
                                    value={opt}
                                    onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                                    placeholder={`Option ${optIndex + 1}`}
                                    className={`flex-1 border rounded-xl px-3.5 py-2 text-sm font-medium focus:outline-none focus:border-indigo-500 ${fieldBg}`}
                                  />
                                  {q.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => removeOption(qIndex, optIndex)}
                                      className={`p-2 hover:text-red-600 cursor-pointer ${bodySubtext}`}
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => addOption(qIndex)}
                              className="text-xs text-indigo-600 hover:text-indigo-500 font-bold mt-1 cursor-pointer"
                            >
                              + Add Option
                            </button>
                          </div>
                        )}

                        {/* NESTED OPTIONAL FEEDBACK BOX */}
                        {q.question_type !== 'text' && q.allow_feedback && (
                          <div
                            className={`mt-2 rounded-xl border p-4 space-y-2.5 ${
                              isLight
                                ? 'bg-emerald-50/60 border-emerald-200'
                                : 'bg-emerald-500/5 border-emerald-500/25'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                Feedback
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleFeedbackBelowQuestion(qIndex)}
                                className="text-xs font-semibold text-red-600 hover:text-red-500 cursor-pointer"
                              >
                                Remove Feedback
                              </button>
                            </div>
                            <input
                              type="text"
                              value={q.feedback_prompt || ''}
                              onChange={(e) => updateFeedbackPrompt(qIndex, e.target.value)}
                              placeholder="Feedback label for students (e.g., Feedback (Optional))"
                              className={`w-full border rounded-xl px-3.5 py-2 text-sm font-medium focus:outline-none focus:border-indigo-500 ${fieldBg}`}
                            />
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={addQuestion}
                        className={`w-full border border-dashed py-3 px-4 rounded-2xl text-sm font-semibold transition cursor-pointer ${
                          isLight
                            ? 'border-indigo-300 bg-indigo-50/40 hover:border-indigo-500 text-indigo-800'
                            : 'border-slate-700 hover:border-indigo-500 text-slate-200 hover:text-white'
                        }`}
                      >
                        + Add Another Question
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const targetIdx = questions.length - 1;
                          if (questions[targetIdx]?.question_type !== 'text') {
                            toggleFeedbackBelowQuestion(targetIdx);
                          } else {
                            addQuestion();
                          }
                        }}
                        className={`w-full flex items-center justify-center gap-2 border border-dashed py-3 px-4 rounded-2xl text-sm font-semibold transition cursor-pointer ${
                          isLight
                            ? 'border-emerald-300 bg-emerald-50/50 hover:border-emerald-500 text-emerald-800'
                            : 'border-emerald-700/60 hover:border-emerald-500 text-emerald-300'
                        }`}
                      >
                        <MessageSquarePlus className="w-4 h-4" />
                        <span>+ Add Feedback</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    {saving
                      ? 'Saving...'
                      : editingPollId
                      ? 'Save Changes'
                      : 'Create Poll & Generate QR Code'}
                  </button>
                </form>

                {/* OPTIONAL RIGHT COLUMN: LIVE STUDENT PHONE PREVIEW (SHOWN ONLY WHEN TOGGLED ON) */}
                {showStudentPreview && (
                  <div className="xl:col-span-5 xl:sticky xl:top-6">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                        <Smartphone className="w-4 h-4" />
                        <span>Student Mobile Preview</span>
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                        Preview Only (Non-Clickable)
                      </span>
                    </div>

                    <div className="max-w-[390px] mx-auto bg-[#070A12] border-[3px] border-slate-800 rounded-[2.5rem] p-3 shadow-2xl select-none pointer-events-none">
                      <div className="w-24 h-4 bg-slate-900 rounded-full mx-auto mb-3 border border-slate-800/80" />
                      <div className="bg-[#0B0F19] text-slate-100 rounded-[1.85rem] border border-slate-800/80 p-4 max-h-[640px] overflow-y-auto space-y-3.5">
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/70">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Logo className="w-5 h-5 shrink-0" />
                            SaySphere
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            Anonymous
                          </span>
                        </div>

                        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5">
                          <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 mb-1.5">
                            {type || 'Poll'}
                          </span>
                          <h3 className="text-sm font-bold text-white leading-snug">
                            {title.trim() || 'Your Poll Title Appears Here'}
                          </h3>
                          {description.trim() && (
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                              {description.trim()}
                            </p>
                          )}
                        </div>

                        {questions.map((q, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5"
                          >
                            <div className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <p className="text-xs font-semibold text-white leading-snug">
                                {cleanFeedbackLabel(q.question_text) || `Question ${idx + 1} text...`}
                              </p>
                            </div>

                            {q.question_type === 'mcq' && (
                              <div className="grid grid-cols-1 gap-1.5 pt-0.5">
                                {(q.options || []).map((opt, oIdx) => (
                                  <div
                                    key={oIdx}
                                    className="px-3 py-2 rounded-xl bg-[#0B0F19] border border-slate-800 text-xs text-slate-200 flex items-center gap-2"
                                  >
                                    <span className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0" />
                                    <span className="truncate">
                                      {opt.trim() || `Option ${oIdx + 1}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {q.question_type === 'rating' && (
                              <div className="grid grid-cols-5 gap-1 pt-0.5">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <div
                                    key={n}
                                    className="py-2 rounded-xl bg-[#0B0F19] border border-slate-800 flex flex-col items-center gap-0.5 text-slate-300"
                                  >
                                    <Star className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-semibold">{n}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {(q.question_type === 'text' || q.allow_feedback) && (
                              <div className="pt-1 border-t border-slate-800/70">
                                <p className="text-[10px] font-semibold text-emerald-300 mb-1">
                                  {q.question_type === 'text'
                                    ? 'Feedback'
                                    : cleanFeedbackLabel(q.feedback_prompt)}
                                </p>
                                <div className="w-full h-12 rounded-xl bg-[#0B0F19] border border-slate-800 p-2 text-xs text-slate-400">
                                  Student types feedback here...
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        <div className="w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-center text-xs font-semibold text-slate-300">
                          Submit Response (Student Button)
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 3: SINGLE POLL RESULTS */}
          {view === 'results' && selectedPoll && (
            <div>
              <UniversalBackButton label="Back to Overview" />

              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2
                      className={`font-bold ${headingText} ${
                        projectorMode ? 'text-3xl sm:text-4xl' : 'text-2xl'
                      }`}
                    >
                      {selectedPoll.title} — Results
                    </h2>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LIVE SYNC • 5s
                    </span>
                  </div>
                  <p className={`text-sm font-medium mt-1 ${bodySubtext}`}>
                    Created {formatCreatedDate(selectedPoll.created_at)} • Total Anonymous Responses:{' '}
                    <span className="text-indigo-600 font-bold text-base">{responses.length}</span>{' '}
                    • Questions:{' '}
                    <span className="font-semibold">
                      {
                        pollQuestions.filter(
                          (q) =>
                            !(
                              q.question_type === 'text' &&
                              String(q.question_text || '').startsWith(FEEDBACK_PREFIX)
                            )
                        ).length
                      }
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setProjectorMode((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      projectorMode
                        ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/20'
                        : 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 border-purple-500/30'
                    }`}
                  >
                    {projectorMode ? (
                      <>
                        <Minimize2 className="w-4 h-4" />
                        <span>Exit Projector</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-4 h-4" />
                        <span>Projector Mode</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setQrPoll(selectedPoll)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      isLight
                        ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                        : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/30'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Show QR</span>
                  </button>
                  <button
                    onClick={() => setShowPdfReport(true)}
                    disabled={responses.length === 0}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border disabled:opacity-40 transition cursor-pointer ${
                      isLight
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Results PDF</span>
                  </button>
                  <button
                    onClick={() => fetchResults(selectedPoll)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh</span>
                  </button>
                  <button
                    onClick={() => handleResetResponses(selectedPoll)}
                    disabled={responses.length === 0}
                    className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 text-red-600 border border-red-500/20 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {loadingResults ? (
                <p className={`text-center py-12 text-sm font-medium ${bodySubtext}`}>
                  Loading results...
                </p>
              ) : (
                <div className="space-y-6">
                  {pollQuestions
                    .filter(
                      (q) =>
                        !(
                          q.question_type === 'text' &&
                          String(q.question_text || '').startsWith(FEEDBACK_PREFIX)
                        )
                    )
                    .map((q, index) => {
                      const rawIndex = pollQuestions.findIndex((item) => item.id === q.id);
                      const summary = buildQuestionSummary(
                        q,
                        rawIndex >= 0 ? rawIndex : index,
                        pollQuestions,
                        responses
                      );

                      return (
                        <div
                          key={q.id}
                          className={`border rounded-2xl ${cardBg} ${
                            projectorMode ? 'p-7 sm:p-8' : 'p-6'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <h3
                              className={`font-semibold ${headingText} ${
                                projectorMode ? 'text-xl sm:text-2xl' : 'text-base'
                              }`}
                            >
                              <span className="text-indigo-600 mr-2">{index + 1}.</span>
                              {cleanFeedbackLabel(q.question_text)}
                            </h3>
                            <span
                              className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${
                                isLight
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-slate-800 text-slate-200'
                              }`}
                            >
                              {summary.total} {summary.total === 1 ? 'response' : 'responses'}
                            </span>
                          </div>

                          <p
                            className={`text-sm font-semibold rounded-xl px-3.5 py-2.5 mb-4 border ${
                              isLight
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25'
                            }`}
                          >
                            {summary.headline}
                          </p>

                          {summary.breakdown.length > 0 && (
                            <div className="space-y-3.5">
                              {summary.breakdown.map((row, idx) => (
                                <div key={idx}>
                                  <div
                                    className={`flex justify-between items-center mb-1.5 ${
                                      projectorMode ? 'text-lg' : 'text-sm'
                                    }`}
                                  >
                                    <span className={`font-medium ${headingText}`}>{row.label}</span>
                                    <span
                                      className={`text-xs sm:text-sm font-semibold px-2.5 py-0.5 rounded-full border ${
                                        isLight
                                          ? 'bg-slate-100 text-slate-800 border-slate-200'
                                          : 'bg-slate-800 text-slate-200 border-slate-700'
                                      }`}
                                    >
                                      {row.votes} ({row.pct}%)
                                    </span>
                                  </div>
                                  <div
                                    className={`w-full rounded-full overflow-hidden border ${
                                      isLight
                                        ? 'bg-slate-100 border-slate-200'
                                        : 'bg-[#0B0F19] border-slate-800'
                                    } ${projectorMode ? 'h-4' : 'h-2.5'}`}
                                  >
                                    <div
                                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-500"
                                      style={{ width: `${row.pct}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {summary.feedbackNotes.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2 max-h-80 overflow-y-auto pr-1">
                              <p className={`text-xs font-bold uppercase tracking-wider ${coloredLabel}`}>
                                Feedback
                              </p>
                              {summary.feedbackNotes.map((note, idx) => (
                                <div
                                  key={idx}
                                  className={`border rounded-xl ${fieldBg} ${
                                    projectorMode ? 'p-4 text-base' : 'p-3 text-sm'
                                  }`}
                                >
                                  <span className="text-xs font-bold text-indigo-600 mr-2">
                                    #{idx + 1}
                                  </span>
                                  <span>{note}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: CHARTS & OVERALL ANALYSIS */}
          {view === 'analytics' && (
            <div className="space-y-6">
              <UniversalBackButton label="Back to Overview" />

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${headingText}`}>
                    Charts & Overall Analysis
                  </h2>
                  <p className={`text-sm font-medium mt-1 ${bodySubtext}`}>
                    Whole-workspace engagement overview plus visual pie and bar charts for every
                    poll.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fetchAllPollsData(polls, false)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh Charts</span>
                </button>
              </div>

              <div className={`border rounded-2xl p-6 space-y-6 ${cardBg}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className={coloredLabel}>Whole Analysis • All Polls Combined</p>
                    <h3 className={`text-lg font-bold mt-0.5 ${headingText}`}>
                      Overall Classroom Engagement
                    </h3>
                  </div>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                      isLight
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                    }`}
                  >
                    {totalGlobalResponses} Total Anonymous Votes
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div
                    className={`rounded-xl p-4 border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0F19] border-slate-800'
                    }`}
                  >
                    <p className={`text-xs font-semibold ${bodySubtext}`}>Total Polls Created</p>
                    <p className={`text-2xl font-bold mt-1 ${headingText}`}>{polls.length}</p>
                  </div>
                  <div
                    className={`rounded-xl p-4 border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0F19] border-slate-800'
                    }`}
                  >
                    <p className={`text-xs font-semibold ${bodySubtext}`}>Total Responses Collected</p>
                    <p className="text-2xl font-bold mt-1 text-indigo-600">{totalGlobalResponses}</p>
                  </div>
                  <div
                    className={`rounded-xl p-4 border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0F19] border-slate-800'
                    }`}
                  >
                    <p className={`text-xs font-semibold ${bodySubtext}`}>Average Votes / Poll</p>
                    <p className="text-2xl font-bold mt-1 text-emerald-600">
                      {polls.length > 0
                        ? (totalGlobalResponses / polls.length).toFixed(1)
                        : '0.0'}
                    </p>
                  </div>
                </div>

                {polls.length > 0 && (() => {
                  const overallBreakdown = polls.map((p) => {
                    const votes = (allResponsesMap[p.id] || []).length;
                    const pct =
                      totalGlobalResponses > 0
                        ? Math.round((votes / totalGlobalResponses) * 100)
                        : 0;
                    return { id: p.id, label: p.title, votes, pct };
                  });

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
                      <div className="md:col-span-4 flex flex-col items-center justify-center">
                        <div
                          className="w-36 h-36 rounded-full flex items-center justify-center shadow-inner"
                          style={{ background: buildPieGradient(overallBreakdown) }}
                        >
                          <div
                            className={`w-20 h-20 rounded-full flex flex-col items-center justify-center text-center ${
                              isLight ? 'bg-white' : 'bg-[#0B0F19]'
                            }`}
                          >
                            <span className={`text-base font-extrabold ${headingText}`}>
                              {totalGlobalResponses}
                            </span>
                            <span className={`text-[10px] font-semibold ${bodySubtext}`}>
                              total votes
                            </span>
                          </div>
                        </div>
                        <p className={`text-[11px] font-semibold mt-2.5 ${bodySubtext}`}>
                          Vote Share Across Polls
                        </p>
                      </div>

                      <div className="md:col-span-8 space-y-3">
                        <p className={`text-xs font-bold uppercase tracking-wider ${coloredLabel}`}>
                          Response Volume & Share by Poll
                        </p>
                        {overallBreakdown.map((item, idx) => {
                          const barColor = CHART_COLORS[idx % CHART_COLORS.length];
                          const widthPct = Math.round((item.votes / maxPollResponseCount) * 100);
                          return (
                            <div key={item.id}>
                              <div className="flex items-center justify-between text-xs sm:text-sm mb-1">
                                <span className="inline-flex items-center gap-2 font-semibold truncate pr-3">
                                  <span
                                    className="w-3 h-3 rounded-full shrink-0"
                                    style={{ backgroundColor: barColor }}
                                  />
                                  <span className={`truncate ${headingText}`}>{item.label}</span>
                                </span>
                                <span className={`font-bold shrink-0 ${bodySubtext}`}>
                                  {item.votes} {item.votes === 1 ? 'vote' : 'votes'} ({item.pct}%)
                                </span>
                              </div>
                              <div
                                className={`w-full h-2.5 rounded-full overflow-hidden border ${
                                  isLight
                                    ? 'bg-slate-100 border-slate-200'
                                    : 'bg-[#0B0F19] border-slate-800'
                                }`}
                              >
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${widthPct}%`,
                                    backgroundColor: barColor,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {polls.length === 0 ? (
                <div className={`border rounded-2xl p-10 text-center ${cardBg}`}>
                  <p className={`font-semibold ${headingText}`}>No polls available yet</p>
                  <p className={`text-sm mt-1 ${bodySubtext}`}>
                    Create a poll first to inspect per-question pie and bar charts.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div
                    className={`border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${cardBg}`}
                  >
                    <div>
                      <label className={`block ${coloredLabel}`}>
                        Select Poll for Question Charts
                      </label>
                      <p className={`text-xs font-medium mt-0.5 ${bodySubtext}`}>
                        Switch between your polls to inspect pie & bar distributions
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <select
                        value={activeAnalyticsPoll?.id || ''}
                        onChange={(e) => setAnalyticsPollId(e.target.value)}
                        className={`border rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-indigo-500 ${fieldBg}`}
                      >
                        {polls.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} ({(allResponsesMap[p.id] || []).length} votes)
                          </option>
                        ))}
                      </select>

                      {activeAnalyticsPoll && (
                        <button
                          type="button"
                          onClick={() => fetchResults(activeAnalyticsPoll)}
                          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Open Results & PDF</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {loadingGlobal ? (
                    <p className={`text-center py-10 text-sm font-medium ${bodySubtext}`}>
                      Loading charts...
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-5">
                      {activeAnalyticsQuestions
                        .filter(
                          (q) =>
                            !(
                              q.question_type === 'text' &&
                              String(q.question_text || '').startsWith(FEEDBACK_PREFIX)
                            )
                        )
                        .map((q, idx) => {
                          const rawIndex = activeAnalyticsQuestions.findIndex(
                            (item) => item.id === q.id
                          );
                          const summary = buildQuestionSummary(
                            q,
                            rawIndex >= 0 ? rawIndex : idx,
                            activeAnalyticsQuestions,
                            activeAnalyticsResponses
                          );
                          return (
                            <div key={q.id} className={`border rounded-2xl p-6 ${cardBg}`}>
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                <h3 className={`text-base sm:text-lg font-bold ${headingText}`}>
                                  <span className="text-indigo-600 mr-2">Q{idx + 1}.</span>
                                  {cleanFeedbackLabel(q.question_text)}
                                </h3>
                                <span
                                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                    isLight
                                      ? 'bg-slate-100 text-slate-700'
                                      : 'bg-slate-800 text-slate-200'
                                  }`}
                                >
                                  {summary.total} {summary.total === 1 ? 'response' : 'responses'}
                                </span>
                              </div>

                              <p
                                className={`text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-2 mb-5 border ${
                                  isLight
                                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                    : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25'
                                }`}
                              >
                                {summary.headline}
                              </p>

                              {summary.breakdown.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                  <div className="md:col-span-4 flex flex-col items-center justify-center">
                                    <div
                                      className="w-36 h-36 rounded-full flex items-center justify-center shadow-inner"
                                      style={{ background: buildPieGradient(summary.breakdown) }}
                                    >
                                      <div
                                        className={`w-20 h-20 rounded-full flex flex-col items-center justify-center text-center ${
                                          isLight ? 'bg-white' : 'bg-[#0B0F19]'
                                        }`}
                                      >
                                        <span className={`text-base font-extrabold ${headingText}`}>
                                          {summary.total}
                                        </span>
                                        <span className={`text-[10px] font-semibold ${bodySubtext}`}>
                                          votes
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="md:col-span-8 space-y-3">
                                    {summary.breakdown.map((row, bIdx) => {
                                      const sliceColor = CHART_COLORS[bIdx % CHART_COLORS.length];
                                      return (
                                        <div key={bIdx}>
                                          <div className="flex items-center justify-between text-xs sm:text-sm mb-1">
                                            <span className="inline-flex items-center gap-2 font-semibold">
                                              <span
                                                className="w-3 h-3 rounded-full shrink-0"
                                                style={{ backgroundColor: sliceColor }}
                                              />
                                              <span className={headingText}>{row.label}</span>
                                            </span>
                                            <span className={`font-bold ${bodySubtext}`}>
                                              {row.votes} ({row.pct}%)
                                            </span>
                                          </div>
                                          <div
                                            className={`w-full h-2.5 rounded-full overflow-hidden border ${
                                              isLight
                                                ? 'bg-slate-100 border-slate-200'
                                                : 'bg-[#0B0F19] border-slate-800'
                                            }`}
                                          >
                                            <div
                                              className="h-full rounded-full transition-all duration-500"
                                              style={{
                                                width: `${row.pct}%`,
                                                backgroundColor: sliceColor,
                                              }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : summary.feedbackNotes.length > 0 ? (
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                  {summary.feedbackNotes.map((note, nIdx) => (
                                    <div
                                      key={nIdx}
                                      className={`border rounded-xl p-3 text-xs sm:text-sm ${fieldBg}`}
                                    >
                                      <span className="font-bold text-indigo-600 mr-2">
                                        #{nIdx + 1}
                                      </span>
                                      <span>{note}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className={`text-xs font-medium ${bodySubtext}`}>
                                  No feedback submitted yet.
                                </p>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VIEW 5: LIVE SESSION MANAGER (ONLY ACTIVE POLLS APPEAR HERE) */}
          {view === 'session' && (
            <div className="space-y-6">
              <UniversalBackButton label="Back to Overview" />

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${headingText}`}>
                    Classroom Live Session
                  </h2>
                  <p className={`text-sm font-medium mt-1 ${bodySubtext}`}>
                    Shows only active polls. Closing a poll in Overview immediately removes it from
                    here.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fetchAllPollsData(polls, false)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Sync Counts</span>
                </button>
              </div>

              <div className="grid gap-4">
                {activePolls.length === 0 ? (
                  <div className={`border rounded-2xl p-10 text-center ${cardBg}`}>
                    <p className={`font-semibold ${headingText}`}>No active polls in session</p>
                    <p className={`text-xs font-medium mt-1 ${bodySubtext}`}>
                      All polls are closed or none are currently running.
                    </p>
                  </div>
                ) : (
                  activePolls.map((poll) => {
                    const count = (allResponsesMap[poll.id] || []).length;
                    return (
                      <div
                        key={poll.id}
                        className={`border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${cardBg}`}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              {poll.status}
                            </span>
                            <span className="text-xs font-bold text-indigo-600">
                              {count} {count === 1 ? 'vote' : 'votes'} recorded
                            </span>
                          </div>
                          <h3 className={`text-base sm:text-lg font-bold ${headingText}`}>
                            {poll.title}
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQrPoll(poll)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                              isLight
                                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                                : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/30'
                            }`}
                          >
                            <QrCode className="w-4 h-4" />
                            <span>Project QR</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => copyCardLink(poll.id)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                              isLight
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                            }`}
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            <span>{copiedCardId === poll.id ? 'Copied!' : 'Copy Link'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleStatus(poll)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                              isLight
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>End Poll</span>
                          </button>

                          <button
                            type="button"
                            disabled={count === 0}
                            onClick={() => handleResetResponses(poll, count)}
                            className="inline-flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 text-red-600 border border-red-500/20 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset to 0</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* VIEW 6: SETTINGS */}
          {view === 'settings' && (
            <div className="w-full space-y-6">
              <UniversalBackButton label="Back to Overview" />

              <div>
                <h2 className={`text-2xl font-bold ${headingText}`}>Faculty Settings</h2>
                <p className={`text-sm font-medium mt-1 ${bodySubtext}`}>
                  Customize your profile display name, theme, and default poll behavior.
                </p>
              </div>

              {settingsNotice.text && (
                <div
                  className={`p-3.5 rounded-2xl text-sm font-semibold border ${
                    settingsNotice.type === 'error'
                      ? 'bg-red-500/10 border-red-500/30 text-red-600'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                  }`}
                >
                  {settingsNotice.text}
                </div>
              )}

              <div
                className={`border rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${cardBg}`}
              >
                <div>
                  <h3 className={`text-base font-bold ${headingText}`}>Appearance</h3>
                  <p className={`text-sm font-medium mt-0.5 ${bodySubtext}`}>
                    Switch between crisp light mode and dark indigo for your dashboard.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                  className={`inline-flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl border transition cursor-pointer shrink-0 ${
                    isLight
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700'
                  }`}
                >
                  {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-300" />}
                  <span>{isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}</span>
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-5">
                <div className={`border rounded-2xl p-6 space-y-4 ${cardBg}`}>
                  <h3 className={`text-base font-bold ${headingText}`}>Profile & Workspace</h3>

                  <div>
                    <label className={`block mb-1.5 ${coloredLabel}`}>
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g., Rifa"
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 ${fieldBg}`}
                    />
                  </div>

                  <div>
                    <label className={`block mb-1.5 ${coloredLabel}`}>
                      Verified College Email
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={user?.email || ''}
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm font-semibold opacity-90 cursor-not-allowed ${fieldBg}`}
                    />
                  </div>
                </div>

                <div className={`border rounded-2xl p-6 space-y-4 ${cardBg}`}>
                  <h3 className={`text-base font-bold ${headingText}`}>Default Poll Preferences</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block mb-1.5 ${coloredLabel}`}>Default Category</label>
                      <select
                        value={defaultCategory}
                        onChange={(e) => setDefaultCategory(e.target.value)}
                        className={`w-full border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 ${fieldBg}`}
                      >
                        <option value="Poll">Quick Poll</option>
                        <option value="Feedback">Class Feedback</option>
                        <option value="Survey">Survey</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block mb-1.5 ${coloredLabel}`}>
                        Initial Status on Create
                      </label>
                      <select
                        value={defaultStatus}
                        onChange={(e) => setDefaultStatus(e.target.value)}
                        className={`w-full border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 ${fieldBg}`}
                      >
                        <option value="Active">Active Immediately</option>
                        <option value="Closed">Closed (Draft until opened)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </form>

              <div
                className={`border rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${cardBg}`}
              >
                <div>
                  <h3 className={`text-base font-bold ${headingText}`}>Security</h3>
                  <p className={`text-sm font-medium mt-0.5 ${bodySubtext}`}>
                    Send a password reset email to {user?.email || 'your verified college address'}.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={sendingReset}
                  onClick={handleSendPasswordReset}
                  className={`inline-flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl border disabled:opacity-50 transition cursor-pointer shrink-0 ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{sendingReset ? 'Sending...' : 'Reset Password'}</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* IN-PAGE LIGHT DELETE CONFIRMATION POPUP */}
      {pollToDelete && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Delete Poll?</h3>
              </div>
              <button
                type="button"
                onClick={() => setPollToDelete(null)}
                disabled={deletingPoll}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Delete <strong className="text-slate-900">"{pollToDelete.title}"</strong> and all its
              student responses permanently?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPollToDelete(null)}
                disabled={deletingPoll}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePoll}
                disabled={deletingPoll}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white transition cursor-pointer"
              >
                {deletingPoll ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT DOWNLOADABLE RESULTS PDF MODAL */}
      {showPdfReport && selectedPoll && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <Logo className="w-8 h-8 shrink-0" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    SaySphere • Poll Results PDF
                  </p>
                  <p className="text-xs text-slate-600">
                    Downloads a formatted A4 results PDF with visual charts & overall analysis
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfReport(false)}
                  className="p-2 text-slate-500 hover:text-slate-900 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">{selectedPoll.title}</h2>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-700 mt-3 pt-3 border-t border-slate-200">
                <span>
                  <strong>Total Responses:</strong> {responses.length} (Anonymous)
                </span>
                <span>
                  <strong>Questions:</strong>{' '}
                  {
                    pollQuestions.filter(
                      (q) =>
                        !(
                          q.question_type === 'text' &&
                          String(q.question_text || '').startsWith(FEEDBACK_PREFIX)
                        )
                    ).length
                  }
                </span>
                <span>
                  <strong>Created:</strong> {formatCreatedDate(selectedPoll.created_at)}
                </span>
                <span>
                  <strong>Faculty:</strong> {displayName.trim() || 'Faculty Member'}
                </span>
              </div>
            </div>

            <div className="space-y-5">
              {pollQuestions
                .filter(
                  (q) =>
                    !(
                      q.question_type === 'text' &&
                      String(q.question_text || '').startsWith(FEEDBACK_PREFIX)
                    )
                )
                .map((q, idx) => {
                  const rawIndex = pollQuestions.findIndex((item) => item.id === q.id);
                  const summary = buildQuestionSummary(
                    q,
                    rawIndex >= 0 ? rawIndex : idx,
                    pollQuestions,
                    responses
                  );
                  return (
                    <div
                      key={q.id}
                      className="border border-slate-200 rounded-2xl p-5 bg-slate-50/70"
                    >
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                        Q{idx + 1}. {cleanFeedbackLabel(q.question_text)}
                      </h3>
                      <p className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 mt-2.5">
                        {summary.headline}
                      </p>

                      {summary.breakdown.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {summary.breakdown.map((row, rIdx) => {
                            const barColor = CHART_COLORS[rIdx % CHART_COLORS.length];
                            return (
                              <div
                                key={rIdx}
                                className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5"
                              >
                                <div className="flex items-center justify-between text-xs text-slate-700 mb-1.5">
                                  <span className="inline-flex items-center gap-2 font-medium">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0"
                                      style={{ backgroundColor: barColor }}
                                    />
                                    <span>{row.label}</span>
                                  </span>
                                  <span className="font-semibold text-slate-900">
                                    {row.votes} ({row.pct}%)
                                  </span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${row.pct}%`,
                                      backgroundColor: barColor,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {summary.feedbackNotes.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                            Feedback
                          </p>
                          {summary.feedbackNotes.map((note, nIdx) => (
                            <div
                              key={nIdx}
                              className="text-xs text-slate-800 bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5"
                            >
                              <strong className="text-indigo-700 mr-1.5">#{nIdx + 1}</strong>
                              <span>{note}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* QR CODE MODAL (Projector Friendly) */}
      {qrPoll && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className={`border rounded-3xl max-w-md w-full p-8 text-center relative shadow-2xl ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <button
              onClick={() => setQrPoll(null)}
              className={`absolute top-4 right-4 p-2 cursor-pointer ${bodySubtext}`}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold mb-1">{qrPoll.title}</h3>
            <p className={`text-xs font-medium mb-6 ${bodySubtext}`}>
              Scan this QR code to submit your anonymous response
            </p>

            <div className="bg-white p-5 rounded-2xl inline-block mb-6 shadow-lg">
              <QRCodeSVG value={getPollUrl(qrPoll.id)} size={240} />
            </div>

            <div className={`flex items-center gap-2 border rounded-xl p-2 ${fieldBg}`}>
              <input
                type="text"
                readOnly
                value={getPollUrl(qrPoll.id)}
                className="flex-1 bg-transparent text-xs px-2 focus:outline-none"
              />
              <button
                onClick={() => copyLink(qrPoll.id)}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}