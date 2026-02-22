// =======================================================
//  Radha Travels — Clean app.js (Admin reset version)
// =======================================================

import express from "express";
import fs from "fs";
import path from "path";
import net from "net";
import cookieParser from "cookie-parser";
import session from "express-session";
import { fileURLToPath } from "url";

// DB
import db from "./db.js";

// Routers
import bookingsRouter from "./routes/bookings.js";
import galleryRoutes from "./routes/galleryRoutes.js";
import fleetRoutes from "./routes/fleet.routes.js";

// Admin (NEW SYSTEM)
import adminAuth from "./admin/admin.auth.js";
import adminRoutes from "./admin/admin.routes.js";
import { requireAdmin } from "./admin/admin.middleware.js";

// Data
import { SERVICES, SEGMENTS } from "../data/services.js";

// -------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// =======================================================
//  MIDDLEWARE
// =======================================================

app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "radha_travels_secret",
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
  console.log("REQ ->", req.method, req.url);
  next();
});

// no-cache globally
app.use((_, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

// =======================================================
//  VIEW ENGINE
// =======================================================

app.set("views", path.join(__dirname, "..", "views"));
app.set("view engine", "ejs");

// =======================================================
//  TICKER
// =======================================================

const TICKER = [
  "✈️ Airport Transfers from ₹1100 — 24/7 Service",
  "🚕 Flat 10% Off on Outstation (Weekdays)",
  "💼 Corporate Billing Available — Monthly Invoices",
  "🚗 Premium SUVs Available on Demand",
  "🧼 Sanitized Cars • Polite Chauffeurs • On-time Guarantee",
];

app.use((_, res, next) => {
  res.locals.ticker = TICKER;
  next();
});



// =======================================================
//  ADMIN (NEW CLEAN SETUP)
// =======================================================
app.use("/admin", (req, res, next) => {
  const path = req.path.split("/")[1] || "dashboard";
  res.locals.active = path;
  next();
});
app.use("/admin", adminAuth);   // /admin/login, /admin/logout
app.use("/admin", adminRoutes); // /admin, /admin/bookings, /admin/gallery

// =======================================================
//  PUBLIC ROUTES
// =======================================================

// Home
app.get("/", (req, res) => {
  let featuredGallery = [];

  try {
    featuredGallery = db
      .prepare(`
        SELECT * FROM gallery
        ORDER BY created_at DESC
        LIMIT 6
      `)
      .all();
  } catch (err) {
    console.error("Featured gallery error:", err.message);
  }
  const featuredFleet = db
    .prepare("SELECT * FROM fleet WHERE status = 'active' ORDER BY id DESC LIMIT 4")
    .all();

  res.render("index", {
    title: "Radha Travels",
    heroSlides: loadHeroSlides(),
    featuredGallery,
    featuredFleet
  });
});

// =========================
// Home special tour package
//==========================

// Dynamic Route for Special Tour Packages
// Dynamic Route for Special Tour Packages
app.get('/tours/:destination', (req, res) => {
  // Grab the destination from the URL (e.g., "srisailam")
  const destId = req.params.destination.toLowerCase();

  // Tour Data Configuration
  const tourData = {
    srisailam: {
      name: "Srisailam",
      heroImage: "/images/srisailam.jpg",
      intro: "Seeking divine blessings from Lord Mallikarjuna Swamy at the sacred hills of Srisailam? Let Radha Travels take you on a comfortable and spiritual journey.",
      
      // --- ADDED FROM SCREENSHOTS ---
      introTitle: "Hyderabad to Srisailam Route & Travel Time",
      distanceInfo: "The distance from Hyderabad to Srisailam is approximately 210 to 230 km, depending on the starting point, and the journey typically takes 5 to 6 hours via the beautiful and scenic Nallamala forest route.",
      routesTitle: "Recommended Route:",
      routes: [
        "Hyderabad – Kalwakurthy – Dornala – Srisailam (via NH 765)"
      ],
      routeExtra: "Enjoy picturesque views, serene forests, and smooth roads throughout the trip. Our drivers are familiar with key halts and can accommodate requests for Sakshi Ganapathi Temple, Pathala Ganga, Srisailam Dam View Point, and more.",
      idealFor: [
        "Family Pilgrimage to Mallikarjuna Jyotirlinga",
        "Temple Trust & Devotee Mandali Trips",
        "Senior Citizen Religious Yatras",
        "Meditation & Spiritual Retreat Groups",
        "School/College Temple Visits",
        "Weekend Devotional Getaways from Hyderabad"
      ],
      idealExtra: "We also offer custom Srisailam packages, including temple darshan, accommodation support, nearby attractions like Akkamahadevi Caves, Paladhara Panchadhara, and optional return same day or next-day trips.",
      whyChoose: [
        "10+ Years of Trusted Religious Tour Service",
        "Devotional & Knowledgeable Drivers",
        "On-Time Pickup & Drop Service",
        "Sanitized Vehicles with Safety Protocols",
        "Transparent Pricing – No Hidden Costs",
        "Round-the-Clock Travel Assistance",
        "One-Way / Round Trip / Multi-Day Options"
      ],
      whyExtra: "We understand the spiritual value of the Srisailam Yatra, and we go the extra mile to ensure a journey that’s sacred, safe, and serene for every traveler."
    },
    
    arunachalam: {
      name: "Arunachalam",
      heroImage: "/images/arunachalam.jpg",
      intro: "Embark on a spiritual journey to the holy Arunachalesvara Temple. Radha Travels ensures a peaceful and timely pilgrimage for your entire group.",
      
      // --- ADDED FROM SCREENSHOTS ---
      introTitle: "Hyderabad to Arunachalam Distance & Route Info",
      distanceInfo: "The distance between Hyderabad and Arunachalam (Tiruvannamalai) is approximately 620–650 km, and the journey takes around 12 to 14 hours by road, depending on route, stops, and traffic.",
      routesTitle: "Popular Route Options:",
      routes: [
        "1. Hyderabad – Kurnool – Kadapa – Chittoor – Arunachalam (via NH 40)",
        "2. Hyderabad – Nandyal – Tirupati – Tiruvannamalai (via NH 716)",
        "3. Hyderabad – Anantapur – Vellore – Arunachalam (via NH 44 & NH 38)"
      ],
      routeExtra: "Our experienced drivers ensure timely arrival for early morning Girivalam, temple darshan, or special poojas, making the journey as spiritual as the destination.",
      idealFor: [
        "Devotee Mandalis Visiting Arunachaleswarar Temple",
        "Family Pilgrimages & Pooja Trips",
        "Spiritual Retreats & Ashram Visits",
        "Senior Citizen Pilgrim Groups",
        "College or Community Devotional Tours",
        "Festival Trips – Karthika Deepam, Pournami Girivalam, Maha Shivaratri"
      ],
      idealExtra: "We also provide custom packages that include nearby spiritual locations such as Ramana Maharshi Ashram, Skandashram, Virupaksha Cave, and Yogi Ram Surat Kumar Ashram, making your trip even more meaningful.",
      whyChoose: [
        "Over a Decade of Travel Experience",
        "Devoted Drivers Familiar with Temple Routes",
        "Transparent Billing – No Hidden Charges",
        "One-Way, Round Trip & Multi-Day Options",
        "Clean, Comfortable & Reliable Vehicles",
        "Round-the-Clock Travel Support",
        "Special Care for Senior Devotees"
      ],
      whyExtra: "At Radha Travels, we understand the spiritual importance of your Arunachalam yatra. Our goal is to provide not just a mode of transport—but a soulful travel experience that is safe, smooth, and full of devotion."
    },
    
    tirupati: {
      name: "Tirupati",
      heroImage: "/images/tirupati.jpg",
      intro: "Experience the divine presence of Lord Venkateswara. We provide premium fleet services for a seamless Tirupati Darshan experience.",
      
      // --- ADDED FROM SCREENSHOTS ---
      introTitle: "Hyderabad to Tirupati Route & Distance",
      distanceInfo: "The road distance between Hyderabad and Tirupati is approximately 550 to 600 km, taking around 10 to 12 hours depending on the route and traffic.",
      routesTitle: "Preferred Routes Include:",
      routes: [
        "1. Hyderabad – Kurnool – Kadapa – Tirupati (via NH 40): Scenic and popular",
        "2. Hyderabad – Nalgonda – Nellore – Tirupati (via NH 565 & NH 16): Less crowded and smoother",
        "3. Hyderabad – Anantapur – Chittoor – Tirupati: For temple trail plans via Rayalaseema"
      ],
      routeExtra: "Our drivers are well-versed with all routes and can also help plan early morning Darshan slots, Sheegra Darshan, or VIP passes as per your preferences.",
      idealFor: [
        "Family Pilgrimages to Tirumala",
        "Devotee Mandali & Temple Groups",
        "Senior Citizen Religious Trips",
        "School & College Temple Excursions",
        "Corporate Devotional Retreats",
        "Pancharama or South Temple Circuit Tours"
      ],
      idealExtra: "We can also arrange custom packages including other nearby temples like Sri Kalahasti, Kanipakam, Golden Temple Vellore, and Kapila Theertham, making your journey a truly spiritual circuit.",
      whyChoose: [
        "10+ Years of Trusted Travel Experience",
        "Affordable Pricing with No Hidden Charges",
        "Trained & Devotional Drivers",
        "Clean & Sanitized Vehicles",
        "Punctual Pickup & Drop",
        "Customizable Pilgrimage Plans",
        "One-Way / Round Trip / Multi-Day Options"
      ],
      whyExtra: "We value the sanctity and significance of your Tirupati trip, and our services are designed to ensure your journey is stress-free, relaxed, and spiritually fulfilling."
    },
    
    shirdi: {
      name: "Shirdi",
      heroImage: "/images/shirdi.jpg",
      intro: "Visit the holy shrine of Sai Baba in Shirdi with absolute comfort. Our dedicated vehicles ensure a safe and peaceful journey for your family.",
      
      // --- ADDED FROM SCREENSHOTS ---
      introTitle: "Hyderabad to Shirdi Route & Distance",
      distanceInfo: "The road distance from Hyderabad to Shirdi is around 600 km and takes approximately 11 to 13 hours, depending on the route and stops.",
      routesTitle: "Popular Routes:",
      routes: [
        "1. Hyderabad – Nizamabad – Nanded – Shirdi",
        "2. Hyderabad – Zaheerabad – Bidar – Shirdi (via NH 65)",
        "3. Hyderabad – Sangareddy – Ahmednagar – Shirdi"
      ],
      routeExtra: "Radha Travels' drivers are well-acquainted with all routes and rest stops. They ensure a smooth, fatigue-free, and timely arrival, allowing you to attend Kakad Aarti, Darshan, or any scheduled pooja at the temple.",
      idealFor: [
        "Family Pilgrimages",
        "Sai Baba Devotee Groups",
        "Mandali/Trust Tours",
        "Senior Citizen Temple Trips",
        "Spiritual & Wellness Retreats",
        "College & Institutional Temple Visits"
      ],
      idealExtra: "We also arrange round trips, multi-day stays, and customized Shirdi Darshan Packages, including nearby spiritual destinations like Shani Shingnapur, Nasik, and Trimbakeshwar on request.",
      whyChoose: [
        "Trusted by Thousands of Devotees",
        "10+ Years of Reliable Travel Service",
        "Clean & Sanitized Vehicles",
        "Affordable Rates – No Hidden Charges",
        "Round-the-Clock Booking Assistance",
        "Custom Routes & Stopovers Available",
        "One-Way, Round-Trip & Multi-Day Rentals"
      ],
      whyExtra: "With Radha Travels, your journey becomes more than just a ride—it becomes a part of your spiritual experience. We understand the importance of punctuality, discipline, and peace of mind, especially during religious tours."
    }
  };

  // Check if the clicked tour exists in our data
  const tour = tourData[destId];

  if (tour) {
    // If it exists, render the details page and pass the data
    res.render('tour-detail', { tour: tour });
  } else {
    // If someone types a random URL like /tours/fakeplace
    res.status(404).send("Tour not found. Please return to the homepage.");
  }
});

// Services
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
  const service = SERVICES.find(s => s.slug === req.params.slug);
  if (!service) {
    return res.status(404).render("pages/404", { title: "Not Found" });
  }

  res.render("services/show", {
    title: `${service.title} | Radha Travels`,
    service,
    details: service.details || { intro: "", routes: [] },
    segments: SEGMENTS,
    isOut: req.params.slug === "outstation",
    isLocal: req.params.slug === "local-tour",
    isAirport: req.params.slug === "airport-transfer",
  });
});

