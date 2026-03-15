import express from "express";
import crypto from "crypto";
import db from "../db.js"; // Make sure this path points correctly to your db.js
import { sendAdminResetEmail } from "../mailer.js";

const router = express.Router();

/* LOGIN PAGE */
router.get("/login", (req, res) => {
  res.render("admin/login", {
    title: "Admin Login | Radha Travels",
    error: null
  });
});

/* LOGIN SUBMIT */
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Query SQLite for the user
  const admin = db.prepare('SELECT * FROM admins WHERE username = ? AND password = ?').get(username, password);

  if (admin) {
    req.session.admin = { username: admin.username };
    return res.redirect("/admin");
  }

  res.render("admin/login", {
    title: "Admin Login | Radha Travels",
    error: "Invalid credentials"
  });
});

/* LOGOUT */
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
});

/* ==========================================
   FORGOT PASSWORD FLOW
========================================== */

/* FORGOT PASSWORD PAGE */
router.get("/forgot-password", (req, res) => {
  res.render("admin/forgot-password", {
    title: "Forgot Password | Radha Travels",
    error: null,
    success: null
  });
});

/* FORGOT PASSWORD SUBMIT */
router.post("/forgot-password", async (req, res) => { // <-- ADDED ASYNC
  const { username } = req.body;

  try {
    // 1. Find admin in SQLite
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

    if (admin) {
      // 2. Generate token and expiration (1 hour from now)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expires = Date.now() + 3600000; 

      // 3. Save token to SQLite
      db.prepare('UPDATE admins SET reset_token = ?, reset_token_expires = ? WHERE username = ?')
        .run(resetToken, expires, username);

      // 4. TRIGGER THE EMAIL INSTEAD OF CONSOLE LOG
      if (admin.email) {
        await sendAdminResetEmail(admin, resetToken);
      } else {
        console.warn(`⚠️ No email found in the database for admin: ${username}`);
      }
    }

    // Always render success so hackers can't guess usernames
    res.render("admin/forgot-password", {
      title: "Forgot Password | Radha Travels",
      error: null,
      success: "If that username exists in our system, a password reset link has been sent to the registered email address."
    });

  } catch (err) {
    console.error("Forgot password error:", err);
    res.render("admin/forgot-password", {
      title: "Forgot Password | Radha Travels",
      error: "An error occurred while processing your request.",
      success: null
    });
  }
});

/* ==========================================
   RESET PASSWORD FLOW
========================================== */

/* VERIFY TOKEN & SHOW RESET PAGE */
router.get("/reset/:token", (req, res) => {
  const { token } = req.params;

  // Check if token exists AND hasn't expired
  const admin = db.prepare('SELECT * FROM admins WHERE reset_token = ? AND reset_token_expires > ?')
                  .get(token, Date.now());

  if (!admin) {
    return res.render("admin/forgot-password", {
      title: "Forgot Password | Radha Travels",
      error: "Password reset token is invalid or has expired. Please request a new one.",
      success: null
    });
  }

  // Token is valid, show the reset form
  res.render("admin/reset-password", {
    title: "Set New Password | Radha Travels",
    token: token,
    error: null
  });
});

/* SUBMIT NEW PASSWORD */
router.post("/reset/:token", (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  // Verify token again just in case it expired while they were typing
  const admin = db.prepare('SELECT * FROM admins WHERE reset_token = ? AND reset_token_expires > ?')
                  .get(token, Date.now());

  if (!admin) {
    return res.render("admin/forgot-password", {
      title: "Forgot Password | Radha Travels",
      error: "Token has expired. Please request a new one.",
      success: null
    });
  }

  // Check if passwords match
  if (password !== confirmPassword) {
    return res.render("admin/reset-password", {
      title: "Set New Password | Radha Travels",
      token: token,
      error: "Passwords do not match."
    });
  }

  // Update the password in SQLite and clear the tokens
  // NOTE: We are saving plain text right now. We will hash this in the next step!
  db.prepare(`
    UPDATE admins 
    SET password = ?, reset_token = NULL, reset_token_expires = NULL 
    WHERE id = ?
  `).run(password, admin.id);

  // Send them back to login
  res.render("admin/login", {
    title: "Admin Login | Radha Travels",
    error: null,
    // You can optionally add a success message to your login.ejs to catch this!
    success: "Password has been successfully reset. You can now log in." 
  });
});

export default router;