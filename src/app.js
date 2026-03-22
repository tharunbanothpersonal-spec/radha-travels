// =======================================================
//  Radha Travels — Clean app.js (Turso Cloud Version)
// =======================================================

import express from 'express';
import fs from 'fs';
import path from 'path';
import net from 'net';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { fileURLToPath } from 'url';
import blogPosts from "../data/blogData.js";
import tourData from "../data/tourData.js";

import dotenv from "dotenv";
dotenv.config();
import cloudinary from "./cloudinary.js";
console.log("☁️ Cloudinary configured");

// DB
import db from './db.js';

// Routers
import bookingsRouter from './routes/bookings.js';
import galleryRoutes from './routes/galleryRoutes.js';
import fleetRoutes from './routes/fleet.routes.js';
import testimonialsRoutes from './routes/testimonials.routes.js';

// Admin (NEW SYSTEM)
import adminAuth from './admin/admin.auth.js';
import adminRoutes from './admin/admin.routes.js';
import { requireAdmin } from './admin/admin.middleware.js';

// Data
import { SERVICES, SEGMENTS } from '../data/services.js';

//IP visiter counter
import trackVisitor from './middleware/visitorTracker.js';

// -------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// =======================================================
//  MIDDLEWARE
// =======================================================

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(
    `User-agent: *
Allow: /

Sitemap: https://radhatravels.co.in/sitemap.xml`
  );
});
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'radha_travels_secret',
    resave: false,
    saveUninitialized: false,
  })
);
// Make admin session available in all views
app.use((req, res, next) => {
  res.locals.adminUser = req.session?.admin || null;
  next();
});

// request logger (temporary but useful)
app.use((req, res, next) => {
  console.log('REQ ->', req.method, req.url);
  next();
});
// for metaDescription
app.use((req, res, next) => {
  res.locals.metaDescription =
    'Book reliable Hyderabad cab service with Radha Travels. Airport transfers, outstation trips and temple tours available 24/7.';
  next();
});

//for IP visitor counter
app.use(trackVisitor);

// =======================================================
//  VIEW ENGINE
// =======================================================

app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'ejs');

// =======================================================
//  TICKER
// =======================================================

const TICKER = [
  '✈️ Airport Transfers from ₹1100 — 24/7 Service',
  '🚕 Flat 10% Off on Outstation (Weekdays)',
  '💼 Corporate Billing Available — Monthly Invoices',
  '🚗 Premium SUVs Available on Demand',
  '🧼 Sanitized Cars • Polite Chauffeurs • On-time Guarantee',
];

app.use((_, res, next) => {
  res.locals.ticker = TICKER;
  next();
});

// =======================================================
//  ADMIN (NEW CLEAN SETUP)
// =======================================================
app.use('/admin', (req, res, next) => {
  const path = req.path.split('/')[1] || 'dashboard';
  res.locals.active = path;
  next();
});
app.use('/admin', adminAuth); // /admin/login, /admin/logout
app.use('/admin', adminRoutes); // /admin, /admin/bookings, /admin/gallery

// =======================================================
//  IP COUNTER (Converted to Async Turso)
// =======================================================

app.use(async (req, res, next) => {
  try {
    const result = await db.execute(`
      SELECT COUNT(DISTINCT ip) as total
      FROM visitors
    `);
    res.locals.totalVisitors = result.rows[0]?.total || 0;
  } catch (err) {
    console.error('Visitor counter error:', err.message);
    res.locals.totalVisitors = 0;
  }
  next();
});

// =========================
// BLOG ROUTES
// =========================


console.log('Total blogs:', blogPosts.length);
app.get('/blog', (req, res) => {
  res.render('blog/blog-index', {
    title: 'Travel Blog | Radha Travels',
    posts: blogPosts,
  });
});

app.get('/blog/:slug', (req, res) => {
  const post = blogPosts.find((p) => p.slug === req.params.slug);

  if (!post) {
    return res.status(404).render('pages/404', { title: 'Not Found' });
  }

  // Auto related posts (exclude current)
  const relatedPosts = blogPosts
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);

  res.render('blog/blog-show', {
    title: post.title,
    post,
    relatedPosts,
    faqs: extractFaqs(post.content),
  });
});

