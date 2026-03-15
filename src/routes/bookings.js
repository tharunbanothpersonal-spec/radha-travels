// src/routes/bookings.js

import express from "express";
import db from "../db.js";
import { nanoid } from "nanoid";
import validator from "validator";
import { sendBookingConfirmation, sendDriverAllotmentEmail } from "../mailer.js";

const router = express.Router();

/* generate booking id: RTYYMMDD-XXXX */
function genBookingId() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = nanoid(6).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  return `RT${yy}${mm}${dd}-${rand}`;
}

/* =========================
   CREATE BOOKING
========================= */

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};

    const full_name = (body.fullName || body.name || "").trim();
    const phone = (body.phone || "").trim();
    const email = (body.email || "").trim();
    const booking_type = (body.bookingType || body.type || "").trim();
    const car_type = (body.carType || body.car || "").trim();
    const num_days = body.numDays ? Number(body.numDays) || null : null;
    const date = body.date || null;
    const time = body.time || null;
    const pickup = body.pickup || null;
    const notes = body.notes || null;
    const service = body.service || null;
    const source = body.source || null;

    // validation
    if (!full_name) return res.status(400).json({ ok: false, error: "fullName required" });
    if (!phone) return res.status(400).json({ ok: false, error: "phone required" });
    if (!booking_type) return res.status(400).json({ ok: false, error: "bookingType required" });
    if (!car_type) return res.status(400).json({ ok: false, error: "carType required" });
    if (email && !validator.isEmail(email)) return res.status(400).json({ ok: false, error: "invalid email" });

    const booking_id = genBookingId();
    const now = new Date().toISOString();

    await db.execute({
      sql: `
        INSERT INTO bookings
        (booking_id, full_name, phone, email, booking_type, car_type, num_days, date, time, pickup, notes, service, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
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
        now
      ]
    });

    res.json({
      ok: true,
      bookingId: booking_id,
      message: "Booking stored"
    });

    // async email send
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
          source
        };

        const mailRes = await sendBookingConfirmation(bookingObj);

        if (!mailRes?.ok) {
          console.error("Booking email failed:", booking_id);
        }

      } catch (err) {
        console.error("Async mail send error:", err);
      }
    })();

  } catch (err) {
    console.error("Booking save error:", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

/* =========================
   DRIVER ASSIGNMENT
========================= */

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

    if (!bookingId)
      return res.status(400).json({ ok: false, error: "bookingId required" });

    const bookingRes = await db.execute({
      sql: "SELECT * FROM bookings WHERE booking_id = ?",
      args: [bookingId]
    });

    const bookingRow = bookingRes.rows[0];

    if (!bookingRow)
      return res.status(404).json({ ok: false, error: "Booking not found" });

    await db.execute({
      sql: `
        UPDATE bookings
        SET driver_name = ?, driver_phone = ?, vehicle_type = ?, vehicle_number = ?, vehicle_color = ?, status = 'driver_assigned'
        WHERE booking_id = ?
      `,
      args: [
        driverName || null,
        driverPhone || null,
        vehicleType || null,
        vehicleNumber || null,
        vehicleColor || null,
        bookingId
      ]
    });

    const updatedRes = await db.execute({
      sql: "SELECT * FROM bookings WHERE booking_id = ?",
      args: [bookingId]
    });

    const updated = updatedRes.rows[0];

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
      name: updated.driver_name,
      phone: updated.driver_phone
    };

    const vehicle = {
      type: updated.vehicle_type,
      number: updated.vehicle_number,
      color: updated.vehicle_color
    };

    try {
      await sendDriverAllotmentEmail(booking, driver, vehicle);
    } catch (mailErr) {
      console.error("Driver allotment email failed:", mailErr);
      return res.json({
        ok: true,
        message: "Driver assigned (email failed)"
      });
    }

    res.json({
      ok: true,
      message: "Driver assigned & email sent"
    });

  } catch (err) {
    console.error("Driver assignment error:", err);
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

export default router;