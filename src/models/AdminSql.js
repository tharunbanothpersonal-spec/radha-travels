// src/models/AdminSql.js
// Named exports: createAdmin, findAdminByEmail, findAdminById, validatePassword, etc.

import bcrypt from "bcrypt";
import db from "../db.js"; // Now points to Turso
import crypto from "crypto";

const SALT_ROUNDS = 10;

export async function createAdmin(email, password, name = "Admin") {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  
  const result = await db.execute({
    sql: `INSERT INTO admins (email, password_hash, name) VALUES (?, ?, ?)`,
    args: [email, hash, name]
  });
  
  // Turso returns lastInsertRowid. We cast it to a Number to match old behavior.
  return { lastID: result.lastInsertRowid ? Number(result.lastInsertRowid) : null };
}

export async function findAdminByEmail(email) { // <-- ADDED ASYNC
  if (!email) return null;
  const result = await db.execute({
    sql: `SELECT * FROM admins WHERE email = ?`,
    args: [email]
  });
  return result.rows[0] || null;
}

export async function findAdminById(id) { // <-- ADDED ASYNC
  if (!id) return null;
  const result = await db.execute({
    sql: `SELECT * FROM admins WHERE id = ?`,
    args: [id]
  });
  return result.rows[0] || null;
}

export async function validatePassword(hash, password) {
  if (!hash || !password) return false;
  return bcrypt.compare(password, hash);
}

export async function updateAdminPassword(adminId, newPassword) { // <-- ADDED ASYNC
  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const changedAt = new Date().toISOString();
  
  const result = await db.execute({
    sql: `UPDATE admins SET password_hash = ?, password_changed_at = ? WHERE id = ?`,
    args: [hash, changedAt, adminId]
  });
  
  // Turso uses rowsAffected instead of changes
  return { changes: result.rowsAffected || 0, password_changed_at: changedAt };
}

// generate and store reset token
export async function setAdminResetToken(email, expiresInMinutes = 60) { // <-- ADDED ASYNC
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
  
  const result = await db.execute({
    sql: "UPDATE admins SET reset_token = ?, reset_expires = ? WHERE email = ?",
    args: [token, expiresAt, email]
  });
  
  if (result.rowsAffected === 0) return null;
  
  // return token (we email it)
  return { token, expiresAt };
}

export async function findAdminByResetToken(token) { // <-- ADDED ASYNC
  // token stored in DB as-is
  const result = await db.execute({
    sql: "SELECT * FROM admins WHERE reset_token = ?",
    args: [token]
  });
  return result.rows[0] || null;
}

export async function clearAdminResetToken(adminId) { // <-- ADDED ASYNC
  return await db.execute({
    sql: "UPDATE admins SET reset_token = NULL, reset_expires = NULL WHERE id = ?",
    args: [adminId]
  });
}