// scripts/create-admin-table-and-seed.js
// Run: node scripts/create-admin-table-and-seed.js
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// adjust if your DB path is different; this matches the DB path used earlier
const DB_PATH = process.env.BOOKING_DB_PATH || path.join(__dirname, "..", "data", "bookings.db");

console.log("Using DB:", DB_PATH);

const db = new Database(DB_PATH);

// 1) create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("Ensured admins table exists.");

// 2) optionally seed an admin if none exist
const row = db.prepare("SELECT COUNT(1) AS cnt FROM admins").get();
if (row && row.cnt === 0) {
  // read seed credentials from env OR use defaults (change these before running in production)
  const email = process.env.ADMIN_EMAIL || "admin@radha.com";
  const pass = process.env.ADMIN_PASS || "Admin123";
  const name = process.env.ADMIN_NAME || "Radha Admin";

  // bcrypt is async-ish; use bcryptjs synchronously for simplicity
  const bcrypt = await import("bcryptjs");
  const hash = bcrypt.hashSync(pass, 10);

  const info = db.prepare("INSERT INTO admins (email, password_hash, name) VALUES (?, ?, ?)").run(email, hash, name);
  console.log("Seeded admin:", { id: info.lastInsertRowid || info.lastID, email, name });
} else {
  console.log("Admins table already has entries — no seed performed.");
}

db.close();
console.log("Done.");
