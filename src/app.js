// ✅ Radha Travels — app.js (no data duplication; uses SERVICES/SEGMENTS only)
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SERVICES, SEGMENTS } from "../data/services.js"; // <-- your single source of truth
import bookingsRouter from "./routes/bookings.js";
import adminBookings from "./routes/adminBookings.js";
import adminAuth from "./routes/adminAuth.js";
// src/app.js (near other imports)
import db from "./db.js";
import cookieParser from "cookie-parser";
import authAdmin from "./middleware/authAdmin.js"; // new middleware import



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/* --------------------------
   EXPRESS + EJS SETUP
-------------------------- */
app.use(
  express.static(path.join(__dirname, "..", "public"), {
    etag: false,
    lastModified: false,
    cacheControl: false,
    maxAge: 0,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// temporary request logger - add, restart server, then test POST
app.use((req, res, next) => {
  console.log("REQ->", req.method, req.url);
  next();
});

// auth routes (public): login, forgot-password, reset-password, create (seed)
app.use("/admin/auth", adminAuth);

// admin routes protected by server-side middleware
// This ensures any route under /admin (except /admin/auth) requires a valid cookie
app.use("/admin", authAdmin, adminBookings);


app.set("views", path.join(__dirname, "..", "views"));
app.set("view engine", "ejs");

// Global no-cache
app.set("etag", false);
app.use((_, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});


/* ---------- TICKER ---------- */
const TICKER = [
  "✈️ Airport Transfers from ₹1100 — 24/7 Service",
  "🚕 Flat 10% Off on Outstation (Weekdays)",
  "💼 Corporate Billing Available — Monthly Invoices",
  "🚗 Premium SUVs Available on Demand",
  "🧼 Sanitized Cars • Polite Chauffeurs • On-time Guarantee",
];
app.use((_, res, next) => { res.locals.ticker = TICKER; next(); });

// mount bookings API
app.use("/api/bookings", bookingsRouter);


/* --------------------------
   HERO LOADER (fresh each time)
-------------------------- */
function loadHeroSlides() {
  const heroDir = path.join(__dirname, "..", "public", "images", "hero");
  const jsonPath = path.join(heroDir, "hero.json");

  try {
    let files = fs
      .readdirSync(heroDir, { withFileTypes: true })
      .filter(f => f.isFile() && /\.(jpe?g|png|webp)$/i.test(f.name))
      .map(f => f.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

    // Move splash.* to the front if present
    const idx = files.findIndex(f => /^splash\.(jpe?g|png|webp)$/i.test(f));
    if (idx > 0) files.unshift(files.splice(idx, 1)[0]);

    let captions = {};
    if (fs.existsSync(jsonPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        if (Array.isArray(meta)) meta.forEach(m => { if (m?.file) captions[m.file] = m.caption; });
        else if (meta && typeof meta === "object") captions = meta;
      } catch {}
    }

    const now = Date.now();
    return files.map(f => ({
      src: `/images/hero/${f}?t=${now}`,
      caption: captions[f] ||
        f.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\b\w/g, m => m.toUpperCase())
    }));
  } catch (e) {
    console.error("Hero load error:", e.message);
    return [];
  }
}

/* --------------------------
   HELPERS
-------------------------- */
function serviceFromPrice(serviceSlug, segments) {
  const vals = [];

  for (const seg of segments) {
    const p = seg.pricing || {};
    switch (serviceSlug) {
      case "local-tour":
        if (p.local?.base) vals.push(p.local.base);
        break;
      case "outstation":
        if (p.outstation?.per_km && p.outstation?.min_km_day) {
          vals.push(Math.round(p.outstation.per_km * p.outstation.min_km_day));
        }
        break;
      case "airport-transfer":
        if (p.airport?.pickup) vals.push(p.airport.pickup);
        if (p.airport?.drop)   vals.push(p.airport.drop);
        break;
      default:
        // custom/corporate: no "from"
        break;
    }
  }
  return vals.length ? Math.min(...vals) : null;
}

/* --------------------------
   ROUTES
-------------------------- */

// Home
app.get("/", (req, res) => {
  res.render("index", {
    title: "Radha Travels",
    heroSlides: loadHeroSlides(),
  });
});

// Services list (inject "from" price only — no duplication)
app.get("/services", (req, res) => {
  const servicesWithFrom = SERVICES.map(s => ({
    ...s,
    from: serviceFromPrice(s.slug, SEGMENTS),
  }));
  res.render("services/index", {
    title: "Services | Radha Travels",
    services: servicesWithFrom,
  });
});

// Service detail
app.get("/services/:slug", (req, res) => {
  const { slug } = req.params;

  // Find by slug (your services.js should include `slug` for each service)
  const service = SERVICES.find(s => s.slug === slug);
  if (!service) {
    return res.status(404).render("pages/404", { title: "Not Found" });
  }

  // Booleans used by show.ejs to conditionally display pricing sections
  const isOut     = slug === "outstation";
  const isLocal   = slug === "local-tour";
  const isAirport = slug === "airport-transfer";

  // If you already have details in SERVICES, we just pass them through.
  // Expected shape in `services.js` (example):
  // details: { intro: "text...", routes: [{from, to, km, time}, ...] }
  const details = service.details || { intro: "", routes: [] };

  res.render("services/show", {
    title: `${service.title} | Radha Travels`,
    service,
    details: service.details || { intro: '', routes: [] },      // <- comes from SERVICES (no duplication)
    segments: SEGMENTS,
    isOut, isLocal, isAirport,
  });
});

//Driver-allotment

app.get("/admin/assign-driver", (req, res) => {
  res.render("admin/assign-driver");    // renders assign-driver.ejs
});

// --- bookings API (better-sqlite3 friendly) ---
/**
 * GET /api/bookings/:bookingId
 * Return a single booking by booking_id
 */
app.get('/api/bookings/:bookingId', (req, res) => {
  const bookingId = req.params.bookingId;
  try {
    const stmt = db.prepare('SELECT * FROM bookings WHERE booking_id = ? LIMIT 1');
    const row = stmt.get(bookingId);
    if (!row) {
      return res.status(404).json({ ok: false, error: 'not found' });
    }
    return res.json({ ok: true, booking: row });
  } catch (err) {
    console.error('GET /api/bookings/:bookingId error', err);
    return res.status(500).json({ ok: false, error: 'internal' });
  }
});

// ==============================================
//  NEW IMPROVED BOOKINGS API (supports filters)
// ==============================================
app.get('/api/bookings', (req, res) => {
  const q = (req.query.q || '').trim();
  const filter = (req.query.filter || 'unassigned').toLowerCase();

  const page = parseInt(req.query.page || '1', 10);
  const perPage = parseInt(req.query.perPage || req.query.limit || '100', 10);
  const offset = (Math.max(page, 1) - 1) * perPage;

  try {
    let where = [];
    let params = [];

    if (q) {
      where.push('(booking_id LIKE ? OR full_name LIKE ? OR phone LIKE ? OR driver_name LIKE ? OR vehicle_regno LIKE ? OR vehicle_model LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like, like, like, like);
    }

    if (filter === 'unassigned') {
      where.push('(status IS NULL OR status = ?)');
      params.push('pending');
    } else if (filter === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      where.push('date = ?');
      params.push(today);
    } else if (filter === 'allotted') {
      where.push('status = ?');
      params.push('allotted');
    }
    // filter === "all" → no extra condition

    const whereSql = where.length ? (' WHERE ' + where.join(' AND ')) : '';

    // total count
    const countStmt = db.prepare('SELECT COUNT(*) as cnt FROM bookings' + whereSql);
    const total = countStmt.get(...params).cnt;

    // paginated rows
    const sql = 'SELECT * FROM bookings' + whereSql + ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params, perPage, offset);

    return res.json({ ok: true, bookings: rows, total });
  } catch (err) {
    console.error('GET /api/bookings error', err);
    return res.status(500).json({ ok: false, error: 'internal' });
  }
});

// render the Allotted Bookings page
app.get("/admin/assign-driver", authAdmin, (req, res) => {
  res.render("admin/assign-driver");
});

app.get("/admin/allotted-bookings", authAdmin, (req, res) => {
  res.render("admin/allotted-bookings");
});



// Fallback 404
app.use((req, res) => {
  res.status(404).render("pages/404", { title: "Not Found" });
});

/* -------------------------- */
app.listen(PORT, () =>
  console.log(`✅ Radha Travels running at http://localhost:${PORT}`)
);