// ip counter

app.get("/api/live-visitors", async (req, res) => {

  try {

    const result = await db.execute(`
      SELECT COUNT(DISTINCT ip) as total
      FROM visitors
      WHERE last_seen >= datetime('now','+5 hours','+30 minutes','-5 minutes')
    `);

    res.json({ total: result.rows[0]?.total || 0 });

  } catch (err) {

    console.error("Live visitor error:", err);
    res.json({ total: 0 });

  }

});


app.get('/api/state-visitors', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT state, COUNT(*) as total
      FROM visitors
      WHERE state IS NOT NULL
      AND state != 'Unknown'
      GROUP BY state
      ORDER BY total DESC
      LIMIT 6
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});



// =======================================================
//  PUBLIC ROUTES
// =======================================================

// Home (Converted to Async Turso)
app.get('/', async (req, res) => {
  let featuredGallery = [];
  try {
    const galleryRes = await db.execute(`
      SELECT * FROM gallery
      ORDER BY created_at DESC
      LIMIT 6
    `);
    featuredGallery = galleryRes.rows;
  } catch (err) {
    console.error('Featured gallery error:', err.message);
  }
  
  const fleetRes = await db.execute('SELECT * FROM fleet WHERE is_active = 1 ORDER BY id DESC LIMIT 4');
  const featuredFleet = fleetRes.rows;
  
  const randomTestRes = await db.execute(`
    SELECT * FROM testimonials
    WHERE status='approved'
    ORDER BY RANDOM()
    LIMIT 4
  `);
  const randomTestimonials = randomTestRes.rows;
  
  const testimonialsRes = await db.execute(`
    SELECT * FROM testimonials 
    WHERE status='approved'
  `);
  const testimonials = testimonialsRes.rows;

  const avgRating = testimonials.length
    ? (
        testimonials.reduce((a, b) => a + b.rating, 0) / testimonials.length
      ).toFixed(1)
    : 0;

  const ratingPercentages = {};
  for (let i = 1; i <= 5; i++) {
    const count = testimonials.filter((t) => t.rating === i).length;
    ratingPercentages[i] = testimonials.length
      ? (count / testimonials.length) * 100
      : 0;
  }
  const totalReviews = testimonials.length;

  const today = new Date().toISOString().split('T')[0];

  let totalVisitors = 0;
  let todayVisitors = 0;

  try {
    const totalVisRes = await db.execute(`
      SELECT COUNT(DISTINCT ip) as total
      FROM visitors
    `);
    totalVisitors = totalVisRes.rows[0].total;

    const todayVisRes = await db.execute({
      sql: `SELECT COUNT(DISTINCT ip) as total FROM visitors WHERE visit_date = ?`,
      args: [today]
    });
    todayVisitors = todayVisRes.rows[0].total;
  } catch (err) {
    console.log('Visitor stats error', err.message);
  }

  res.render('index', {
    title:
      'Hyderabad Cab Service | Outstation, Airport & Tempo Traveller | Radha Travels',
    heroSlides: loadHeroSlides(),
    featuredGallery,
    featuredFleet,
    testimonials,
    avgRating,
    totalReviews,
    ratingPercentages,
    randomTestimonials,
    totalVisitors,
    todayVisitors,
    latestPosts: blogPosts
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3)
      .map((post) => ({
        ...post,
        readTime: Math.ceil(post.content.split(' ').length / 200),
      })),
  });
});

// =========================
// Home special tour package
//==========================

// Dynamic Route for Special Tour Packages
app.get('/tours/:destination', (req, res) => {
  // Grab the destination from the URL (e.g., "srisailam")
  const destId = req.params.destination.toLowerCase();



  // Check if the clicked tour exists in our data
  const tour = tourData[destId];

  if (tour) {
    // If it exists, render the details page and pass the data
    res.render('tour-detail', {
      title: `Hyderabad to ${tour.name} Cab Service | Temple Trip Package | Radha Travels`,
      tour: tour,
    });
  } else {
    // If someone types a random URL like /tours/fakeplace
    res.status(404).send('Tour not found. Please return to the homepage.');
  }
});

