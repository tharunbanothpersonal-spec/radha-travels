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
import rateLimit from 'express-rate-limit'; // 🚀 FIX: Imported rate limiter for security

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
// =======================================================
//  DYNAMIC XML SITEMAP (SEO)
// =======================================================
app.get('/sitemap.xml', (req, res) => {
  res.header('Content-Type', 'application/xml');

  const baseUrl = 'https://radhatravels.co.in';
  const today = new Date().toISOString().split('T')[0];

  // 1. Core Static Pages
  const staticPages = [
    '',
    '/about',
    '/services',
    '/fleet',
    '/blog',
    '/gallery',
    '/track-booking'
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Generate URLs for Static Pages
  staticPages.forEach(page => {
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}${page}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>${page === '' ? '1.0' : '0.8'}</priority>\n`;
    xml += `  </url>\n`;
  });

  // Generate URLs for Dynamic Services
  if (typeof SERVICES !== 'undefined') {
    SERVICES.forEach(service => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/services/${service.slug}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.9</priority>\n`;
      xml += `  </url>\n`;
    });
  }

  // Generate URLs for Dynamic Tours (Srisailam, Tirupati, etc.)
  if (typeof tourData !== 'undefined') {
    Object.keys(tourData).forEach(dest => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/tours/${dest}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.9</priority>\n`;
      xml += `  </url>\n`;
    });
  }

  // Generate URLs for Dynamic Blog Posts
  if (typeof blogPosts !== 'undefined') {
    blogPosts.forEach(post => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`;
      // Use the blog post's actual date if it exists, otherwise use today's date
      const postDate = post.date ? new Date(post.date).toISOString().split('T')[0] : today;
      xml += `    <lastmod>${postDate}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    });
  }

  xml += `</urlset>`;

  res.send(xml);
});

// 2. Dynamic Robots.txt (MOVED UP)
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(
    `User-agent: *\nAllow: /\n\nSitemap: https://radhatravels.co.in/sitemap.xml`
  );
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// 🚀 FIX: Hardened session cookies to prevent hijacking
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'radha_travels_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Requires HTTPS in production
      httpOnly: true, // Prevents JavaScript from reading the cookie
      maxAge: 1000 * 60 * 60 * 24 // 1 day expiration
    }
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

// Global SEO fallback
app.use((req, res, next) => {
  res.locals.metaDescription =
    'Book reliable Hyderabad cab service with Radha Travels. Airport transfers, outstation trips and temple tours available 24/7.';
  next();
});

// =======================================================
//  UPTIMEROBOT HEALTH CHECK (MUST BE ABOVE trackVisitor)
// =======================================================
app.get('/ping', (req, res) => {
  res.status(200).send('awake');
});

//for IP visitor counter
app.use(trackVisitor);

// =======================================================
//  VIEW ENGINE
// =======================================================

app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'ejs');

// =======================================================
//  TICKER & CACHED DATA
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

// 🚀 FIX: Read the image directory ONCE when the server starts, not on every page load
const cachedHeroSlides = loadHeroSlides();

