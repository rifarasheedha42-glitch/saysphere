const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "feedback.db");
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec("PRAGMA foreign_keys = ON;");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS Admin (
    admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS Feedback (
    feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK(question_type IN ('MCQ', 'Paragraph')),
    creation_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open', 'Closed'))
  );

  CREATE TABLE IF NOT EXISTS Options (
    option_id INTEGER PRIMARY KEY AUTOINCREMENT,
    feedback_id INTEGER NOT NULL,
    option_text TEXT NOT NULL,
    FOREIGN KEY (feedback_id) REFERENCES Feedback(feedback_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS Responses (
    response_id INTEGER PRIMARY KEY AUTOINCREMENT,
    feedback_id INTEGER NOT NULL,
    answer TEXT NOT NULL,
    submission_timestamp TEXT NOT NULL,
    FOREIGN KEY (feedback_id) REFERENCES Feedback(feedback_id) ON DELETE CASCADE
  );
`);

// Create default professor account if none exists
const existingAdmin = db
  .prepare("SELECT * FROM Admin WHERE username = ?")
  .get("admin");

if (!existingAdmin) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare(
    "INSERT INTO Admin (username, hashed_password) VALUES (?, ?)"
  ).run("admin", hashedPassword);
  console.log("Default admin account created (username: admin)");
}

module.exports = db;