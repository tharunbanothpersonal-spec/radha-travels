import fs from "fs";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

// load config
const MAIL_FROM = process.env.MAIL_FROM;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const BRAND_NAME = process.env.BRAND_NAME || "Radha Travels";
const SITE_URL = process.env.SITE_ORIGIN || "http://localhost:3000";
console.log("MAIL_FROM VALUE:", MAIL_FROM);

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
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: BRAND_NAME,
          email: MAIL_FROM, // must be verified in Brevo
        },
        to: Array.isArray(to)
          ? to.map(e => ({ email: e }))
          : [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text || "",
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📨 Mail sent:", subject, "→", to);
    return { ok: true, res: response.data };

  } catch (err) {
    console.error(
      "❌ sendEmail error:",
      err.response?.data || err.message
    );
    console.log("MAIL_FROM:", process.env.MAIL_FROM);
    return { ok: false, error: err.message };
  }
};



// --- ADMIN RESET EMAIL (Updated for Express Routes) ---
export async function sendAdminResetEmail(admin, token) {
  try {
    const origin = process.env.SITE_ORIGIN || "http://localhost:3000";
    
    // 🔥 THE FIX: Changed to match our new Express route
    const resetUrl = `${origin.replace(/\/$/, "")}/admin/reset/${encodeURIComponent(token)}`;

    // Premium HTML Template for the email itself
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
        <h2 style="color: #0f172a; margin-top: 0;">Password Reset</h2>
        <p style="color: #334155; font-size: 16px;">Hello ${admin.username || 'Admin'},</p>
        <p style="color: #334155; font-size: 16px;">You requested a password reset for your Radha Travels administrator account.</p>
        <div style="text-align: center; margin: 35px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%); color: #1e293b; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #64748b; font-size: 13px; margin-bottom: 0;">This link is valid for 1 hour. If you did not request this reset, please safely ignore this email.</p>
      </div>
    `;

    return await sendEmail({
      to: admin.email,
      subject: "Action Required: Admin Password Reset",
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

// ==========================================
//  ADMIN EMAIL ALERT NOTIFICATION
// ==========================================
export async function sendAdminAlert(subject, message) {
  try {
    if (!ADMIN_EMAIL) {
      console.warn("⚠️ Cannot send admin alert: ADMIN_EMAIL is not defined in .env");
      return { ok: false, reason: "no-admin-email" };
    }

    const html = `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
        <h2 style="color: #064e3b; margin-top: 0;">New Approval Request</h2>
        <p style="color: #334155; font-size: 16px;">${message}</p>
        <div style="text-align: center; margin: 35px 0;">
          <a href="${SITE_URL}/admin" style="background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">Go to Admin Dashboard</a>
        </div>
      </div>
    `;

    const result = await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Admin Alert: ${subject}`,
      html,
      text: message,
    });

    return result;
  } catch (err) {
    console.error("sendAdminAlert error:", err);
    return { ok: false, error: err.message || String(err) };
  }
}

export default { sendBookingConfirmation, sendDriverAllotmentEmail, sendAdminAlert };
