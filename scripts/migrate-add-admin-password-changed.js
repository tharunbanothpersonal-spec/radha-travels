// scripts/migrate-add-admin-password-changed.js
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = process.env.BOOKING_DB_PATH || path.join(__dirname, "..", "data", "bookings.db");

if (!fs.existsSync(DB_PATH)) {
  console.error("Database not found at", DB_PATH);
  process.exit(1);
}

const db = new Database(DB_PATH);

function hasColumn(table, col) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some(r => r.name === col);
}

if (!hasColumn("admins", "password_changed_at")) {
  db.exec("ALTER TABLE admins ADD COLUMN password_changed_at TEXT");
  console.log("Added password_changed_at column to admins");
} else {
  console.log("password_changed_at already exists");
}

db.close();
process.exit(0);
