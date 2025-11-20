// src/routes/adminAuth.js
import authAdmin from "../middleware/authAdmin.js"; // ensure this import exists at top of file
import express from "express";
import jwt from "jsonwebtoken";
import { createAdmin, findAdminByEmail } from "../models/AdminSql.js";
import { findAdminById, validatePassword, updateAdminPassword } from "../models/AdminSql.js";
import { setAdminResetToken, findAdminByResetToken, clearAdminResetToken } from "../models/AdminSql.js";
import { sendAdminResetEmail } from "../mailer.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";

// src/routes/adminAuth.js — replace the existing login handler with this
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ ok: false, error: "email & password required" });

    const admin = findAdminByEmail(email);
    if (!admin)
      return res.status(401).json({ ok: false, error: "invalid credentials" });

    const ok = await validatePassword(admin.password_hash, password);
    if (!ok)
      return res.status(401).json({ ok: false, error: "invalid credentials" });

    // Generate JWT Token
    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    // Cookie name (configurable)
    const cookieName = process.env.ADMIN_COOKIE_NAME || "rt_admin_token";

    // Set HTTP-Only cookie
    res.cookie(cookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", // HTTPS only in prod
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    // Successful response (no token in body)
    return res.json({
      ok: true,
      name: admin.name,
      email: admin.email,
      message: "Login successful"
    });

  } catch (err) {
    console.error("adminAuth/login error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

//logout handler

router.post("/logout", (req, res) => {
  const cookieName = process.env.ADMIN_COOKIE_NAME || "rt_admin_token";
  res.clearCookie(cookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  return res.json({ ok: true, message: "logged out" });
});



/**
 * POST /admin/auth/change-password
 * Protected route - requires Authorization: Bearer <token>
 * Body: { currentPassword, newPassword }
 */
router.post("/change-password", authAdmin, async (req, res) => {
  try {
    const adminId = req.admin && req.admin.id;
    if (!adminId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, error: "currentPassword and newPassword are required" });
    }

    // fetch admin record
    const admin = findAdminById(adminId);
    if (!admin) return res.status(404).json({ ok: false, error: "admin not found" });

    // validate current password
    const valid = await validatePassword(admin.password_hash, currentPassword);
    if (!valid) return res.status(401).json({ ok: false, error: "current password is incorrect" });

    // update password
    const result = await updateAdminPassword(adminId, newPassword);
    if (result.changes && result.changes > 0) {
      return res.json({ ok: true, message: "password changed successfully" });
    } else {
      return res.status(500).json({ ok: false, error: "password update failed" });
    }
  } catch (err) {
    console.error("change-password error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});


/**
 * POST /admin/auth/create
 * body: { email, password, name }
 * NOTE: Use this only once to seed an admin. Remove or protect afterward.
 */
router.post("/create", async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok: false, error: "email & password required" });

    const exists = findAdminByEmail(email);
    if (exists) return res.status(400).json({ ok: false, error: "admin already exists" });

    const r = await createAdmin(email, password, name || "Admin");
    return res.json({ ok: true, message: "admin created", id: r.lastID });
  } catch (err) {
    console.error("adminAuth/create error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /admin/auth/forgot-password
// body: { email }
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, error: "email required" });

    const admin = findAdminByEmail(email);
    if (!admin) {
      // respond success to avoid leaking valid emails – still log internally if needed
      return res.json({ ok: true, message: "If this email is registered, you will receive password reset instructions." });
    }

    const r = setAdminResetToken(email, 60); // 60 minutes
    if (!r) return res.status(500).json({ ok: false, error: "could not set reset token" });

    try {
      await sendAdminResetEmail(admin, r.token);
    } catch (mailErr) {
      console.error("sendAdminResetEmail failed:", mailErr);
      // still return success message (do not leak)
    }

    return res.json({ ok: true, message: "If this email is registered, you will receive password reset instructions." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /admin/auth/reset-password?token=...   (optional UI endpoint)
// You can serve a static reset page that reads token from query and posts to POST /reset-password
router.get("/reset-password", (req, res) => {
  // serve a simple HTML page or redirect to your front-end reset page
  // If your front-end has a reset page at /admin/reset.html, redirect there with token
  const token = req.query.token || "";
  return res.redirect(`/admin/reset.html?token=${encodeURIComponent(token)}`);
});

// POST /admin/auth/reset-password
// body: { token, newPassword }
// inside src/routes/adminAuth.js

router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) return res.status(400).json({ ok: false, error: "token and newPassword required" });

    const admin = findAdminByResetToken(token);
    if (!admin) return res.status(400).json({ ok: false, error: "invalid token" });

    if (!admin.reset_expires || new Date(admin.reset_expires) < new Date()) {
      return res.status(400).json({ ok: false, error: "token expired" });
    }

    // update password and set password_changed_at
    const result = await updateAdminPassword(admin.id, newPassword);

    // always clear/reset the token fields
    clearAdminResetToken(admin.id);

    if (result.changes && result.changes > 0) {
      return res.json({ ok: true, message: "password reset successful" });
    }
    return res.status(500).json({ ok: false, error: "password update failed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});


export default router;