// Services
app.get('/services', (req, res) => {
  const servicesWithFrom = SERVICES.map((s) => ({
    ...s,
    from: serviceFromPrice(s.slug, SEGMENTS),
  }));

  res.render('services/index', {
    title:
      'Cab Services in Hyderabad | Airport, Outstation & Local Rentals | Radha Travels',
    services: servicesWithFrom,
  });
});

// Service detail (Converted to Async Turso)
app.get('/services/:slug', async (req, res) => {
  const service = SERVICES.find((s) => s.slug === req.params.slug);

  if (!service) {
    return res.status(404).render('pages/404', { title: 'Not Found' });
  }

  try {
    // ---- Load pricing from DB ----
    const pricingRes = await db.execute(`SELECT * FROM pricing`);
    const pricingRows = pricingRes.rows;

    // ---- Convert DB pricing to object ----
    const pricingMap = {};

    pricingRows.forEach((row) => {
      if (!pricingMap[row.vehicle]) pricingMap[row.vehicle] = {};
      pricingMap[row.vehicle][row.service] = row;
    });

    // ---- Apply DB pricing to segments ----
    const segments = SEGMENTS.map((seg) => {
      const dbVehicle = pricingMap[seg.label];
      if (!dbVehicle) return seg;

      return {
        ...seg,
        pricing: {
          local: dbVehicle.Local
            ? {
                pack: '8Hrs / 80KM',
                base: dbVehicle.Local.base_price,
                extra_km: dbVehicle.Local.per_km,
                extra_hr: dbVehicle.Local.extra_per_hour,
                driver: 0,
              }
            : seg.pricing.local,

          outstation: dbVehicle.Outstation
            ? {
                per_km: dbVehicle.Outstation.per_km,
                min_km_day: dbVehicle.Outstation.min_km_per_day,
                driver: dbVehicle.Outstation.driver_allowance,
                night: dbVehicle.Outstation.driver_allowance,
              }
            : seg.pricing.outstation,

          airport: dbVehicle.Airport
            ? {
                pickup: dbVehicle.Airport.flat_price,
                drop: dbVehicle.Airport.flat_price,
                waiting_per_hr: 200,
              }
            : seg.pricing.airport,
        },
      };
    });

    res.render('services/show', {
      title: `${service.title} | Radha Travels`,
      service,
      segments,
    });
  } catch (err) {
    console.error('Service page error:', err);
    res.status(500).send('Database Error');
  }
});

// =======================================================
//  BOOKINGS API
// =======================================================

app.use('/api/bookings', bookingsRouter);

// =======================================================
//  ADMIN PAGES (EXTRA)
// =======================================================

// Assign driver page (admin-only)
app.get('/admin/assign-driver', requireAdmin, (req, res) => {
  res.render('admin/assign-driver');
});

// Allotted bookings page (admin-only)
app.get('/admin/allotted-bookings', requireAdmin, (req, res) => {
  res.render('admin/allotted-bookings');
});

//FLEET SECTION ROUTE (Converted to Async Turso)
app.get('/fleet', async (req, res) => {
  try {
    const fleetRes = await db.execute(`
      SELECT * FROM fleet
      WHERE is_active = 1
      ORDER BY category ASC, sort_order ASC
    `);
    const vehicles = fleetRes.rows;

    res.render('fleet', {
      title:
        'Tempo Traveller & Cab Rental in Hyderabad | SUV, Sedan & Bus | Radha Travels',
      vehicles,
    });
  } catch (err) {
    console.error('Fleet page error:', err);
    res.status(500).send('Database Error');
  }
});

/* =========================
   BOOKING TRACKING ROUTES
========================= */

// Show tracking page
app.get('/track-booking', (req, res) => {
  res.render('track-booking', {
    title: 'Track Your Cab Booking Online | Radha Travels Hyderabad',
    booking: null,
    error: null,
  });
});

