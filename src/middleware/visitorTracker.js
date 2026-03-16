import db from "../db.js";

export default async function trackVisitor(req, res, next) {

  /* -----------------------------------------
     SKIP APIs + STATIC FILES
  ----------------------------------------- */

  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/images") ||
    req.path.startsWith("/css") ||
    req.path.startsWith("/js") ||
    req.path.startsWith("/uploads") ||
    req.path.includes(".")
  ) {
    return next();
  }

  /* -----------------------------------------
     SKIP BOTS / CRAWLERS
  ----------------------------------------- */

  const ua = req.headers["user-agent"] || "";

  if (
    ua.includes("bot") ||
    ua.includes("crawler") ||
    ua.includes("spider") ||
    ua.includes("Render")
  ) {
    return next();
  }

  try {

    /* -----------------------------------------
       GET REAL VISITOR IP
    ----------------------------------------- */

    let ip =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      req.ip ||
      "";

    if (ip.includes(",")) {
      ip = ip.split(",")[0].trim();
    }

    if (ip.startsWith("::ffff:")) {
      ip = ip.replace("::ffff:", "");
    }

    /* local development fallback */

    if (ip === "::1" || ip === "127.0.0.1") {
      ip = "122.161.0.0"; // Airtel Delhi IP for local testing
    }

    /* -----------------------------------------
       TIME SETUP (CLEAN IST & UTC)
    ----------------------------------------- */

    const now = new Date();

    // 1. IST for visit_date: Resets daily counts at 12:00 AM India time.
    // Result: "2026-03-17"
    const today = now.toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).split(' ')[0];

    // 2. Clean UTC for last_seen: Perfect for SQLite math.
    // Result: "2026-03-16 20:23:47"
    const lastSeen = now.toISOString().replace('T', ' ').substring(0, 19);

    /* -----------------------------------------
       CHECK EXISTING VISITOR
    ----------------------------------------- */

    const existing = await db.execute({
      sql: "SELECT id FROM visitors WHERE ip=? AND visit_date=?",
      args: [ip, today]
    });

    if (existing.rows.length > 0) {

      /* update last activity */

      await db.execute({
        sql: "UPDATE visitors SET last_seen=? WHERE ip=? AND visit_date=?",
        args: [lastSeen, ip, today]
      });

    } else {

      /* -----------------------------------------
         GEO LOCATION (NEW RELIABLE API)
      ----------------------------------------- */

      let state = "India";

      try {
        // Using ip-api.com which is more reliable for servers
        const geo = await fetch(`http://ip-api.com/json/${ip}`);
        const data = await geo.json();

        // ip-api uses 'status', 'countryCode', and 'regionName'
        if (data.status === "success" && data.countryCode === "IN") {
          state = data.regionName;
        } else if (data.status === "fail") {
          console.log(`Geo API failed for IP ${ip}: ${data.message}`);
        }

      } catch (err) {
        console.error(`Geo lookup network error for IP ${ip}:`, err.message);
      }

      /* -----------------------------------------
         INSERT VISITOR
      ----------------------------------------- */

      await db.execute({
        sql: `
          INSERT INTO visitors
          (ip, visit_date, state, last_seen)
          VALUES (?, ?, ?, ?)
        `,
        args: [ip, today, state, lastSeen]
      });

    }

  } catch (err) {

    console.error("Visitor tracking error:", err.message);

  }

  next();
}