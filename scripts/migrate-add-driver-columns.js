// scripts/migrate-add-driver-columns.js
// Run: node scripts/migrate-add-driver-columns.js
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

const db = new Database(DB_PATH, { readonly: false });

function columnExists(tbl, colName) {
  const rows = db.prepare(`PRAGMA table_info(${tbl})`).all();
  return rows.some(r => r.name === colName);
}

const additions = [
  { name: "driver_name", sql: "ALTER TABLE bookings ADD COLUMN driver_name TEXT" },
  { name: "driver_phone", sql: "ALTER TABLE bookings ADD COLUMN driver_phone TEXT" },
  { name: "driver_id", sql: "ALTER TABLE bookings ADD COLUMN driver_id INTEGER" },
  { name: "vehicle_regno", sql: "ALTER TABLE bookings ADD COLUMN vehicle_regno TEXT" },
  { name: "vehicle_model", sql: "ALTER TABLE bookings ADD COLUMN vehicle_model TEXT" },
  { name: "vehicle_id", sql: "ALTER TABLE bookings ADD COLUMN vehicle_id INTEGER" },
  { name: "allotted_by", sql: "ALTER TABLE bookings ADD COLUMN allotted_by INTEGER" },
  { name: "allotted_at", sql: "ALTER TABLE bookings ADD COLUMN allotted_at TEXT" }
];

console.log("Running migration on DB:", DB_PATH);
let any = false;
for (const a of additions) {
  if (columnExists("bookings", a.name)) {
    console.log(`- Column '${a.name}' exists — skipping.`);
    continue;
  }
  try {
    db.exec(a.sql);
    console.log(`+ Added column '${a.name}'`);
    any = true;
  } catch (err) {
    console.error(`! Failed to add column ${a.name}:`, err.message);
  }
}

if (!any) console.log("No changes needed. Migration complete.");
else console.log("Migration finished. Please verify bookings table schema.");

db.close();
process.exit(0);
