// scripts/readBookings.js
import dbImported from "../src/db.js";

async function getDb() {
  if (!dbImported) throw new Error("DB not loaded");
  if (typeof dbImported.then === "function") return await dbImported;
  return dbImported;
}

(async () => {
  try {
    const db = await getDb();

    const rows = db.prepare("SELECT booking_id, full_name, phone, email, created_at FROM bookings ORDER BY created_at DESC LIMIT 20").all();

    console.log("\n=== LAST 20 BOOKINGS ===\n");
    console.table(rows);
    console.log("\n========================\n");
  } catch (err) {
    console.error("readBookings error:", err);
  }
})();
