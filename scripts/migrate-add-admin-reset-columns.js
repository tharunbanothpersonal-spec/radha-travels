// scripts/migrate-add-admin-reset-columns.js
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

if (!hasColumn("admins", "reset_token")) {
  db.exec("ALTER TABLE admins ADD COLUMN reset_token TEXT");
  console.log("Added reset_token");
} else console.log("reset_token already exists");

if (!hasColumn("admins", "reset_expires")) {
  db.exec("ALTER TABLE admins ADD COLUMN reset_expires TEXT");
  console.log("Added reset_expires");
} else console.log("reset_expires already exists");

db.close();
console.log("Done.");
