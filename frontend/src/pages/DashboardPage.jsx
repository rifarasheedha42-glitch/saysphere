import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function DashboardPage({ token, onLogout }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [question, setQuestion] = useState("");
  const [questionType, setQuestionType] = useState("MCQ");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // QR Modal state
  const [qrSession, setQrSession] = useState(null);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await response.json();
      setSessions(data);
    } catch (err) {
      setError("Failed to load sessions from the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const removeOption = (index) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setError("");

    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }

    let cleanedOptions = [];
    if (questionType === "MCQ") {
      cleanedOptions = options.map((opt) => opt.trim()).filter(Boolean);
      if (cleanedOptions.length < 2) {
        setError("Please provide at least 2 answer options for an MCQ.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: question.trim(),
          questionType,
          options: cleanedOptions,
        }),
      });

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not create session.");
        return;
      }

      setSessions([data, ...sessions]);
      setQuestion("");
      setQuestionType("MCQ");
      setOptions(["", ""]);
      setShowForm(false);
    } catch (err) {
      setError("Could not connect to the backend server.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/feedback/${id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await response.json();
      if (response.ok) {
        setSessions(
          sessions.map((session) =>
            session.id === id ? { ...session, status: data.status } : session
          )
        );
      }
    } catch (err) {
      setError("Failed to update session status.");
    }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById("session-qr-canvas");
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = `feedback-session-${qrSession.id}-qr.png`;
    link.click();
  };

  const openCount = sessions.filter((s) => s.status === "Open").length;
  const totalResponses = sessions.reduce((sum, s) => sum + s.responseCount, 0);

  return (
    <div className="container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.6rem" }}>Admin Dashboard</h1>
          <p style={{ color: "#475569", fontSize: "0.95rem" }}>
            Create feedback sessions, generate QR codes, and view anonymous responses.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "+ New Feedback Session"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="feature-grid" style={{ marginTop: 0, marginBottom: "1.75rem" }}>
        <div className="card">
          <p style={{ color: "#475569", fontSize: "0.88rem" }}>Total Sessions</p>
          <h2 style={{ fontSize: "1.75rem", marginTop: "0.25rem" }}>{sessions.length}</h2>
        </div>
        <div className="card">
          <p style={{ color: "#475569", fontSize: "0.88rem" }}>Open Sessions</p>
          <h2 style={{ fontSize: "1.75rem", marginTop: "0.25rem", color: "#16a34a" }}>
            {openCount}
          </h2>
        </div>
        <div className="card">
          <p style={{ color: "#475569", fontSize: "0.88rem" }}>Total Responses</p>
          <h2 style={{ fontSize: "1.75rem", marginTop: "0.25rem", color: "#2563eb" }}>
            {totalResponses}
          </h2>
        </div>
      </div>

      {/* Create Session Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: "1.75rem" }}>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>
            Create New Feedback Session
          </h2>

          {error && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "0.75rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                fontSize: "0.9rem",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleCreateSession}>
            <div className="form-group">
              <label htmlFor="question">Question</label>
              <textarea
                id="question"
                className="form-control"
                rows="3"
                placeholder="e.g., How clear was today's lecture on Mechatronics sensors?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="questionType">Question Type</label>
              <select
                id="questionType"
                className="form-control"
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
              >
                <option value="MCQ">Multiple Choice Question (MCQ)</option>
                <option value="Paragraph">Paragraph Response</option>
              </select>
            </div>

            {questionType === "MCQ" && (
              <div className="form-group">
                <label>Answer Options</label>
                {options.map((opt, index) => (
                  <div
                    key={index}
                    style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}
                  >
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Option ${index + 1}`}
                      value={opt}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => removeOption(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={addOption}
                  style={{ marginTop: "0.25rem", fontSize: "0.85rem" }}
                >
                  + Add Option
                </button>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : "Save Feedback Session"}
            </button>
          </form>
        </div>
      )}

      {/* Sessions List */}
      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <p style={{ color: "#475569" }}>Loading feedback sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
          <h3 style={{ marginBottom: "0.5rem" }}>No Feedback Sessions Yet</h3>
          <p style={{ color: "#475569", fontSize: "0.95rem" }}>
            Click <strong>+ New Feedback Session</strong> above to create your first question.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {sessions.map((session) => (
            <div key={session.id} className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        padding: "0.2rem 0.6rem",
                        borderRadius: "999px",
                        backgroundColor: "#eff6ff",
                        color: "#1d4ed8",
                      }}
                    >
                      {session.questionType}
                    </span>
                    <span
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        padding: "0.2rem 0.6rem",
                        borderRadius: "999px",
                        backgroundColor:
                          session.status === "Open" ? "#dcfce7" : "#fee2e2",
                        color: session.status === "Open" ? "#15803d" : "#b91c1c",
                      }}
                    >
                      {session.status}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      Created: {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      • {session.responseCount} responses
                    </span>
                  </div>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
                    {session.question}
                  </h3>
                  {session.questionType === "MCQ" && (
                    <ul
                      style={{
                        marginLeft: "1.25rem",
                        color: "#475569",
                        fontSize: "0.9rem",
                      }}
                    >
                      {session.options.map((opt, idx) => (
                        <li key={idx}>{opt}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => setQrSession(session)}
                  >
                    Show QR Code
                  </button>
                  <Link
                    to={`/results/${session.id}`}
                    className="btn btn-secondary"
                  >
                    View Results
                  </Link>
                  <button
                    className="btn btn-secondary"
                    onClick={() => toggleStatus(session.id)}
                  >
                    {session.status === "Open" ? "Close Session" : "Reopen Session"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      {qrSession && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "1rem",
            zIndex: 50,
          }}
          onClick={() => setQrSession(null)}
        >
          <div
            className="card"
            style={{ maxWidth: "420px", width: "100%", textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
              Scan for Anonymous Feedback
            </h2>
            <p style={{ color: "#475569", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              {qrSession.question}
            </p>

            <div
              style={{
                display: "inline-block",
                padding: "1rem",
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                marginBottom: "1rem",
              }}
            >
              <QRCodeCanvas
                id="session-qr-canvas"
                value={`${window.location.origin}/feedback/${qrSession.id}`}
                size={220}
                includeMargin={true}
              />
            </div>

            <p
              style={{
                fontSize: "0.82rem",
                color: "#64748b",
                wordBreak: "break-all",
                marginBottom: "1.25rem",
              }}
            >
              {`${window.location.origin}/feedback/${qrSession.id}`}
            </p>

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={downloadQRCode}>
                Download QR Code
              </button>
              <a
                href={`/feedback/${qrSession.id}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                Open Form
              </a>
              <button
                className="btn btn-secondary"
                onClick={() => setQrSession(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage; 