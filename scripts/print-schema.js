import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "..", "data", "bookings.db");

const db = new Database(DB_PATH);
const rows = db.prepare("PRAGMA table_info(bookings)").all();

console.log("== BOOKINGS TABLE SCHEMA ==");
for (const r of rows) {
  console.log(`${r.cid}: ${r.name} | ${r.type} | notnull=${r.notnull} | default=${r.dflt_value}`);
}
db.close();
