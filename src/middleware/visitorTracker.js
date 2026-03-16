import db from "../db.js";

export default async function trackVisitor(req, res, next) {

  try {

    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      req.ip;

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    /* Check if visitor already exists today */

    const existing = await db.execute({
      sql: "SELECT id FROM visitors WHERE ip=? AND visit_date=?",
      args: [ip, today]
    });

    if (existing.rows.length > 0) {

      /* update activity time */

      await db.execute({
        sql: "UPDATE visitors SET last_seen=? WHERE ip=?",
        args: [now, ip]
      });

    } else {

      let state = "Unknown";

      try {

        const geo = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await geo.json();

        if (data.country === "IN") {
          state = data.region;
        }

      } catch (err) {
        console.log("Geo lookup failed");
      }

      await db.execute({
        sql: `
        INSERT INTO visitors
        (ip, visit_date, state, last_seen)
        VALUES (?, ?, ?, ?)
        `,
        args: [ip, today, state, now]
      });

    }

  } catch (err) {

    console.error("Visitor tracking error:", err.message);

  }

  next();

}