// =======================================================
//  ADMIN (NEW CLEAN SETUP)
// =======================================================
app.use('/admin', (req, res, next) => {
  // 🚀 FIX: Prevent browser from caching admin pages on "Back" button
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');

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

app.get('/blog', (req, res) => {
  res.render('blog/blog-index', {
    title: 'Travel Blog & Pilgramage Guides | Radha Travels',
    currentPath: req.path, // 🚀 FIX: Added currentPath for Canonical Tag
    posts: blogPosts,
  });
});

app.get('/blog/:slug', (req, res) => {
  const post = blogPosts.find((p) => p.slug === req.params.slug);

  if (!post) {
    return res.status(404).render('pages/404', { title: 'Not Found' });
  }

  const relatedPosts = blogPosts
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);

  res.render('blog/blog-show', {
    title: `${post.title} | Radha Travels`,
    metaDescription: `Read our comprehensive guide: ${post.title}. Discover the best travel tips, temple timings, and cab booking options from Hyderabad.`, // 🚀 FIX: Dynamic SEO Description
    currentPath: req.path, // 🚀 FIX: Added currentPath for Canonical Tag
    post,
    relatedPosts,
    faqs: extractFaqs(post.content),
  });
});

// API Routes
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

app.get('/', async (req, res) => {
  // 🚀 FIX: Wrapped entire DB block in try/catch to prevent server crash if Turso goes down
  try {
    const galleryRes = await db.execute(`SELECT * FROM gallery ORDER BY created_at DESC LIMIT 6`);
    const featuredGallery = galleryRes.rows;
    
    const fleetRes = await db.execute('SELECT * FROM fleet WHERE is_active = 1 ORDER BY id DESC LIMIT 4');
    const featuredFleet = fleetRes.rows;
    
    const randomTestRes = await db.execute(`SELECT * FROM testimonials WHERE status='approved' ORDER BY RANDOM() LIMIT 4`);
    const randomTestimonials = randomTestRes.rows;
    
    const testimonialsRes = await db.execute(`SELECT * FROM testimonials WHERE status='approved'`);
    const testimonials = testimonialsRes.rows;

    const avgRating = testimonials.length ? (testimonials.reduce((a, b) => a + b.rating, 0) / testimonials.length).toFixed(1) : 0;
    const totalReviews = testimonials.length;

    const ratingPercentages = {};
    for (let i = 1; i <= 5; i++) {
      const count = testimonials.filter((t) => t.rating === i).length;
      ratingPercentages[i] = testimonials.length ? (count / testimonials.length) * 100 : 0;
    }

    const today = new Date().toISOString().split('T')[0];
    const todayVisRes = await db.execute({ sql: `SELECT COUNT(DISTINCT ip) as total FROM visitors WHERE visit_date = ?`, args: [today] });
    const todayVisitors = todayVisRes.rows[0].total;

    res.render('index', {
      title: 'Hyderabad Cab Service | Outstation, Airport & Tempo Traveller | Radha Travels',
      currentPath: req.path,
      heroSlides: cachedHeroSlides, // 🚀 FIX: Using the cached array here for blazing fast load times
      featuredGallery,
      featuredFleet,
      testimonials,
      avgRating,
      totalReviews,
      ratingPercentages,
      randomTestimonials,
      totalVisitors: res.locals.totalVisitors,
      todayVisitors,
      latestPosts: blogPosts
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3)
        .map((post) => ({
          ...post,
          readTime: Math.ceil(post.content.split(' ').length / 200),
        })),
    });

  } catch (err) {
    console.error('Home page database error:', err.message);
    // Render the homepage even if DB fails, providing empty arrays so it doesn't crash
    res.render('index', {
      title: 'Hyderabad Cab Service | Radha Travels',
      currentPath: req.path,
      heroSlides: cachedHeroSlides,
      featuredGallery: [], featuredFleet: [], testimonials: [], randomTestimonials: [],
      avgRating: 0, totalReviews: 0, ratingPercentages: {1:0, 2:0, 3:0, 4:0, 5:0},
      totalVisitors: 0, todayVisitors: 0, latestPosts: []
    });
  }
});

// Dynamic Route for Special Tour Packages
app.get('/tours/:destination', (req, res) => {
  const destId = req.params.destination.toLowerCase();
  const tour = tourData[destId];

  if (tour) {
    res.render('tour-detail', {
      title: `Hyderabad to ${tour.name} Cab Service | Temple Trip Package | Radha Travels`,
      metaDescription: `Book a premium cab from Hyderabad to ${tour.name}. Safe, reliable, and sanitized vehicles. View pricing, itineraries, and secure your booking today.`, // 🚀 FIX: Dynamic SEO added
      currentPath: req.path, // 🚀 FIX: Canonical URL setup
      tour: tour,
      pageSchema: JSON.stringify(tour.schema),
    });
  } else {
    res.status(404).render('pages/404', { title: 'Not Found' });
  }
});

// Services
app.get('/services', (req, res) => {
  const servicesWithFrom = SERVICES.map((s) => ({
    ...s,
    from: serviceFromPrice(s.slug, SEGMENTS),
  }));

  res.render('services/index', {
    title: 'Cab Services in Hyderabad | Airport, Outstation & Local Rentals | Radha Travels',
    currentPath: req.path,
    services: servicesWithFrom,
  });
});

// Service detail
app.get('/services/:slug', async (req, res) => {
  const service = SERVICES.find((s) => s.slug === req.params.slug);

  if (!service) {
    return res.status(404).render('pages/404', { title: 'Not Found' });
  }

  try {
    const pricingRes = await db.execute(`SELECT * FROM pricing`);
    const pricingMap = {};

    pricingRes.rows.forEach((row) => {
      if (!pricingMap[row.vehicle]) pricingMap[row.vehicle] = {};
      pricingMap[row.vehicle][row.service] = row;
    });

    const segments = SEGMENTS.map((seg) => {
      const dbVehicle = pricingMap[seg.label];
      if (!dbVehicle) return seg;
      return {
        ...seg,
        pricing: {
          local: dbVehicle.Local ? { pack: '8Hrs / 80KM', base: dbVehicle.Local.base_price, extra_km: dbVehicle.Local.per_km, extra_hr: dbVehicle.Local.extra_per_hour, driver: 0 } : seg.pricing.local,
          outstation: dbVehicle.Outstation ? { per_km: dbVehicle.Outstation.per_km, min_km_day: dbVehicle.Outstation.min_km_per_day, driver: dbVehicle.Outstation.driver_allowance, night: dbVehicle.Outstation.driver_allowance } : seg.pricing.outstation,
          airport: dbVehicle.Airport ? { pickup: dbVehicle.Airport.flat_price, drop: dbVehicle.Airport.flat_price, waiting_per_hr: 200 } : seg.pricing.airport,
        },
      };
    });

    res.render('services/show', {
      title: `${service.title} in Hyderabad | Radha Travels`,
      metaDescription: `Reliable and affordable ${service.title.toLowerCase()} in Hyderabad. Book Sedans, SUVs, and Tempo Travellers securely with Radha Travels.`, // 🚀 FIX: Dynamic SEO
      currentPath: req.path,
      service,
      segments,
    });
  } catch (err) {
    console.error('Service page error:', err);
    res.status(500).send('Database Error');
  }
});

