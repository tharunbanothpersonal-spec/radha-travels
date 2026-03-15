import db from '../db.js';

export default async function trackVisitor(req, res, next) {
  try {
    const ip =
      req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    const today = new Date().toISOString().split('T')[0];

    /* Check if IP already counted today using Turso */
    const existingRes = await db.execute({
      sql: `SELECT id FROM visitors WHERE ip = ? AND visit_date = ?`,
      args: [ip, today]
    });
    
    const existing = existingRes.rows[0];

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

      /* Insert new visitor using Turso */
      await db.execute({
        sql: `INSERT INTO visitors (ip, visit_date, state) VALUES (?, ?, ?)`,
        args: [ip, today, state]
      });
    }
  } catch (err) {
    console.error('Visitor tracking error:', err.message);
  }

  // Always call next() so the website continues to load even if tracking fails!
  next();
}