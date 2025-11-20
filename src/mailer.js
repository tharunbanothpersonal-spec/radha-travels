// src/mailer.js
import fs from "fs";
import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || `Radha Travels <no-reply@${SMTP_HOST || "example.com"}>`;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim();
const SITE_URL = (process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, "");
const bookedOn = new Date();   // actual time booking was confirmed

// ===== BRAND CONSTANTS (REQUIRED) =====
const BRAND_NAME = process.env.BRAND_NAME || "Radha Travels";
const MAIL_FROM = process.env.MAIL_FROM || FROM_EMAIL;
const REPLY_TO = process.env.REPLY_TO || MAIL_FROM;
const SUPPORT_PHONE = process.env.SUPPORT_PHONE || "+91 12345 67890";
// ======================================




// file locations expected (relative to project root)
const logoJpg = path.join(__dirname, "..", "public", "images", "email", "logo.jpg");
const logoPng = path.join(__dirname, "..", "public", "images", "email", "logo.png");

// social icons (expected)
const icons = {
  facebook: path.join(__dirname, "..", "public", "images", "icons", "facebook.png"),
  instagram: path.join(__dirname, "..", "public", "images", "icons", "instagram.png"),
  whatsapp: path.join(__dirname, "..", "public", "images", "icons", "whatsapp.png"),
  phone: path.join(__dirname, "..", "public", "images", "icons", "phone.png"),
  x: path.join(__dirname, "..", "public", "images", "icons", "x.png"),
};

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.warn("mailer: SMTP config missing (SMTP_HOST/SMTP_USER/SMTP_PASS). Emails will fail until configured.");
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

// render EJS template
async function renderTemplate(name, data = {}) {
  const file = path.join(__dirname, "..", "views", "email", name);
  return await ejs.renderFile(file, data, { async: true });
}

// read a file as data URI (returns null if missing)
function fileToDataUri(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    // detect mime by extension
    const ext = path.extname(filePath).toLowerCase().replace(".", "");
    const mime = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "application/octet-stream";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch (err) {
    console.error("fileToDataUri error for", filePath, err);
    return null;
  }
}

// build attachments and dataURIs; return object { attachments, logoSrc, facebookSrc, ... }
function prepareImages() {
  const attachments = [];
  const data = {};

  // logo first: prefer jpg then png
  if (fs.existsSync(logoJpg)) {
    attachments.push({ filename: "logo.jpg", path: logoJpg, cid: "logo@rtd" });
    data.logoSrc = fileToDataUri(logoJpg);
  } else if (fs.existsSync(logoPng)) {
    attachments.push({ filename: "logo.png", path: logoPng, cid: "logo@rtd" });
    data.logoSrc = fileToDataUri(logoPng);
  } else {
    data.logoSrc = null;
  }

  // icons (each gets a CID and data URI if present)
  Object.keys(icons).forEach((key) => {
    const p = icons[key];
    if (fs.existsSync(p)) {
      attachments.push({ filename: path.basename(p), path: p, cid: `${key}@rtd` });
      data[`${key}Src`] = fileToDataUri(p);
    } else {
      data[`${key}Src`] = null;
    }
  });

  // Logging so you can see what's attached
  console.log("MAILER: prepareImages -> attachments:", attachments.map(a => a.cid || a.filename));
  Object.keys(data).forEach(k => console.log(`MAILER: image data ${k}:`, !!data[k]));

  return { attachments, data };
}

/**
 * sendBookingConfirmation
 * - attaches images as CIDs and also passes data URIs to template as fallback
 */