// Handle tracking form submission (Converted to Async Turso)
app.post('/track-booking', async (req, res) => {
  const { bookingId } = req.body;

  try {
    const bookingRes = await db.execute({
      sql: 'SELECT * FROM bookings WHERE booking_id = ?',
      args: [bookingId]
    });
    const booking = bookingRes.rows[0];

    if (!booking) {
      return res.render('track-booking', {
        title: 'Track Your Cab Booking Online | Radha Travels Hyderabad',
        booking: null,
        error: 'Booking not found. Please check your ID.',
      });
    }

    res.render('track-booking', {
      title: 'Track Booking | Radha Travels',
      booking,
      error: null,
    });
  } catch (err) {
    console.error('Track booking error:', err);
    res.status(500).send('Database Error');
  }
});

// =======================================================
//  GALLERY (PUBLIC)
// =======================================================

app.use('/gallery', galleryRoutes);

// =======================================================
//  FLEET PUBLIC
// =======================================================

app.use('/fleet', fleetRoutes);

// =======================================================
//  TESTIMONIAL PUBLIC
// =======================================================
app.use(testimonialsRoutes);

// =======================================================
//  SMTP CHECK (UTILITY)
// =======================================================

app.get('/internal/smtp-check', async (req, res) => {
  const host = process.env.MAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.MAIL_PORT || 587);

  const socket = new net.Socket();
  socket.setTimeout(10000);

  socket.on('connect', () => {
    socket.destroy();
    res.json({ ok: true, host, port });
  });

  socket.on('error', (err) => {
    res.status(500).json({ ok: false, error: err.message });
  });

  socket.connect(port, host);
});

// pricing API (Converted to Async Turso)
app.get('/api/pricing', async (req, res) => {
  try {
    const pricingRes = await db.execute(`SELECT * FROM pricing`);
    res.json(pricingRes.rows);
  } catch (err) {
    console.error('Pricing API error:', err);
    res.status(500).json({ error: 'Failed to load pricing' });
  }
});
//temporary
app.get("/cloudinary-test", async (req, res) => {
  try {
    const result = await cloudinary.api.ping();
    res.json(result);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// =======================================================
//  ABOUT US PAGE
// =======================================================
app.get("/about", (req, res) => {
  res.render("about");
});

// =======================================================
//  404
// =======================================================

app.use((req, res) => {
  res.status(404).render('pages/404', { title: 'Not Found' });
});


process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED PROMISE REJECTION:");
  console.error(err);
});

// =======================================================
//  START SERVER
// =======================================================

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// =======================================================
//  HELPERS
// =======================================================
// Helper 1
function loadHeroSlides() {
  const heroDir = path.join(__dirname, '..', 'public', 'images', 'hero');
  try {
    const files = fs
      .readdirSync(heroDir)
      .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));

    return files.map((f) => ({
      src: `/images/hero/${f}`,
      caption: f.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
    }));
  } catch {
    return [];
  }
}

function serviceFromPrice(serviceSlug, segments) {
  const prices = [];

  for (const seg of segments) {
    const p = seg.pricing || {};
    if (serviceSlug === 'airport-transfer' && p.airport?.pickup)
      prices.push(p.airport.pickup);
    if (serviceSlug === 'local-tour' && p.local?.base)
      prices.push(p.local.base);
    if (
      serviceSlug === 'outstation' &&
      p.outstation?.per_km &&
      p.outstation?.min_km_day
    )
      prices.push(p.outstation.per_km * p.outstation.min_km_day);
  }

  return prices.length ? Math.min(...prices) : null;
}
// Helper 2
function extractFaqs(htmlContent) {
  const faqRegex = /<h3>(.*?)<\/h3>\s*<p>(.*?)<\/p>/g;
  const faqs = [];
  let match;

  while ((match = faqRegex.exec(htmlContent)) !== null) {
    faqs.push({
      question: match[1].replace(/<[^>]+>/g, ''),
      answer: match[2].replace(/<[^>]+>/g, ''),
    });
  }

  return faqs;
}