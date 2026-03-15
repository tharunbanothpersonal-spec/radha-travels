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

import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

const blogPosts = [
  {
    slug: 'hyderabad-to-srisailam-cab-cost',
    title: 'Hyderabad to Srisailam Cab Cost (2026 Complete Guide)',
    excerpt:
      'Check latest Hyderabad to Srisailam cab cost, distance, travel time, vehicle options and booking tips for a smooth temple trip.',
    image: '/images/blog/tirupati.jpg',
    date: '2026-02-25',
    content: `
      <p>Srisailam is one of the most popular spiritual destinations from Hyderabad. Whether you are planning a same-day return trip or a 2-day temple visit, understanding the Hyderabad to Srisailam cab cost helps you plan your journey better.</p>

      <h2>Hyderabad to Srisailam Distance & Travel Time</h2>
      <p>The distance from Hyderabad to Srisailam is approximately 210–230 km via NH 765. The journey takes around 5 to 6 hours depending on traffic and road conditions through the scenic Nallamala forest.</p>

      <h2>Hyderabad to Srisailam Cab Cost (Approximate Pricing)</h2>
      <p>The cost depends on vehicle type and duration. Below is a general price estimate:</p>

      <ul>
        <li><strong>Sedan:</strong> ₹11–13 per km</li>
        <li><strong>SUV:</strong> ₹15–18 per km</li>
        <li><strong>Tempo Traveller:</strong> ₹22–26 per km</li>
      </ul>

      <p>For a round trip, total cost may range between ₹4500 – ₹9000 depending on vehicle selection and trip duration.</p>

      <h2>Best Vehicle for Srisailam Trip</h2>
      <p>For small families, a Sedan is comfortable and budget-friendly. For larger groups or temple mandalis, SUVs or Tempo Travellers are recommended for space and comfort.</p>

      <h2>Is Same-Day Return Possible?</h2>
      <p>Yes, many travelers opt for same-day return trips. However, starting early morning is highly recommended to avoid forest traffic delays.</p>

      <h2>Why Book with Radha Travels?</h2>
      <ul>
        <li>Experienced drivers familiar with Srisailam forest route</li>
        <li>Well-maintained AC vehicles</li>
        <li>Transparent pricing</li>
        <li>Customizable temple tour packages</li>
      </ul>

      <p>If you are planning your trip, check our detailed <a href="/tours/srisailam">Hyderabad to Srisailam travel package page</a> for route details and booking options.</p>

      <h2>Frequently Asked Questions</h2>

      <h3>What is the cheapest way to travel from Hyderabad to Srisailam?</h3>
      <p>Booking a Sedan for a round trip is usually the most economical and comfortable option for families.</p>

      <h3>Is night travel safe to Srisailam?</h3>
      <p>While the road is generally safe, forest sections may have restricted timings. Day travel is recommended.</p>

      <h3>How much fuel cost is required for Hyderabad to Srisailam?</h3>
      <p>For a private car, fuel cost may range between ₹2000–₹3000 depending on vehicle mileage.</p>

      <p>For booking assistance, contact Radha Travels and get an instant customized quote.or explore our <a href="/services/outstation">outstation cab services</a>.</p>
    `,
  },
  {
    slug: 'hyderabad-to-tirupati-cab-cost',
    title: 'Hyderabad to Tirupati Cab Cost (2026 Updated Price Guide)',
    excerpt:
      'Check Hyderabad to Tirupati cab cost, distance, travel time, vehicle options and pricing details. Affordable one-way and round trip packages.',
    image: '/images/blog/tirupati.jpg',
    date: '2026-02-25',
    content: `
    <h1>Hyderabad to Tirupati Cab Cost</h1>

    <p>If you are planning a spiritual trip to Tirumala, knowing the <strong>Hyderabad to Tirupati cab cost</strong> helps you plan better. Radha Travels offers affordable and comfortable cab services for families, senior citizens and temple groups.</p>

    <h2>Hyderabad to Tirupati Distance & Travel Time</h2>
    <p>The distance from Hyderabad to Tirupati is approximately <strong>550–600 km</strong>. Travel time usually takes around <strong>10 to 12 hours</strong> depending on traffic and route.</p>

    <h2>Hyderabad to Tirupati Cab Price</h2>
    <ul>
      <li>Sedan: Starting from ₹11 per km</li>
      <li>SUV: Starting from ₹14 per km</li>
      <li>Tempo Traveller: Custom pricing</li>
      <li>Mini Bus: Group packages available</li>
    </ul>

    <p>Exact pricing depends on trip duration, vehicle type and seasonal demand. Contact Radha Travels for an updated quote.</p>

    <h2>One Way vs Round Trip</h2>
    <p>For temple visits, most customers prefer round trip packages. However, we also provide one-way drop services.</p>

    <h2>Why Choose Radha Travels?</h2>
    <ul>
      <li>Experienced drivers familiar with Tirumala routes</li>
      <li>Clean and sanitized vehicles</li>
      <li>On-time pickup and drop</li>
      <li>Transparent pricing</li>
    </ul>

    <h2>Related Temple Routes</h2>
    <p>Planning other temple trips? Check our guides:</p>
    <ul>
      <li><a href="/blog/hyderabad-to-srisailam-cab-cost" class="internal-link">Hyderabad to Srisailam Cab Cost</a></li>
      <li><a href="/tours/tirupati" class="internal-link">Tirupati Tour Package Details</a></li>
    </ul>
  `,
  },
  {
    slug: 'best-outstation-cab-service-in-hyderabad',
    title:
      'Best Outstation Cab Service in Hyderabad (2026 Price & Travel Guide)',
    excerpt:
      'Looking for the best outstation cab service in Hyderabad? Compare prices, vehicle options and route details before booking your next trip.',
    image: '/images/blog/outstation.jpg',
    date: '2026-02-25',
    content: `
    <h1>Best Outstation Cab Service in Hyderabad</h1>

    <p>If you are planning a long road trip from Hyderabad, choosing the right outstation cab service is crucial. Whether you're traveling for pilgrimage, family vacation, or business, Radha Travels offers reliable and affordable outstation taxi services.</p>

    <h2>Why Choose an Outstation Cab Instead of Self-Drive?</h2>
    <ul>
      <li>No driving fatigue</li>
      <li>Experienced highway drivers</li>
      <li>Transparent per km pricing</li>
      <li>Doorstep pickup and drop</li>
    </ul>

    <h2>Popular Outstation Routes from Hyderabad</h2>
    <ul>
      <li><a href="/blog/hyderabad-to-tirupati-cab-cost">Hyderabad to Tirupati Cab Cost Guide</a></li>
      <li><a href="/blog/hyderabad-to-srisailam-cab-cost">Hyderabad to Srisailam Cab Cost Guide</a></li>
      <li><a href="/blog/hyderabad-to-shirdi-cab-cost">Hyderabad to Shirdi Cab Cost Guide</a></li>
      <li><a href="/tours/arunachalam">Hyderabad to Arunachalam Travel Guide</a></li>
    </ul>

    <h2>Outstation Cab Pricing in Hyderabad</h2>
    <p>Outstation cab prices typically depend on:</p>
    <ul>
      <li>Vehicle type (Sedan, SUV, Traveller)</li>
      <li>Total kilometers</li>
      <li>Number of days</li>
      <li>Toll & parking charges</li>
    </ul>

    <p>Average pricing starts from ₹12–₹18 per km for Sedans and ₹18–₹25 per km for SUVs.</p>

    <h2>Vehicles Available for Outstation Trips</h2>
    <ul>
      <li>Sedan – Ideal for 4 passengers</li>
      <li>SUV – Comfortable for 6–7 passengers</li>
      <li>Tempo Traveller – Best for group trips</li>
      <li>Mini Bus – Temple or corporate groups</li>
    </ul>

    <h2>Why Radha Travels is Trusted for Outstation Trips</h2>
    <ul>
      <li>10+ years experience</li>
      <li>Clean & sanitized vehicles</li>
      <li>Professional chauffeurs</li>
      <li>24/7 booking support</li>
      <li>No hidden charges</li>
    </ul>

    <p>If you're planning your next trip, check our <a href="/fleet">fleet options here</a> or <a href="/contact">contact us directly</a> for a quick quote.</p>
  `,
  },
  {
    slug: 'hyderabad-airport-cab-service-guide',
    title: 'Hyderabad Airport Cab Service (2026 Fare Guide & Booking Tips)',
    excerpt:
      'Looking for reliable Hyderabad airport cab service? Compare fares, vehicle options and booking tips for Rajiv Gandhi International Airport transfers.',
    image: '/images/blog/airport.jpg',
    date: '2026-02-25',
    content: `
    <h1>Hyderabad Airport Cab Service – Complete 2026 Guide</h1>

    <p>Booking a reliable airport cab in Hyderabad ensures stress-free travel to or from Rajiv Gandhi International Airport (RGIA). Whether you need a pickup or drop service, choosing the right taxi provider matters.</p>

    <h2>Hyderabad Airport Cab Fare</h2>
    <p>Airport cab fares usually depend on distance and vehicle type.</p>

    <ul>
      <li>Sedan: ₹1100 – ₹1600 (within city limits)</li>
      <li>SUV: ₹1600 – ₹2500</li>
      <li>Tempo Traveller: Based on group size</li>
    </ul>

    <h2>Why Pre-Book Airport Taxi?</h2>
    <ul>
      <li>No surge pricing</li>
      <li>On-time pickup</li>
      <li>Professional drivers</li>
      <li>Flight tracking support</li>
    </ul>

    <h2>Airport Pickup Process</h2>
    <p>Our drivers track your flight in real-time and arrive before landing. You receive driver details and vehicle number via WhatsApp for easy coordination.</p>

    <h2>Airport Drop Tips</h2>
    <ul>
      <li>Start at least 3 hours before domestic flights</li>
      <li>4 hours before international flights</li>
      <li>Keep ID proof ready</li>
    </ul>

    <h2>Why Choose Radha Travels for Airport Transfers?</h2>
    <ul>
      <li>24/7 availability</li>
      <li>Transparent pricing</li>
      <li>Sanitized vehicles</li>
      <li>Corporate billing support</li>
    </ul>

    <p>Check our <a href="/fleet">fleet options</a> or book directly through our <a href="/services/airport-transfer">Airport Transfer Service page</a>.</p>
  `,
  },
  {
    slug: 'hyderabad-local-cab-service-cost',
    title: 'Hyderabad Local Cab Service Cost (Hourly & Full-Day Packages 2026)',
    excerpt:
      'Looking for Hyderabad local cab service? Check hourly rates, full-day packages, vehicle options and booking tips for city travel.',
    image: '/images/blog/local.jpg',
    date: '2026-02-25',
    content: `
    <h1>Hyderabad Local Cab Service Cost (2026 Guide)</h1>

    <p>If you need a taxi for city travel, shopping, business meetings or sightseeing, understanding Hyderabad local cab service pricing helps you choose the right package.</p>

    <h2>Hyderabad Local Cab Packages</h2>
    <ul>
      <li>4 Hours / 40 KM Package</li>
      <li>8 Hours / 80 KM Package</li>
      <li>Full-Day Custom Package</li>
    </ul>

    <h2>Local Cab Pricing in Hyderabad</h2>
    <ul>
      <li>Sedan: Starting from ₹1800 (8 hours)</li>
      <li>SUV: Starting from ₹2500</li>
      <li>Tempo Traveller: Custom pricing</li>
    </ul>

    <p>Additional charges may apply if kilometer limit exceeds the package.</p>

    <h2>Best Use Cases for Local Cab</h2>
    <ul>
      <li>Shopping trips</li>
      <li>Corporate meetings</li>
      <li>Wedding events</li>
      <li>City sightseeing</li>
      <li>Family functions</li>
    </ul>

    <h2>Why Choose Radha Travels for Local Taxi?</h2>
    <ul>
      <li>Professional city drivers</li>
      <li>Transparent pricing</li>
      <li>Sanitized vehicles</li>
      <li>24/7 availability</li>
    </ul>

    <p>Explore our <a href="/fleet">available vehicles</a> or visit our <a href="/services/local-tour">Local Tour Service page</a> for booking details.</p>

    <h2>Related Travel Guides</h2>
    <ul>
      <li><a href="/blog/best-outstation-cab-service-in-hyderabad">Best Outstation Cab Service</a></li>
      <li><a href="/blog/hyderabad-airport-cab-service-guide">Hyderabad Airport Cab Service</a></li>
    </ul>
  `,
  },
  {
    slug: 'hyderabad-to-shirdi-cab-cost',
    title: 'Hyderabad to Shirdi Cab Cost (2026 Complete Price & Travel Guide)',
    excerpt:
      'Check Hyderabad to Shirdi cab cost, distance, travel time, vehicle options and round trip pricing before booking your temple trip.',
    image: '/images/blog/shirdi.jpg',
    date: '2026-02-25',
    content: `
    <h1>Hyderabad to Shirdi Cab Cost (2026 Guide)</h1>

    <p>Planning a spiritual journey to Sai Baba Temple? Understanding the Hyderabad to Shirdi cab cost helps you choose the right vehicle and package for your family or group.</p>

    <h2>Hyderabad to Shirdi Distance & Travel Time</h2>
    <p>The distance between Hyderabad and Shirdi is approximately <strong>600 km</strong>. The journey usually takes <strong>11 to 13 hours</strong> depending on traffic and rest stops.</p>

    <h2>Hyderabad to Shirdi Cab Fare</h2>
    <ul>
      <li>Sedan: ₹13–₹16 per km</li>
      <li>SUV: ₹18–₹24 per km</li>
      <li>Tempo Traveller: Based on group size</li>
      <li>Mini Bus: Custom devotional packages</li>
    </ul>

    <p>Round trip packages are most preferred for Shirdi temple visits.</p>

    <h2>Best Route from Hyderabad to Shirdi</h2>
    <ul>
      <li>Hyderabad – Zaheerabad – Bidar – Ahmednagar – Shirdi</li>
      <li>Hyderabad – Nizamabad – Nanded – Shirdi</li>
    </ul>

    <h2>One-Way vs Round Trip</h2>
    <p>Most devotees choose round trip packages with 1-night stay in Shirdi. One-way drop services are also available on request.</p>

    <h2>Why Book Shirdi Trip with Radha Travels?</h2>
    <ul>
      <li>Experienced drivers for long-distance routes</li>
      <li>Clean & sanitized vehicles</li>
      <li>Transparent pricing</li>
      <li>Temple-friendly travel scheduling</li>
      <li>24/7 booking assistance</li>
    </ul>

    <h2>Related Temple Travel Guides</h2>
    <ul>
      <li><a href="/blog/hyderabad-to-tirupati-cab-cost">Hyderabad to Tirupati Cab Cost</a></li>
      <li><a href="/blog/hyderabad-to-srisailam-cab-cost">Hyderabad to Srisailam Cab Cost</a></li>
      <li><a href="/blog/best-outstation-cab-service-in-hyderabad">Best Outstation Cab Service</a></li>
    </ul>

    <p>Explore our <a href="/fleet">fleet options</a> or contact us for an exact Shirdi trip quotation.</p>
  `,
  },
  {
    slug: 'hyderabad-to-arunachalam-cab-cost',
    title:
      'Hyderabad to Arunachalam Cab Cost (2026 Complete Travel & Price Guide)',
    excerpt:
      'Check Hyderabad to Arunachalam cab cost, distance, travel time and vehicle options for Tiruvannamalai temple trips.',
    image: '/images/blog/arunachalam.jpg',
    date: '2026-02-25',
    content: `
    <h1>Hyderabad to Arunachalam Cab Cost (2026 Guide)</h1>

    <p>Arunachalam (Tiruvannamalai) is one of the most sacred Shiva temples in India. If you're planning a spiritual journey, understanding the Hyderabad to Arunachalam cab cost helps you choose the right travel package.</p>

    <h2>Hyderabad to Arunachalam Distance & Travel Time</h2>
    <p>The distance between Hyderabad and Arunachalam is approximately <strong>620–650 km</strong>. Travel time usually takes around <strong>12 to 14 hours</strong> depending on traffic and route.</p>

    <h2>Hyderabad to Arunachalam Cab Fare</h2>
    <ul>
      <li>Sedan: ₹14–₹18 per km</li>
      <li>SUV: ₹20–₹26 per km</li>
      <li>Tempo Traveller: Based on group size</li>
      <li>Mini Bus: Devotional group packages available</li>
    </ul>

    <p>Most devotees prefer a 2-day round trip package for temple darshan and Girivalam.</p>

    <h2>Best Routes from Hyderabad to Arunachalam</h2>
    <ul>
      <li>Hyderabad – Kurnool – Kadapa – Chittoor – Tiruvannamalai</li>
      <li>Hyderabad – Nandyal – Tirupati – Tiruvannamalai</li>
    </ul>

    <h2>Ideal Time for Girivalam</h2>
    <p>Full moon (Pournami) days attract thousands of devotees for Girivalam. Booking your cab in advance is highly recommended.</p>

    <h2>Why Choose Radha Travels for Arunachalam Trip?</h2>
    <ul>
      <li>Experienced long-distance drivers</li>
      <li>Temple-friendly travel scheduling</li>
      <li>Clean & sanitized vehicles</li>
      <li>Transparent pricing</li>
      <li>24/7 support for devotees</li>
    </ul>

    <h2>Related Temple Travel Guides</h2>
    <ul>
      <li><a href="/blog/hyderabad-to-tirupati-cab-cost">Hyderabad to Tirupati Cab Cost</a></li>
      <li><a href="/blog/hyderabad-to-srisailam-cab-cost">Hyderabad to Srisailam Cab Cost</a></li>
      <li><a href="/blog/hyderabad-to-shirdi-cab-cost">Hyderabad to Shirdi Cab Cost</a></li>
      <li><a href="/blog/best-outstation-cab-service-in-hyderabad">Best Outstation Cab Service</a></li>
    </ul>

    <p>Check our <a href="/fleet">fleet options</a> or contact us directly for an exact Arunachalam travel quote.</p>
  `,
  },
  {
    slug: 'best-time-to-visit-tirupati',
    title: 'Best Time to Visit Tirupati (Complete 2026 Seasonal Guide)',
    excerpt:
      'Planning Tirupati Darshan? Discover the best time to visit Tirupati based on weather, crowd levels and festival seasons.',
    image: '/images/blog/tirupati-season.jpg',
    date: '2026-02-25',
    content: `
    <h1>Best Time to Visit Tirupati (2026 Guide)</h1>

    <p>Tirupati is one of the most visited pilgrimage destinations in India. Choosing the best time to visit Tirupati helps ensure a peaceful darshan experience.</p>

    <h2>Best Season to Visit Tirupati</h2>
    <p><strong>September to February</strong> is considered the ideal time due to pleasant weather and manageable crowds.</p>

    <h2>Summer (March–June)</h2>
    <p>Temperatures can rise above 40°C. Darshan queues may be exhausting during peak heat.</p>

    <h2>Monsoon (July–September)</h2>
    <p>Moderate rains and fewer tourists. Roads are safe but travel time may increase.</p>

    <h2>Winter (October–February)</h2>
    <p>Best season for Tirupati darshan. Comfortable weather and ideal for senior citizens.</p>

    <h2>Festival Rush</h2>
    <ul>
      <li>Brahmotsavam</li>
      <li>Vaikunta Ekadasi</li>
      <li>New Year & Weekends</li>
    </ul>

    <p>Planning your trip? Check our <a href="/blog/hyderabad-to-tirupati-cab-cost">Hyderabad to Tirupati cab cost guide</a> for travel pricing details.</p>
  `,
  },
  {
    slug: 'srisailam-distance-travel-time',
    title: 'Hyderabad to Srisailam Distance & Travel Time (Route Guide 2026)',
    excerpt:
      'Know exact Hyderabad to Srisailam distance, route options, travel duration and road conditions before planning your temple trip.',
    image: '/images/blog/srisailam-route.jpg',
    date: '2026-02-25',
    content: `
    <h1>Hyderabad to Srisailam Distance & Travel Time</h1>

    <p>The distance from Hyderabad to Srisailam is approximately <strong>210–230 km</strong> depending on starting location.</p>

    <h2>Travel Time</h2>
    <p>Average travel time is <strong>5 to 6 hours</strong> via NH 765.</p>

    <h2>Route Details</h2>
    <ul>
      <li>Hyderabad – Kalwakurthy – Dornala – Srisailam</li>
    </ul>

    <h2>Nallamala Forest Route</h2>
    <p>The drive passes through scenic forest roads with beautiful viewpoints.</p>

    <p>Check our detailed <a href="/blog/hyderabad-to-srisailam-cab-cost">Srisailam cab cost guide</a> for pricing.</p>
  `,
  },
  {
    slug: 'shirdi-darshan-timings-guide',
    title: 'Shirdi Darshan Timings Guide (Aarti Schedule & Travel Tips 2026)',
    excerpt:
      'Complete guide to Shirdi Sai Baba temple darshan timings, aarti schedule and best travel planning tips.',
    image: '/images/blog/shirdi-darshan.jpg',
    date: '2026-02-25',
    content: `
    <h1>Shirdi Darshan Timings Guide</h1>

    <p>Planning a visit to Shirdi? Knowing darshan timings helps avoid long queues.</p>

    <h2>Daily Temple Schedule</h2>
    <ul>
      <li>Kakad Aarti – 4:00 AM</li>
      <li>Madhyan Aarti – 12:00 PM</li>
      <li>Dhoop Aarti – Sunset</li>
      <li>Shej Aarti – 10:30 PM</li>
    </ul>

    <h2>Best Time for Darshan</h2>
    <p>Weekdays are less crowded compared to weekends and festivals.</p>

    <p>See travel options in our <a href="/blog/hyderabad-to-shirdi-cab-cost">Hyderabad to Shirdi cab cost guide</a>.</p>
  `,
  },
  {
    slug: 'girivalam-guide-arunachalam',
    title:
      'Girivalam Guide for Arunachalam (Route, Distance & Travel Tips 2026)',
    excerpt:
      'Complete guide to Arunachalam Girivalam including distance, best time, temple route and travel planning tips.',
    image: '/images/blog/girivalam.jpg',
    date: '2026-02-25',
    content: `
    <h1>Girivalam Guide for Arunachalam</h1>

    <p>Girivalam is the sacred 14 km walk around Arunachala Hill performed on full moon days.</p>

    <h2>Girivalam Distance</h2>
    <p>The total distance is approximately <strong>14 km</strong>.</p>

    <h2>Best Time for Girivalam</h2>
    <p>Pournami (Full Moon) nights attract thousands of devotees.</p>

    <h2>Travel from Hyderabad</h2>
    <p>Distance is around 620–650 km and takes 12–14 hours by road.</p>

    <p>Check our <a href="/blog/hyderabad-to-arunachalam-cab-cost">Arunachalam cab cost guide</a> for pricing.</p>
  `,
  },
];
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

  // Tour Data Configuration
  const tourData = {
    srisailam: {
      name: 'Srisailam',
      heroImage: '/images/srisailam.jpg',
      intro:
        'Seeking divine blessings from Lord Mallikarjuna Swamy at the sacred hills of Srisailam? Let Radha Travels take you on a comfortable and spiritual journey.',

      // --- ADDED FROM SCREENSHOTS ---
      introTitle: 'Hyderabad to Srisailam Route & Travel Time',
      distanceInfo:
        'The distance from Hyderabad to Srisailam is approximately 210 to 230 km, depending on the starting point, and the journey typically takes 5 to 6 hours via the beautiful and scenic Nallamala forest route.',
      routesTitle: 'Recommended Route:',
      routes: ['Hyderabad – Kalwakurthy – Dornala – Srisailam (via NH 765)'],
      routeExtra:
        'Enjoy picturesque views, serene forests, and smooth roads throughout the trip. Our drivers are familiar with key halts and can accommodate requests for Sakshi Ganapathi Temple, Pathala Ganga, Srisailam Dam View Point, and more.',
      idealFor: [
        'Family Pilgrimage to Mallikarjuna Jyotirlinga',
        'Temple Trust & Devotee Mandali Trips',
        'Senior Citizen Religious Yatras',
        'Meditation & Spiritual Retreat Groups',
        'School/College Temple Visits',
        'Weekend Devotional Getaways from Hyderabad',
      ],
      idealExtra:
        'We also offer custom Srisailam packages, including temple darshan, accommodation support, nearby attractions like Akkamahadevi Caves, Paladhara Panchadhara, and optional return same day or next-day trips.',
      whyChoose: [
        '10+ Years of Trusted Religious Tour Service',
        'Devotional & Knowledgeable Drivers',
        'On-Time Pickup & Drop Service',
        'Sanitized Vehicles with Safety Protocols',
        'Transparent Pricing – No Hidden Costs',
        'Round-the-Clock Travel Assistance',
        'One-Way / Round Trip / Multi-Day Options',
      ],
      whyExtra:
        'We understand the spiritual value of the Srisailam Yatra, and we go the extra mile to ensure a journey that’s sacred, safe, and serene for every traveler.',
    },

    arunachalam: {
      name: 'Arunachalam',
      heroImage: '/images/arunachalam.jpg',
      intro:
        'Embark on a spiritual journey to the holy Arunachalesvara Temple. Radha Travels ensures a peaceful and timely pilgrimage for your entire group.',

      // --- ADDED FROM SCREENSHOTS ---
      introTitle: 'Hyderabad to Arunachalam Distance & Route Info',
      distanceInfo:
        'The distance between Hyderabad and Arunachalam (Tiruvannamalai) is approximately 620–650 km, and the journey takes around 12 to 14 hours by road, depending on route, stops, and traffic.',
      routesTitle: 'Popular Route Options:',
      routes: [
        '1. Hyderabad – Kurnool – Kadapa – Chittoor – Arunachalam (via NH 40)',
        '2. Hyderabad – Nandyal – Tirupati – Tiruvannamalai (via NH 716)',
        '3. Hyderabad – Anantapur – Vellore – Arunachalam (via NH 44 & NH 38)',
      ],
      routeExtra:
        'Our experienced drivers ensure timely arrival for early morning Girivalam, temple darshan, or special poojas, making the journey as spiritual as the destination.',
      idealFor: [
        'Devotee Mandalis Visiting Arunachaleswarar Temple',
        'Family Pilgrimages & Pooja Trips',
        'Spiritual Retreats & Ashram Visits',
        'Senior Citizen Pilgrim Groups',
        'College or Community Devotional Tours',
        'Festival Trips – Karthika Deepam, Pournami Girivalam, Maha Shivaratri',
      ],
      idealExtra:
        'We also provide custom packages that include nearby spiritual locations such as Ramana Maharshi Ashram, Skandashram, Virupaksha Cave, and Yogi Ram Surat Kumar Ashram, making your trip even more meaningful.',
      whyChoose: [
        'Over a Decade of Travel Experience',
        'Devoted Drivers Familiar with Temple Routes',
        'Transparent Billing – No Hidden Charges',
        'One-Way, Round Trip & Multi-Day Options',
        'Clean, Comfortable & Reliable Vehicles',
        'Round-the-Clock Travel Support',
        'Special Care for Senior Devotees',
      ],
      whyExtra:
        'At Radha Travels, we understand the spiritual importance of your Arunachalam yatra. Our goal is to provide not just a mode of transport—but a soulful travel experience that is safe, smooth, and full of devotion.',
    },

    tirupati: {
      name: 'Tirupati',
      heroImage: '/images/tirupati.jpg',
      intro:
        'Experience the divine presence of Lord Venkateswara. We provide premium fleet services for a seamless Tirupati Darshan experience.',

      // --- ADDED FROM SCREENSHOTS ---
      introTitle: 'Hyderabad to Tirupati Route & Distance',
      distanceInfo:
        'The road distance between Hyderabad and Tirupati is approximately 550 to 600 km, taking around 10 to 12 hours depending on the route and traffic.',
      routesTitle: 'Preferred Routes Include:',
      routes: [
        '1. Hyderabad – Kurnool – Kadapa – Tirupati (via NH 40): Scenic and popular',
        '2. Hyderabad – Nalgonda – Nellore – Tirupati (via NH 565 & NH 16): Less crowded and smoother',
        '3. Hyderabad – Anantapur – Chittoor – Tirupati: For temple trail plans via Rayalaseema',
      ],
      routeExtra:
        'Our drivers are well-versed with all routes and can also help plan early morning Darshan slots, Sheegra Darshan, or VIP passes as per your preferences.',
      idealFor: [
        'Family Pilgrimages to Tirumala',
        'Devotee Mandali & Temple Groups',
        'Senior Citizen Religious Trips',
        'School & College Temple Excursions',
        'Corporate Devotional Retreats',
        'Pancharama or South Temple Circuit Tours',
      ],
      idealExtra:
        'We can also arrange custom packages including other nearby temples like Sri Kalahasti, Kanipakam, Golden Temple Vellore, and Kapila Theertham, making your journey a truly spiritual circuit.',
      whyChoose: [
        '10+ Years of Trusted Travel Experience',
        'Affordable Pricing with No Hidden Charges',
        'Trained & Devotional Drivers',
        'Clean & Sanitized Vehicles',
        'Punctual Pickup & Drop',
        'Customizable Pilgrimage Plans',
        'One-Way / Round Trip / Multi-Day Options',
      ],
      whyExtra:
        'We value the sanctity and significance of your Tirupati trip, and our services are designed to ensure your journey is stress-free, relaxed, and spiritually fulfilling.',
    },

    shirdi: {
      name: 'Shirdi',
      heroImage: '/images/shirdi.jpg',
      intro:
        'Visit the holy shrine of Sai Baba in Shirdi with absolute comfort. Our dedicated vehicles ensure a safe and peaceful journey for your family.',

      // --- ADDED FROM SCREENSHOTS ---
      introTitle: 'Hyderabad to Shirdi Route & Distance',
      distanceInfo:
        'The road distance from Hyderabad to Shirdi is around 600 km and takes approximately 11 to 13 hours, depending on the route and stops.',
      routesTitle: 'Popular Routes:',
      routes: [
        '1. Hyderabad – Nizamabad – Nanded – Shirdi',
        '2. Hyderabad – Zaheerabad – Bidar – Shirdi (via NH 65)',
        '3. Hyderabad – Sangareddy – Ahmednagar – Shirdi',
      ],
      routeExtra:
        "Radha Travels' drivers are well-acquainted with all routes and rest stops. They ensure a smooth, fatigue-free, and timely arrival, allowing you to attend Kakad Aarti, Darshan, or any scheduled pooja at the temple.",
      idealFor: [
        'Family Pilgrimages',
        'Sai Baba Devotee Groups',
        'Mandali/Trust Tours',
        'Senior Citizen Temple Trips',
        'Spiritual & Wellness Retreats',
        'College & Institutional Temple Visits',
      ],
      idealExtra:
        'We also arrange round trips, multi-day stays, and customized Shirdi Darshan Packages, including nearby spiritual destinations like Shani Shingnapur, Nasik, and Trimbakeshwar on request.',
      whyChoose: [
        'Trusted by Thousands of Devotees',
        '10+ Years of Reliable Travel Service',
        'Clean & Sanitized Vehicles',
        'Affordable Rates – No Hidden Charges',
        'Round-the-Clock Booking Assistance',
        'Custom Routes & Stopovers Available',
        'One-Way, Round-Trip & Multi-Day Rentals',
      ],
      whyExtra:
        'With Radha Travels, your journey becomes more than just a ride—it becomes a part of your spiritual experience. We understand the importance of punctuality, discipline, and peace of mind, especially during religious tours.',
    },
  };

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