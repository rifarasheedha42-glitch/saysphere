import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function FeedbackPage() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`${API_URL}/api/public/feedback/${id}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Feedback session not found.");
          return;
        }

        setSession(data);
      } catch (err) {
        setError("Could not connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!answer.trim()) {
      setError("Please select or type an answer before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_URL}/api/public/feedback/${id}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answer: answer.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not submit feedback.");
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ maxWidth: "600px" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ color: "#475569" }}>Loading feedback form...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container" style={{ maxWidth: "600px" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <h2 style={{ color: "#dc2626", marginBottom: "0.5rem" }}>
            Session Not Found
          </h2>
          <p style={{ color: "#475569" }}>
            {error || "This feedback link is invalid."}
          </p>
        </div>
      </div>
    );
  }

  if (session.status !== "Open") {
    return (
      <div className="container" style={{ maxWidth: "600px" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <h2 style={{ marginBottom: "0.5rem" }}>Feedback Session Closed</h2>
          <p style={{ color: "#475569" }}>
            The professor is no longer accepting responses for this session.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container" style={{ maxWidth: "600px" }}>
        <div className="card" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
          <h2 style={{ color: "#16a34a", marginBottom: "0.5rem" }}>
            Thank You!
          </h2>
          <p style={{ color: "#475569" }}>
            Your anonymous feedback has been recorded. You may close this tab now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "600px" }}>
      <div className="card">
        <span
          style={{
            display: "inline-block",
            fontSize: "0.78rem",
            fontWeight: 600,
            padding: "0.2rem 0.6rem",
            borderRadius: "999px",
            backgroundColor: "#eff6ff",
            color: "#1d4ed8",
            marginBottom: "0.75rem",
          }}
        >
          Anonymous Feedback • {session.questionType}
        </span>

        <h2 style={{ fontSize: "1.35rem", marginBottom: "1.25rem" }}>
          {session.question}
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

        <form onSubmit={handleSubmit}>
          {session.questionType === "MCQ" ? (
            <div className="form-group">
              {session.options.map((opt, idx) => (
                <label
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.65rem",
                    padding: "0.75rem 1rem",
                    border:
                      answer === opt
                        ? "2px solid #2563eb"
                        : "1px solid #e2e8f0",
                    borderRadius: "8px",
                    marginBottom: "0.6rem",
                    cursor: "pointer",
                    backgroundColor: answer === opt ? "#eff6ff" : "#ffffff",
                    fontWeight: 500,
                  }}
                >
                  <input
                    type="radio"
                    name="mcq-option"
                    value={opt}
                    checked={answer === opt}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="paragraph-answer">Your Feedback</label>
              <textarea
                id="paragraph-answer"
                className="form-control"
                rows="5"
                placeholder="Write your honest feedback here..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Anonymous Feedback"}
          </button>
        </form>
      </div>

      <div className="privacy-banner" style={{ marginTop: "1.25rem" }}>
        <strong>100% Anonymous:</strong> No login, name, roll number, or IP
        address is collected.
      </div>
    </div>
  );
}

export default FeedbackPage;