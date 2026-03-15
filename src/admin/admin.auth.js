import express from "express";
import crypto from "crypto";
import db from "../db.js"; 
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
router.post("/login", async (req, res) => { // <-- ADDED ASYNC
  const { username, password } = req.body;

  try {
    // Query Turso Cloud DB for the user
    const result = await db.execute({
      sql: 'SELECT * FROM admins WHERE username = ? AND password = ?',
      args: [username, password]
    });
    
    const admin = result.rows[0];

    if (admin) {
      req.session.admin = { username: admin.username };
      return res.redirect("/admin");
    }

    res.render("admin/login", {
      title: "Admin Login | Radha Travels",
      error: "Invalid credentials"
    });
  } catch (err) {
    console.error("Login database error:", err);
    res.render("admin/login", {
      title: "Admin Login | Radha Travels",
      error: "A network error occurred. Please try again."
    });
  }
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
router.post("/forgot-password", async (req, res) => { 
  const { username } = req.body;

  try {
    // 1. Find admin in Turso
    const result = await db.execute({
      sql: 'SELECT * FROM admins WHERE username = ?',
      args: [username]
    });
    
    const admin = result.rows[0];

    if (admin) {
      // 2. Generate token and expiration (1 hour from now)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expires = Date.now() + 3600000; 

      // 3. Save token to Turso
      await db.execute({
        sql: 'UPDATE admins SET reset_token = ?, reset_token_expires = ? WHERE username = ?',
        args: [resetToken, expires, username]
      });

      // 4. TRIGGER THE EMAIL
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
router.get("/reset/:token", async (req, res) => { // <-- ADDED ASYNC
  const { token } = req.params;

  try {
    // Check if token exists AND hasn't expired
    const result = await db.execute({
      sql: 'SELECT * FROM admins WHERE reset_token = ? AND reset_token_expires > ?',
      args: [token, Date.now()]
    });
    
    const admin = result.rows[0];

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
  } catch (err) {
    console.error("Reset token verification error:", err);
    res.redirect("/admin/login");
  }
});

/* SUBMIT NEW PASSWORD */
router.post("/reset/:token", async (req, res) => { // <-- ADDED ASYNC
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  try {
    // Verify token again just in case it expired while they were typing
    const result = await db.execute({
      sql: 'SELECT * FROM admins WHERE reset_token = ? AND reset_token_expires > ?',
      args: [token, Date.now()]
    });
    
    const admin = result.rows[0];

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

    // Update the password in Turso and clear the tokens
    // NOTE: We are saving plain text right now. We will hash this in the next step!
    await db.execute({
      sql: `UPDATE admins SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?`,
      args: [password, admin.id]
    });

    // Send them back to login
    res.render("admin/login", {
      title: "Admin Login | Radha Travels",
      error: null,
      success: "Password has been successfully reset. You can now log in." 
    });
  } catch (err) {
    console.error("Password reset update error:", err);
    res.render("admin/reset-password", {
      title: "Set New Password | Radha Travels",
      token: token,
      error: "An error occurred while saving your new password. Please try again."
    });
  }
});

export default router;