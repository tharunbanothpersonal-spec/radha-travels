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
      ip = "8.8.8.8";
    }

    /* -----------------------------------------
       IST TIME
    ----------------------------------------- */

/* -----------------------------------------
       PROPER IST TIME (Native JS)
    ----------------------------------------- */

    const now = new Date();

    // The 'sv-SE' locale naturally formats to exactly what SQLite needs: YYYY-MM-DD HH:mm:ss
    const istString = now.toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' });

    // istString looks exactly like: "2026-03-17 01:48:43"
    const today = istString.split(' ')[0]; // Extracts "2026-03-17"
    const lastSeen = istString;            // Full timestamp

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
         GEO LOCATION
      ----------------------------------------- */

      let state = "India";

      try {

        const geo = await fetch(`https://ipwho.is/${ip}`);
        const data = await geo.json();

        if (data.success && data.country_code === "IN") {
          state = data.region;
        }

      } catch (err) {

        console.log("Geo lookup failed");

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