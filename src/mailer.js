// NEW SendGrid-based Mailer
// Fully replaces SMTP. Works 100% on Render.
// Handles: booking confirmation, driver allotment, admin copy.

import fs from "fs";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

// load config
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const BRAND_NAME = process.env.BRAND_NAME || "Radha Travels";
const SITE_URL = process.env.SITE_ORIGIN || "http://localhost:3000";

// init SendGrid
if (!SENDGRID_API_KEY) {
  console.error("❌ SENDGRID_API_KEY missing");
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log("✅ SendGrid mailer initialized");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// paths
const logoPath = path.join(__dirname, "..", "public", "images", "email", "logo.png");

// helper to load image as data URI
function fileToDataUri(fp) {
  try {
    if (!fs.existsSync(fp)) return null;
    const data = fs.readFileSync(fp);
    return `data:image/png;base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

// EJS render helper
async function renderTemplate(name, data = {}) {
  const file = path.join(__dirname, "..", "views", "email", name);
  return await ejs.renderFile(file, data, { async: true });
}

// --- CORE SEND FUNCTION ---
async function sendEmail({ to, subject, html, text }) {
  try {
    const msg = {
      to,
      from: MAIL_FROM,
      subject,
      html,
      text: text || "",
    };

    const res = await sgMail.send(msg);
    console.log("📨 Mail sent:", subject, "→", to);
    return { ok: true, res };
  } catch (err) {
    console.error("❌ sendEmail error:", err && err.response ? err.response.body : err);
    return { ok: false, error: err.message || String(err) };
  }
}

// --- BOOKING CONFIRMATION ---
export async function sendBookingConfirmation(booking) {
  try {
    if (!booking || !booking.bookingId) {
      return { ok: false, error: "invalid booking" };
    }

    const html = await renderTemplate("booking-confirm.ejs", {
      booking,
      brandName: BRAND_NAME,
      siteUrl: SITE_URL,
      logoSrc: fileToDataUri(logoPath),
      bookedOn: new Date(),
    });

    const text = `Your booking ${booking.bookingId} is confirmed.`;

    const results = {};

    // send to customer
    if (booking.email) {
      results.customer = await sendEmail({
        to: booking.email,
        subject: `Your Booking — ${booking.bookingId}`,
        html,
        text,
      });
    }

    // admin copy
    if (ADMIN_EMAIL) {
      results.admin = await sendEmail({
        to: ADMIN_EMAIL,
        subject: `New Booking Received — ${booking.bookingId}`,
        html,
        text,
      });
    }

    return { ok: true, results };
  } catch (err) {
    console.error("sendBookingConfirmation error:", err);
    return { ok: false, error: err.message || String(err) };
  }
}

// --- DRIVER ALLOTMENT ---
export async function sendDriverAllotmentEmail(booking, driver, vehicle) {
  try {
    if (!booking || !booking.bookingId) return { ok: false, error: "invalid booking" };

    const html = await renderTemplate("driver-allotted.ejs", {
      booking,
      driver,
      vehicle,
      brandName: BRAND_NAME,
      siteUrl: SITE_URL,
      logoSrc: fileToDataUri(logoPath),
    });

    const subject = `Driver Assigned — Booking ${booking.bookingId}`;

    return await sendEmail({
      to: booking.email,
      subject,
      html,
      text: `Your driver has been assigned for booking ${booking.bookingId}.`,
    });
  } catch (err) {
    console.error("sendDriverAllotmentEmail error:", err);
    return { ok: false, error: err.message || String(err) };
  }
}

export default { sendBookingConfirmation, sendDriverAllotmentEmail };
