// src/models/AdminSql.js
// Named exports: createAdmin, findAdminByEmail, findAdminById, validatePassword

import bcrypt from "bcrypt";
import db from "../db.js"; // better-sqlite3 instance used elsewhere
import crypto from "crypto";

const SALT_ROUNDS = 10;

export async function createAdmin(email, password, name = "Admin") {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const stmt = db.prepare(`INSERT INTO admins (email, password_hash, name) VALUES (?, ?, ?)`);
  const info = stmt.run(email, hash, name);
  // better-sqlite3 returns { changes, lastInsertRowid } sometimes
  return { lastID: info.lastInsertRowid ?? info.lastID ?? null };
}

export function findAdminByEmail(email) {
  if (!email) return null;
  const row = db.prepare(`SELECT * FROM admins WHERE email = ?`).get(email);
  return row || null;
}

export function findAdminById(id) {
  if (!id) return null;
  const row = db.prepare(`SELECT * FROM admins WHERE id = ?`).get(id);
  return row || null;
}

export async function validatePassword(hash, password) {
  if (!hash || !password) return false;
  return bcrypt.compare(password, hash);
}

// ... existing imports and db

export async function updateAdminPassword(adminId, newPassword) {
  const SALT_ROUNDS = 10;
  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const changedAt = new Date().toISOString();
  const stmt = db.prepare(`UPDATE admins SET password_hash = ?, password_changed_at = ? WHERE id = ?`);
  const info = stmt.run(hash, changedAt, adminId);
  return { changes: info.changes || 0, password_changed_at: changedAt };
}


// generate and store reset token
export function setAdminResetToken(email, expiresInMinutes = 60) {
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
  const stmt = db.prepare("UPDATE admins SET reset_token = ?, reset_expires = ? WHERE email = ?");
  const info = stmt.run(token, expiresAt, email);
  if (info.changes === 0) return null;
  // return token (we email it)
  return { token, expiresAt };
}

export function findAdminByResetToken(token) {
  // token stored in DB as-is
  return db.prepare("SELECT * FROM admins WHERE reset_token = ?").get(token) || null;
}

export function clearAdminResetToken(adminId) {
  return db.prepare("UPDATE admins SET reset_token = NULL, reset_expires = NULL WHERE id = ?").run(adminId);
}