// =======================================================
//  BOOKINGS API
// =======================================================

app.use("/api/bookings", bookingsRouter);

// =======================================================
//  ADMIN PAGES (EXTRA)
// =======================================================

// Assign driver page (admin-only)
app.get("/admin/assign-driver", requireAdmin, (req, res) => {
  res.render("admin/assign-driver");
});

// Allotted bookings page (admin-only)
app.get("/admin/allotted-bookings", requireAdmin, (req, res) => {
  res.render("admin/allotted-bookings");
});

//FLEET SECTION ROUTE
app.get("/fleet", (req, res) => {
  const vehicles = db.prepare(`
    SELECT * FROM fleet
    WHERE is_active = 1
    ORDER BY category ASC, sort_order ASC
  `).all();

  res.render("fleet", {
    title: "Our Fleet | Radha Travels",
    vehicles
  });
});

/* =========================
   BOOKING TRACKING ROUTES
========================= */

// Show tracking page
app.get("/track-booking", (req, res) => {
  res.render("track-booking", {
    title: "Track Booking | Radha Travels",
    booking: null,
    error: null
  });
});

// Handle tracking form submission
app.post("/track-booking", (req, res) => {
  const { bookingId } = req.body;

  const booking = db
    .prepare("SELECT * FROM bookings WHERE booking_id = ?")
    .get(bookingId);

  if (!booking) {
    return res.render("track-booking", {
      title: "Track Booking | Radha Travels",
      booking: null,
      error: "Booking not found. Please check your ID."
    });
  }

  res.render("track-booking", {
    title: "Track Booking | Radha Travels",
    booking,
    error: null
  });
});

