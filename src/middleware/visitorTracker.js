import db from '../db.js';

export default function trackVisitor(req, res, next) {
  try {
    const ip =
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress ||
      req.ip ||
      'unknown';

    const today = new Date().toISOString().split('T')[0];

    const existing = db
      .prepare(
        `
      SELECT id FROM visitors
      WHERE ip = ? AND visit_date = ?
    `
      )
      .get(ip, today);

    if (!existing) {
      db.prepare(
        `
        INSERT INTO visitors (ip, visit_date)
        VALUES (?, ?)
      `
      ).run(ip, today);
    }
  } catch (err) {
    console.error('Visitor tracking error:', err.message);
  }

  next();
}
