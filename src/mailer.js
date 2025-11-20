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





// --- ADMIN RESET EMAIL (SendGrid version) ---
export async function sendAdminResetEmail(admin, token) {
  try {
    const origin = process.env.SITE_ORIGIN || "http://localhost:3000";
    const resetUrl = `${origin.replace(/\/$/, "")}/admin/reset.html?token=${encodeURIComponent(token)}`;

    const html = `
      <p>Hello ${admin.name || admin.email},</p>
      <p>You requested to reset your admin password.</p>
      <p>Click this link to reset your password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link is valid for 1 hour.</p>
    `;

    return await sendEmail({
      to: admin.email,
      subject: "Admin password reset",
      html,
      text: `Reset your password here: ${resetUrl}`,
    });

  } catch (err) {
    console.error("sendAdminResetEmail error:", err);
    return { ok: false, error: err.message || String(err) };
  }
}

// ----- helper: build data-URIs for logo + icons -----
function buildImageData() {
  const images = {};
  const logoJpg = path.join(__dirname, "..", "public", "images", "email", "logo.jpg");
  const logoPng = path.join(__dirname, "..", "public", "images", "email", "logo.png");
  const iconsDir = path.join(__dirname, "..", "public", "images", "icons");

  images.logoSrc = fileToDataUri(fs.existsSync(logoJpg) ? logoJpg : (fs.existsSync(logoPng) ? logoPng : null));

  images.facebookSrc  = fileToDataUri(path.join(iconsDir, "facebook.png"));
  images.instagramSrc = fileToDataUri(path.join(iconsDir, "instagram.png"));
  images.whatsappSrc  = fileToDataUri(path.join(iconsDir, "whatsapp.png"));
  images.phoneSrc     = fileToDataUri(path.join(iconsDir, "phone.png"));
  images.xSrc         = fileToDataUri(path.join(iconsDir, "x.png"));

  return images;
}

// ----- sendBookingConfirmation (SendGrid) -----
export async function sendBookingConfirmation(booking) {
  try {
    if (!booking || !booking.bookingId) {
      return { ok: false, error: "invalid booking" };
    }

    const images = buildImageData();
    const bookedOn = new Date();

    const html = await renderTemplate("booking-confirm.ejs", {
      booking,
      brandName: BRAND_NAME || "Radha Travels",
      siteUrl: SITE_URL,
      logoSrc: images.logoSrc,
      facebookSrc: images.facebookSrc,
      instagramSrc: images.instagramSrc,
      whatsappSrc: images.whatsappSrc,
      phoneSrc: images.phoneSrc,
      xSrc: images.xSrc,
      bookedOn
    });

    const text = `${booking.fullName || ''}, we received your booking ${booking.bookingId}.`;

    const results = {};

    // customer
    if (booking.email) {
      const r = await sendEmail({
        to: booking.email,
        subject: `Your Booking — ${booking.bookingId}`,
        html,
        text,
      });
      results.customer = r;
    } else {
      results.customer = { ok: false, reason: "no-customer-email" };
    }

    // admin copy (skip if same as customer)
    if (ADMIN_EMAIL) {
      if (booking.email && booking.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        results.admin = { skipped: true, reason: "admin same as customer" };
      } else {
        const r2 = await sendEmail({
          to: ADMIN_EMAIL,
          subject: `New Booking Received — ${booking.bookingId}`,
          html,
          text,
        });
        results.admin = r2;
      }
    } else {
      results.admin = { ok: false, reason: "no-admin-email" };
    }

    return { ok: true, results };
  } catch (err) {
    console.error("sendBookingConfirmation error:", err);
    return { ok: false, error: err.message || String(err) };
  }
}

// ----- sendDriverAllotmentEmail (SendGrid) -----
export async function sendDriverAllotmentEmail(booking, driver, vehicle) {
  try {
    if (!booking || !booking.bookingId) return { ok: false, error: "invalid booking" };

    const images = buildImageData();

    const html = await renderTemplate("driver-allotted.ejs", {
      booking,
      driver,
      vehicle,
      brandName: BRAND_NAME || "Radha Travels",
      siteUrl: SITE_URL,
      logoSrc: images.logoSrc,
      facebookSrc: images.facebookSrc,
      instagramSrc: images.instagramSrc,
      whatsappSrc: images.whatsappSrc,
      phoneSrc: images.phoneSrc,
      xSrc: images.xSrc
    });

    const subject = `Driver Assigned — Booking ${booking.bookingId}`;

    const result = await sendEmail({
      to: booking.email,
      subject,
      html,
      text: `Your driver has been assigned for booking ${booking.bookingId}.`,
    });

    return result;
  } catch (err) {
    console.error("sendDriverAllotmentEmail error:", err);
    return { ok: false, error: err.message || String(err) };
  }
}

export default { sendBookingConfirmation, sendDriverAllotmentEmail };