// =======================================================
//  GALLERY (PUBLIC)
// =======================================================

app.use("/gallery", galleryRoutes);

// =======================================================
//  FLEET PUBLIC
// =======================================================

app.use("/fleet", fleetRoutes);

// =======================================================
//  SMTP CHECK (UTILITY)
// =======================================================

app.get("/internal/smtp-check", async (req, res) => {
  const host = process.env.MAIL_HOST || "smtp.gmail.com";
  const port = Number(process.env.MAIL_PORT || 587);

  const socket = new net.Socket();
  socket.setTimeout(10000);

  socket.on("connect", () => {
    socket.destroy();
    res.json({ ok: true, host, port });
  });

  socket.on("error", err => {
    res.status(500).json({ ok: false, error: err.message });
  });

  socket.connect(port, host);
});

// =======================================================
//  404
// =======================================================

app.use((req, res) => {
  res.status(404).render("pages/404", { title: "Not Found" });
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
  const heroDir = path.join(__dirname, "..", "public", "images", "hero");
  try {
    const files = fs
      .readdirSync(heroDir)
      .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

    return files.map(f => ({
      src: `/images/hero/${f}`,
      caption: f.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
    }));
  } catch {
    return [];
  }
}

function serviceFromPrice(serviceSlug, segments) {
  const prices = [];

  for (const seg of segments) {
    const p = seg.pricing || {};
    if (serviceSlug === "airport-transfer" && p.airport?.pickup)
      prices.push(p.airport.pickup);
    if (serviceSlug === "local-tour" && p.local?.base)
      prices.push(p.local.base);
    if (serviceSlug === "outstation" && p.outstation?.per_km && p.outstation?.min_km_day)
      prices.push(p.outstation.per_km * p.outstation.min_km_day);
  }

  return prices.length ? Math.min(...prices) : null;
}
