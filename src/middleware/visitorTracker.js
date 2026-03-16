import db from "../db.js";

export default async function trackVisitor(req, res, next) {

try {


/* ---------------- GET REAL IP ---------------- */

let ip =
  req.headers["x-forwarded-for"]?.split(",")[0] ||
  req.socket?.remoteAddress ||
  req.ip ||
  "Unknown";

// Normalize IPv6 localhost
if (ip === "::1") ip = "127.0.0.1";

const today = new Date().toISOString().split("T")[0];

/* ---------------- CHECK IF ALREADY COUNTED TODAY ---------------- */

const existing = await db.execute({
  sql: `
    SELECT id
    FROM visitors
    WHERE ip = ? AND visit_date = ?
    LIMIT 1
  `,
  args: [ip, today]
});

if (existing.rows.length) {
  return next();
}

/* ---------------- GEO LOOKUP ---------------- */

let country = "Unknown";
let state = "Unknown";
let city = "Unknown";

try {

  const response = await fetch(`https://ipapi.co/${ip}/json/`);
  const geo = await response.json();

  country = geo.country_name || "Unknown";
  state = geo.region || "Unknown";
  city = geo.city || "Unknown";

} catch (err) {

  console.log("Geo lookup failed");

}

/* ---------------- USER AGENT ---------------- */

const userAgent = req.headers["user-agent"] || "Unknown";

/* ---------------- INSERT VISITOR ---------------- */

const now = new Date().toISOString();
await db.execute({
  sql: `
    UPDATE visitors
    SET last_seen = ?
    WHERE ip = ?
  `,
  args: [now, ip]
});

await db.execute({
  sql: `
    INSERT INTO visitors
    (ip, user_agent, country, state, city, visit_date, last_seen)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
  args: [
    ip,
    userAgent,
    country,
    state,
    city,
    today,
    now
  ]
});


} catch (err) {


console.error("Visitor tracking error:", err.message);


}

/* Always continue loading the page */

next();

}
