// src/middleware/authAdmin.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";
const COOKIE_NAME = process.env.ADMIN_COOKIE_NAME || "rt_admin_token";

export default function authAdmin(req, res, next) {
  try {
    let token = null;
    if (req.cookies && req.cookies[COOKIE_NAME]) token = req.cookies[COOKIE_NAME];
    if (!token && req.headers && req.headers.authorization) {
      const m = String(req.headers.authorization).match(/^Bearer\s+(.+)$/i);
      if (m) token = m[1];
    }
    if (!token) {
      if (req.accepts && req.accepts("html")) return res.redirect("/");
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin = { id: payload.id, email: payload.email, iat: payload.iat, exp: payload.exp };
    return next();
  } catch (err) {
    console.error("authAdmin error:", err && err.message ? err.message : err);
    if (req.accepts && req.accepts("html")) return res.redirect("/");
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
}
