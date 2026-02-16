// src/db.js (ES module)
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB path (project-root/data/bookings.db)
const DB_PATH = process.env.GALLERY_DB_PATH
  || path.join(__dirname, "..", "data", "gallery.db");
  console.log("🟢 USING GALLERY DB:", DB_PATH);


// ensure data dir exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// open DB (synchronous)
const db = new Database(DB_PATH, { timeout: 5000 });

try {
  db.pragma("journal_mode = WAL");
} catch (e) {
  console.warn("⚠ WAL mode not set:", e.message);
}

db.pragma("busy_timeout = 5000");



// create bookings table if not exists
db.exec(`
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  booking_type TEXT NOT NULL,
  car_type TEXT NOT NULL,
  num_days INTEGER,
  date TEXT,
  time TEXT,
  pickup TEXT,
  notes TEXT,
  service TEXT,
  source TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
// 🔹 Ensure driver columns exist (safe migration)

try { db.exec("ALTER TABLE bookings ADD COLUMN driver_name TEXT"); } catch {}
try { db.exec("ALTER TABLE bookings ADD COLUMN driver_phone TEXT"); } catch {}
try { db.exec("ALTER TABLE bookings ADD COLUMN vehicle_type TEXT"); } catch {}
try { db.exec("ALTER TABLE bookings ADD COLUMN vehicle_number TEXT"); } catch {}
try { db.exec("ALTER TABLE bookings ADD COLUMN vehicle_color TEXT"); } catch {}


// create gallery table if not exists
db.exec(`
CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT,
  filepath TEXT,
  title TEXT,
  description TEXT,
  type TEXT,
  uploaded_by TEXT,
  category TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

export default db;
