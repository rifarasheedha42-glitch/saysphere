require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

// Middleware to verify Professor JWT token
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
}

// 1. Admin Login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const admin = db
    .prepare("SELECT * FROM Admin WHERE username = ?")
    .get(username.trim());

  if (!admin || !bcrypt.compareSync(password, admin.hashed_password)) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  const token = jwt.sign(
    { adminId: admin.admin_id, username: admin.username },
    JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({ token, username: admin.username });
});

// 2. Get All Feedback Sessions (Admin)
app.get("/api/feedback", authenticateAdmin, (req, res) => {
  const sessions = db
    .prepare("SELECT * FROM Feedback ORDER BY feedback_id DESC")
    .all();

  const getOptions = db.prepare(
    "SELECT option_id, option_text FROM Options WHERE feedback_id = ?"
  );
  const getCount = db.prepare(
    "SELECT COUNT(*) AS count FROM Responses WHERE feedback_id = ?"
  );

  const result = sessions.map((session) => ({
    id: session.feedback_id,
    question: session.question,
    questionType: session.question_type,
    createdAt: session.creation_date,
    status: session.status,
    options: getOptions.all(session.feedback_id).map((o) => o.option_text),
    responseCount: getCount.get(session.feedback_id).count,
  }));

  res.json(result);
});

// 3. Create Feedback Session (Admin)
app.post("/api/feedback", authenticateAdmin, (req, res) => {
  const { question, questionType, options } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ error: "Question is required." });
  }

  if (questionType !== "MCQ" && questionType !== "Paragraph") {
    return res.status(400).json({ error: "Invalid question type." });
  }

  let cleanedOptions = [];
  if (questionType === "MCQ") {
    if (!Array.isArray(options)) {
      return res.status(400).json({ error: "Options must be a list." });
    }
    cleanedOptions = options.map((o) => String(o).trim()).filter(Boolean);
    if (cleanedOptions.length < 2) {
      return res
        .status(400)
        .json({ error: "Please provide at least 2 options for an MCQ." });
    }
  }

  const creationDate = new Date().toISOString();
  const insertFeedback = db.prepare(
    "INSERT INTO Feedback (question, question_type, creation_date, status) VALUES (?, ?, ?, 'Open')"
  );
  const info = insertFeedback.run(question.trim(), questionType, creationDate);
  const feedbackId = Number(info.lastInsertRowid);

  if (questionType === "MCQ") {
    const insertOption = db.prepare(
      "INSERT INTO Options (feedback_id, option_text) VALUES (?, ?)"
    );
    for (const opt of cleanedOptions) {
      insertOption.run(feedbackId, opt);
    }
  }

  res.status(201).json({
    id: feedbackId,
    question: question.trim(),
    questionType,
    createdAt: creationDate,
    status: "Open",
    options: cleanedOptions,
    responseCount: 0,
  });
});

// 4. Toggle Open/Closed Status (Admin)
app.patch("/api/feedback/:id/status", authenticateAdmin, (req, res) => {
  const feedbackId = Number(req.params.id);
  const session = db
    .prepare("SELECT * FROM Feedback WHERE feedback_id = ?")
    .get(feedbackId);

  if (!session) {
    return res.status(404).json({ error: "Feedback session not found." });
  }

  const newStatus = session.status === "Open" ? "Closed" : "Open";
  db.prepare("UPDATE Feedback SET status = ? WHERE feedback_id = ?").run(
    newStatus,
    feedbackId
  );

  res.json({ id: feedbackId, status: newStatus });
});

// 5. Get Results for a Session (Admin)
app.get("/api/feedback/:id/results", authenticateAdmin, (req, res) => {
  const feedbackId = Number(req.params.id);
  const session = db
    .prepare("SELECT * FROM Feedback WHERE feedback_id = ?")
    .get(feedbackId);

  if (!session) {
    return res.status(404).json({ error: "Feedback session not found." });
  }

  const options = db
    .prepare("SELECT option_text FROM Options WHERE feedback_id = ?")
    .all(feedbackId)
    .map((o) => o.option_text);

  const responses = db
    .prepare(
      "SELECT response_id, answer, submission_timestamp FROM Responses WHERE feedback_id = ? ORDER BY response_id DESC"
    )
    .all(feedbackId);

  res.json({
    id: session.feedback_id,
    question: session.question,
    questionType: session.question_type,
    createdAt: session.creation_date,
    status: session.status,
    options,
    responses,
  });
});

// 6. Get Feedback Form for Students (Public - No Login)
app.get("/api/public/feedback/:id", (req, res) => {
  const feedbackId = Number(req.params.id);
  const session = db
    .prepare("SELECT * FROM Feedback WHERE feedback_id = ?")
    .get(feedbackId);

  if (!session) {
    return res.status(404).json({ error: "Feedback session not found." });
  }

  const options = db
    .prepare("SELECT option_text FROM Options WHERE feedback_id = ?")
    .all(feedbackId)
    .map((o) => o.option_text);

  res.json({
    id: session.feedback_id,
    question: session.question,
    questionType: session.question_type,
    status: session.status,
    options,
  });
});

// 7. Submit Anonymous Student Response (Public - No Login, No IP/Identity stored)
app.post("/api/public/feedback/:id/respond", (req, res) => {
  const feedbackId = Number(req.params.id);
  const { answer } = req.body;

  const session = db
    .prepare("SELECT * FROM Feedback WHERE feedback_id = ?")
    .get(feedbackId);

  if (!session) {
    return res.status(404).json({ error: "Feedback session not found." });
  }

  if (session.status !== "Open") {
    return res
      .status(403)
      .json({ error: "This feedback session is currently closed." });
  }

  if (!answer || !String(answer).trim()) {
    return res.status(400).json({ error: "Please provide a response." });
  }

  const trimmedAnswer = String(answer).trim();

  if (session.question_type === "MCQ") {
    const validOptions = db
      .prepare("SELECT option_text FROM Options WHERE feedback_id = ?")
      .all(feedbackId)
      .map((o) => o.option_text);

    if (!validOptions.includes(trimmedAnswer)) {
      return res.status(400).json({ error: "Invalid option selected." });
    }
  }

  const timestamp = new Date().toISOString();
  db.prepare(
    "INSERT INTO Responses (feedback_id, answer, submission_timestamp) VALUES (?, ?, ?)"
  ).run(feedbackId, trimmedAnswer, timestamp);

  res.status(201).json({ message: "Thank you! Your anonymous response has been recorded." });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});