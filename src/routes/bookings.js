// src/routes/bookings.js
import express from "express";
import dbImported from "../db.js"; // may be a db Promise or a db instance
import db from "../db.js";
import { nanoid } from "nanoid";
import validator from "validator";
import { sendBookingConfirmation } from "../mailer.js";
// import Booking from "../db.js";
import { sendDriverAllotmentEmail } from "../mailer.js";

const router = express.Router();

/**
 * Normalize DB: if dbImported is a Promise, await it; otherwise return it.
 */
async function getDb() {
  if (!dbImported) throw new Error("Database not initialized");
  if (typeof dbImported.then === "function") {
    return await dbImported;
  }
  return dbImported;
}

/* generate booking id: RTYYMMDD-XXXX */
function genBookingId() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = nanoid(6).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  return `RT${yy}${mm}${dd}-${rand}`;
}

/**
 * Insert booking into DB and return insertion meta { lastId, stmtInfo }
 * This helper attempts to support multiple sqlite JS APIs.
 */
async function insertBooking(db, params) {
  const sql = `INSERT INTO bookings
    (booking_id, full_name, phone, email, booking_type, car_type, num_days, date, time, pickup, notes, service, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    params.booking_id,
    params.full_name,
    params.phone,
    params.email,
    params.booking_type,
    params.car_type,
    params.num_days,
    params.date,
    params.time,
    params.pickup,
    params.notes,
    params.service,
    params.source,
    params.created_at,
  ];

  // If db.prepare exists and returns a statement with run(), use it
  try {
    if (typeof db.prepare === "function") {
      // some sqlite wrappers (better-sqlite3) return run result directly
      const stmt = db.prepare ? db.prepare(sql) : null;
      if (stmt && typeof stmt.run === "function") {
        const info = stmt.run(...values);
        // better-sqlite3 returns object with lastInsertRowid or lastInsertRowid prop might be undefined
        return { lastId: info?.lastInsertRowid ?? info?.lastID ?? (info?.lastInsertRowid), info };
      }
    }
  } catch (err) {
    // fall through to other method
  }

  // If db.run returns a promise (sqlite wrapper), await it
  if (typeof db.run === "function") {
    try {
      const maybePromise = db.run(sql, values);
      // if it returns a promise
      if (typeof maybePromise.then === "function") {
        const result = await maybePromise;
        // sqlite wrapper often returns { lastID, changes }
        return { lastId: result?.lastID ?? result?.lastInsertRowid ?? null, info: result };
      }

      // else it might be callback-style; wrap in promise
      return await new Promise((resolve, reject) => {
        db.run(sql, values, function (err) {
          if (err) return reject(err);
          resolve({ lastId: this?.lastID ?? null, info: { lastID: this?.lastID } });
        });
      });
    } catch (err) {
      throw err;
    }
  }

  // otherwise unsupported DB API
  throw new Error("Unsupported DB API: neither db.prepare nor db.run usable");
}

/* POST /api/bookings */
router.post("/", async (req, res) => {
  try {

    const body = req.body || {};

    const full_name = (body.fullName || body.name || "").trim();
    const phone = (body.phone || "").trim();
    const email = (body.email || "").trim();
    const booking_type = (body.bookingType || body.type || "").trim();
    const car_type = (body.carType || body.car || "").trim();
    const num_days = body.numDays ? (Number(body.numDays) || null) : null;
    const date = body.date || null;
    const time = body.time || null;
    const pickup = body.pickup || null;
    const notes = body.notes || null;
    const service = body.service || null;
    const source = body.source || null;

    // Basic validation
    if (!full_name) return res.status(400).json({ ok: false, error: "fullName required" });
    if (!phone) return res.status(400).json({ ok: false, error: "phone required" });
    if (!booking_type) return res.status(400).json({ ok: false, error: "bookingType required" });
    if (!car_type) return res.status(400).json({ ok: false, error: "carType required" });
    if (email && !validator.isEmail(email)) return res.status(400).json({ ok: false, error: "invalid email" });

    const booking_id = genBookingId();
    // console.log("   generated booking_id:", booking_id, "for phone:", phone);
    const now = new Date().toISOString();

    // get DB instance (handles promise or instance)
    const db = await getDb();

    // insert booking
    let insertResult;
    try {
      insertResult = await insertBooking(db, {
        booking_id,
        full_name,
        phone,
        email,
        booking_type,
        car_type,
        num_days,
        date,
        time,
        pickup,
        notes,
        service,
        source,
        created_at: now,
      });
    } catch (err) {
      console.error("DB insert error:", err);
      return res.status(500).json({ ok: false, error: "db_error", detail: err?.message || String(err) });
    }

    // Reply to client immediately
    const resp = {
      ok: true,
      bookingId: booking_id,
      id: insertResult?.lastId ?? null,
      message: "Booking stored",
    };

    res.json(resp);

    // FIRE-AND-FORGET: send confirmation emails (async)
    (async () => {
      try {
        const bookingObj = {
          bookingId: booking_id,
          fullName: full_name,
          phone,
          email,
          service,
          bookingType: booking_type,
          carType: car_type,
          numDays: num_days,
          date,
          time,
          pickup,
          notes,
          source,
        };

        const mailRes = await sendBookingConfirmation(bookingObj);
        if (!mailRes || !mailRes.ok) {
          console.error("sendBookingConfirmation failed for", booking_id, mailRes);
        } else {
          console.log("Booking email sent:", booking_id);
        }
      } catch (err) {
        console.error("Async mail send error:", err);
      }
    })();

    return;
  } catch (err) {
    console.error("Booking save error:", err);
    return res.status(500).json({ ok: false, error: "server_error", detail: err?.message || String(err) });
  }
});

// POST /api/bookings/assign-driver
router.post("/assign-driver", async (req, res) => {
  try {
    const {
      bookingId,
      driverName,
      driverPhone,
      vehicleType,
      vehicleNumber,
      vehicleColor
    } = req.body;

    if (!bookingId) return res.status(400).json({ ok: false, error: "bookingId required" });

    // fetch booking row from SQLite
    const row = db.prepare("SELECT * FROM bookings WHERE booking_id = ?").get(bookingId);
    if (!row) return res.status(404).json({ ok: false, error: "Booking not found" });

    // update driver & vehicle columns (migration already added these columns)
    db.prepare(`
      UPDATE bookings SET
        driver_name  = ?,
        driver_phone = ?,
        vehicle_type = ?,
        vehicle_number = ?,
        vehicle_color = ?,
        status = 'driver_assigned'
      WHERE booking_id = ?
    `).run(driverName || null, driverPhone || null, vehicleType || null, vehicleNumber || null, vehicleColor || null, bookingId);

    // re-read updated booking row
    const updated = db.prepare("SELECT * FROM bookings WHERE booking_id = ?").get(bookingId);

    // map DB columns to the structure your mailer expects
    const booking = {
      bookingId: updated.booking_id,
      fullName: updated.full_name,
      phone: updated.phone,
      email: updated.email,
      date: updated.date,
      time: updated.time,
      pickup: updated.pickup,
      service: updated.service,
      notes: updated.notes,
      carType: updated.car_type,
      bookingType: updated.booking_type
    };

    const driver = {
      name: updated.driver_name || driverName,
      phone: updated.driver_phone || driverPhone
    };

    const vehicle = {
      type: updated.vehicle_type || vehicleType,
      number: updated.vehicle_number || vehicleNumber,
      color: updated.vehicle_color || vehicleColor
    };

    // send the email (catch errors to still return DB success)
    try {
      await sendDriverAllotmentEmail(booking, driver, vehicle);
    } catch (mailErr) {
      console.error("Driver allotment email failed:", mailErr);
      return res.json({ ok: true, message: "Driver assigned (email failed)", mailError: String(mailErr) });
    }

    return res.json({ ok: true, message: "Driver assigned & email sent" });
  } catch (err) {
    console.error("Driver assignment error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});






export default router;