// =======================================================
//  BOOKINGS API (SECURITY UPGRADED)
// =======================================================

// 🚀 FIX: Rate limiter prevents spam bots from crashing your database or submitting fake bookings
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // Limit each IP to 10 requests per window
  message: { error: 'Too many booking requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true, 
  legacyHeaders: false, 
});

app.use('/api/bookings', bookingLimiter, bookingsRouter);

// =======================================================
//  ADMIN PAGES
// =======================================================

app.get('/admin/assign-driver', requireAdmin, (req, res) => res.render('admin/assign-driver'));
app.get('/admin/allotted-bookings', requireAdmin, (req, res) => res.render('admin/allotted-bookings'));

//FLEET SECTION ROUTE
app.get('/fleet', async (req, res) => {
  try {
    const fleetRes = await db.execute(`SELECT * FROM fleet WHERE is_active = 1 ORDER BY category ASC, sort_order ASC`);
    res.render('fleet', {
      title: 'Tempo Traveller & Cab Rental in Hyderabad | SUV, Sedan & Bus | Radha Travels',
      currentPath: req.path,
      vehicles: fleetRes.rows,
    });
  } catch (err) {
    console.error('Fleet page error:', err);
    res.status(500).send('Database Error');
  }
});

// TRACKING ROUTES
app.get('/track-booking', (req, res) => {
  res.render('track-booking', {
    title: 'Track Your Cab Booking Online | Radha Travels Hyderabad',
    currentPath: req.path,
    booking: null,
    error: null,
  });
});

app.post('/track-booking', async (req, res) => {
  const { bookingId } = req.body;
  try {
    const bookingRes = await db.execute({ sql: 'SELECT * FROM bookings WHERE booking_id = ?', args: [bookingId] });
    const booking = bookingRes.rows[0];

    if (!booking) {
      return res.render('track-booking', {
        title: 'Track Your Cab Booking Online | Radha Travels Hyderabad',
        currentPath: req.path,
        booking: null,
        error: 'Booking not found. Please check your ID.',
      });
    }

    res.render('track-booking', { title: 'Track Booking | Radha Travels', currentPath: req.path, booking, error: null });
  } catch (err) {
    console.error('Track booking error:', err);
    res.status(500).send('Database Error');
  }
});

// OTHER PUBLIC ROUTES
app.use('/gallery', galleryRoutes);
app.use('/fleet', fleetRoutes);
app.use(testimonialsRoutes);

// ABOUT US PAGE
app.get("/about", (req, res) => {
  res.render("about", {
    title: "About Us | Radha Travels Hyderabad",
    currentPath: req.path
  });
});




// UTILITY
app.get('/internal/smtp-check', async (req, res) => {
  const host = process.env.MAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.MAIL_PORT || 587);
  const socket = new net.Socket();
  socket.setTimeout(10000);
  socket.on('connect', () => { socket.destroy(); res.json({ ok: true, host, port }); });
  socket.on('error', (err) => { res.status(500).json({ ok: false, error: err.message }); });
  socket.connect(port, host);
});

app.get('/api/pricing', async (req, res) => {
  try {
    const pricingRes = await db.execute(`SELECT * FROM pricing`);
    res.json(pricingRes.rows);
  } catch (err) {
    console.error('Pricing API error:', err);
    res.status(500).json({ error: 'Failed to load pricing' });
  }
});

app.get("/cloudinary-test", async (req, res) => {
  try {
    const result = await cloudinary.api.ping();
    res.json(result);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// =======================================================
//  404 & ERROR HANDLING
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

function loadHeroSlides() {
  try {
    const heroDir = path.join(__dirname, '..', 'public', 'images', 'hero');
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
    if (serviceSlug === 'airport-transfer' && p.airport?.pickup) prices.push(p.airport.pickup);
    if (serviceSlug === 'local-tour' && p.local?.base) prices.push(p.local.base);
    if (serviceSlug === 'outstation' && p.outstation?.per_km && p.outstation?.min_km_day) prices.push(p.outstation.per_km * p.outstation.min_km_day);
  }
  return prices.length ? Math.min(...prices) : null;
}

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