export async function sendBookingConfirmation(booking) {
  if (!booking || !booking.bookingId) return { ok: false, error: "invalid booking object" };

  try {
    const { attachments, data } = prepareImages();
    


    // render HTML template — pass fallback src values
    const html = await renderTemplate("booking-confirm.ejs", {
      booking,
      siteUrl: SITE_URL,
      adminEmail: ADMIN_EMAIL,
      bookedOn,
      logoSrc: data.logoSrc,            // use inline data URI if available
      facebookSrc: data.facebookSrc,
      instagramSrc: data.instagramSrc,
      whatsappSrc: data.whatsappSrc,
      phoneSrc: data.phoneSrc,
      xSrc: data.xSrc,
    });

    const text = `${booking.fullName || ''}, we received your booking ${booking.bookingId}.`;

    const results = {};

    // send to customer if email exists
    if (booking.email) {
      const opts = {
        from: FROM_EMAIL,
        to: booking.email,
        subject: `Your Booking — ${booking.bookingId}`,
        text,
        html,
        attachments: attachments.length ? attachments : undefined,
      };
      const info = await transporter.sendMail(opts);
      results.customer = info;
      console.log("MAILER: customer sent", booking.bookingId, booking.email);
    } else {
      results.customer = { ok: false, reason: "no-customer-email" };
      console.log("MAILER: customer skipped (no email) for", booking.bookingId);
    }

    // admin copy (skip if admin equals customer)
    if (ADMIN_EMAIL) {
      if (booking.email && booking.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        results.admin = { skipped: true, reason: "admin same as customer" };
      } else {
        const opts2 = {
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `New Booking: ${booking.bookingId}`,
          text,
          html,
          attachments: attachments.length ? attachments : undefined,
        };
        const info2 = await transporter.sendMail(opts2);
        results.admin = info2;
        console.log("MAILER: admin sent", booking.bookingId, ADMIN_EMAIL);
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


export async function sendDriverAllotmentEmail(booking, driver, vehicle) {
  try {
    if (!booking || !booking.email) {
      console.warn("MAILER: no booking or email for driver allotment", booking && booking.bookingId);
      return { ok: false, error: "missing booking/email" };
    }

    // prepare images (same as booking-confirm uses)
    const { attachments, data } = prepareImages();

    // render template — pass brandName + siteUrl + inline image fallbacks
    const html = await renderTemplate("driver-allotted.ejs", {
      booking,
      driver,
      vehicle,
      siteUrl: SITE_URL,
      brandName: BRAND_NAME,
      logoSrc: data.logoSrc,
      facebookSrc: data.facebookSrc,
      instagramSrc: data.instagramSrc,
      whatsappSrc: data.whatsappSrc,
      phoneSrc: data.phoneSrc,
      xSrc: data.xSrc
    });

    // build mail options
    const opts = {
      from: MAIL_FROM || FROM_EMAIL,                 // e.g. "Radha Travels <no-reply@...>"
      to: booking.email,
      subject: `Driver Assigned — Booking ${booking.bookingId}`,
      html,
      replyTo: REPLY_TO || MAIL_FROM,
      attachments: attachments.length ? attachments : undefined
    };

    const info = await transporter.sendMail(opts);
    console.log("MAILER: driver allotment mail sent to", booking.email, info && info.messageId);
    return { ok: true, info };
  } catch (err) {
    console.error("MAILER: driver allotment failed", err);
    return { ok: false, error: err };
  }
}

// add or replace in src/mailer.js
export async function sendAdminResetEmail(admin, token) {
  try {
    const origin = process.env.SITE_ORIGIN || "http://localhost:3000";
    const resetUrl = `${origin.replace(/\/$/, "")}/admin/reset.html?token=${encodeURIComponent(token)}`;
    const html = `
      <p>Hello ${admin.name || admin.email},</p>
      <p>Click this link to reset your password (valid 1 hour):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this, ignore this email.</p>
    `;

    console.log("[mailer] Sending admin reset email to:", admin.email);
    console.log("[mailer] Reset URL:", resetUrl);

    const info = await transporter.sendMail({
      to: admin.email,
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      subject: "Admin password reset",
      html
    });

    console.log("[mailer] sendMail info:", info);
    return { ok: true, info };
  } catch (err) {
    console.error("[mailer] sendAdminResetEmail error:", err);
    return { ok: false, error: String(err) };
  }
}


export default transporter;

