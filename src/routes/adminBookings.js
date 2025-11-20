// src/routes/adminBookings.js
// ES module — matches your project style
import express from "express";
import db from "../db.js";             // your better-sqlite3 instance
import { sendDriverAllotmentEmail } from "../mailer.js"; // mailer function you already have
import authAdmin from "../middleware/authAdmin.js";


const router = express.Router();

/*
  PUT /admin/bookings/:bookingId/allot
  Body: { driver: { name, phone, id? }, vehicle: { model, regNo, id? }, allottedBy?: <admin_id_number> }
  - bookingId is the booking.booking_id (text)
*/
router.put("/bookings/:bookingId/allot", authAdmin, async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const { driver, vehicle, allottedBy } = req.body || {};

    if (!driver || !driver.name || !driver.phone) {
      return res.status(400).json({ ok: false, error: "driver name & phone required" });
    }
    if (!vehicle || !vehicle.model || !vehicle.regNo) {
      return res.status(400).json({ ok: false, error: "vehicle model & regNo required" });
    }

    // 1) fetch booking by booking_id
    const row = db.prepare("SELECT * FROM bookings WHERE booking_id = ?").get(bookingId);
    if (!row) return res.status(404).json({ ok: false, error: "booking not found" });

    const now = new Date().toISOString();

    // 2) update booking columns (use exact column names from your schema)
    const stmt = db.prepare(`
      UPDATE bookings SET
        driver_name = ?,
        driver_phone = ?,
        driver_id = ?,
        vehicle_model = ?,
        vehicle_regno = ?,
        vehicle_id = ?,
        status = ?,
        allotted_by = ?,
        allotted_at = ?
      WHERE booking_id = ?
    `);

    const info = stmt.run(
      driver.name,
      driver.phone,
      driver.id || null,
      vehicle.model,
      vehicle.regNo,
      vehicle.id || null,
      "allotted",
      allottedBy || null,
      now,
      bookingId
    );

    // 3) re-fetch updated booking row
    const updated = db.prepare("SELECT * FROM bookings WHERE booking_id = ?").get(bookingId);

    // 4) map DB row to the shape your mailer expects
    // mailer expects booking.bookingId, booking.fullName, booking.email etc.
    const bookingForMailer = {
      id: updated.id,
      bookingId: updated.booking_id,
      fullName: updated.full_name,
      phone: updated.phone,
      email: updated.email,
      booking_type: updated.booking_type,
      car_type: updated.car_type,
      date: updated.date,
      time: updated.time,
      pickup: updated.pickup,
      notes: updated.notes,
      status: updated.status,
      created_at: updated.created_at,
      // include driver/vehicle fields too (mailer templates may use them)
      driver_name: updated.driver_name,
      driver_phone: updated.driver_phone,
      vehicle_model: updated.vehicle_model,
      vehicle_regno: updated.vehicle_regno,
    };

    // 5) call mailer (your function signature is sendDriverAllotmentEmail(booking, driver, vehicle))
    const mailResult = await sendDriverAllotmentEmail(
      bookingForMailer,
      { name: driver.name, phone: driver.phone, id: driver.id || null },
      { model: vehicle.model, regNo: vehicle.regNo, id: vehicle.id || null }
    );

    if (!mailResult || mailResult.ok === false) {
      // Mail failed but update succeeded — return 200 with warning
      return res.status(200).json({
        ok: true,
        message: "booking allotted, but email failed",
        booking: bookingForMailer,
        mailResult
      });
    }

    return res.json({ ok: true, message: "booking allotted and user notified", booking: bookingForMailer, mailResult });
  } catch (err) {
    console.error("adminBookings/allot error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
