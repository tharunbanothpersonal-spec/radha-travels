import db from '../db.js';

export default async function trackVisitor(req, res, next) {
  try {
    const ip =
      req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    const today = new Date().toISOString().split('T')[0];

    /* Check if IP already counted today */

    const existing = db
      .prepare(
        `
      SELECT id FROM visitors
      WHERE ip = ? AND visit_date = ?
    `
      )
      .get(ip, today);

    if (!existing) {
      let state = 'Unknown';

      try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await response.json();

        if (data.country === 'IN') {
          state = data.region;
        }
      } catch (err) {
        console.log('Geo lookup failed');
      }

      db.prepare(
        `
        INSERT INTO visitors (ip, visit_date, state)
        VALUES (?, ?, ?)
      `
      ).run(ip, today, state);
    }
  } catch (err) {
    console.error('Visitor tracking error:', err.message);
  }

  next();
}
