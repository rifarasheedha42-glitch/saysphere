import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function ResultsPage({ token, onLogout }) {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch(`${API_URL}/api/feedback/${id}/results`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          onLogout();
          return;
        }

        const result = await response.json();
        if (!response.ok) {
          setError(result.error || "Could not load results.");
          return;
        }

        setData(result);
      } catch (err) {
        setError("Failed to connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [id, token, onLogout]);

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ color: "#475569" }}>Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: "center" }}>
          <h2 style={{ color: "#dc2626", marginBottom: "0.5rem" }}>Error</h2>
          <p style={{ color: "#475569", marginBottom: "1rem" }}>{error}</p>
          <Link to="/dashboard" className="btn btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const totalResponses = data.responses.length;

  // Count votes for each MCQ option
  const optionCounts = {};
  if (data.questionType === "MCQ") {
    data.options.forEach((opt) => {
      optionCounts[opt] = 0;
    });
    data.responses.forEach((res) => {
      if (optionCounts[res.answer] !== undefined) {
        optionCounts[res.answer] += 1;
      }
    });
  }

  return (
    <div className="container">
      <div style={{ marginBottom: "1.25rem" }}>
        <Link to="/dashboard" className="btn btn-secondary">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
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
            {data.questionType}
          </span>
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              padding: "0.2rem 0.6rem",
              borderRadius: "999px",
              backgroundColor: data.status === "Open" ? "#dcfce7" : "#fee2e2",
              color: data.status === "Open" ? "#15803d" : "#b91c1c",
            }}
          >
            {data.status}
          </span>
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
            • {totalResponses} total responses
          </span>
        </div>
        <h1 style={{ fontSize: "1.5rem" }}>{data.question}</h1>
      </div>

      {totalResponses === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2.5rem" }}>
          <p style={{ color: "#475569" }}>No responses submitted yet.</p>
        </div>
      ) : data.questionType === "MCQ" ? (
        <div className="card">
          <h2 style={{ fontSize: "1.15rem", marginBottom: "1.25rem" }}>
            Response Breakdown
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {data.options.map((opt, idx) => {
              const count = optionCounts[opt] || 0;
              const percentage =
                totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;

              return (
                <div key={idx}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.35rem",
                      fontSize: "0.95rem",
                      fontWeight: 500,
                    }}
                  >
                    <span>{opt}</span>
                    <span style={{ color: "#475569" }}>
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "14px",
                      backgroundColor: "#e2e8f0",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: "100%",
                        backgroundColor: "#2563eb",
                        borderRadius: "999px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {data.responses.map((res, idx) => (
            <div key={res.response_id} className="card">
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#64748b",
                  marginBottom: "0.4rem",
                }}
              >
                Anonymous Response #{totalResponses - idx} •{" "}
                {new Date(res.submission_timestamp).toLocaleString()}
              </div>
              <p style={{ whiteSpace: "pre-wrap" }}>{res.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ResultsPage;