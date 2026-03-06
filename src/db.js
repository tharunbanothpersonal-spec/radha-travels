// src/db.js (ES module)
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB path (project-root/data/bookings.db)
const DB_PATH =
  process.env.GALLERY_DB_PATH || path.join(__dirname, '..', 'data', 'radha.db');
console.log('🟢 USING GALLERY DB:', DB_PATH);

// ensure data dir exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// open DB (synchronous)
const db = new Database(DB_PATH, { timeout: 5000 });

try {
  db.pragma('journal_mode = WAL');
} catch (e) {
  console.warn('⚠ WAL mode not set:', e.message);
}

db.pragma('busy_timeout = 5000');

// create bookings table if not exists
db.exec(`
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  booking_type TEXT NOT NULL,
  car_type TEXT NOT NULL,
  num_days INTEGER,
  date TEXT,
  time TEXT,
  pickup TEXT,
  notes TEXT,
  service TEXT,
  source TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
// 🔹 Ensure driver columns exist (safe migration)

try {
  db.exec('ALTER TABLE bookings ADD COLUMN driver_name TEXT');
} catch {}
try {
  db.exec('ALTER TABLE bookings ADD COLUMN driver_phone TEXT');
} catch {}
try {
  db.exec('ALTER TABLE bookings ADD COLUMN vehicle_type TEXT');
} catch {}
try {
  db.exec('ALTER TABLE bookings ADD COLUMN vehicle_number TEXT');
} catch {}
try {
  db.exec('ALTER TABLE bookings ADD COLUMN vehicle_color TEXT');
} catch {}

// create gallery table if not exists
db.exec(`
CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT,
  filepath TEXT,
  title TEXT,
  description TEXT,
  type TEXT,
  uploaded_by TEXT,
  category TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
// Ensure gallery status column exists (safe migration)
try {
  db.exec("ALTER TABLE gallery ADD COLUMN status TEXT DEFAULT 'pending'");
} catch {}

// =============================
// FLEET TABLE (CLEAN VERSION)
// =============================

// Create fleet table (new structure)
db.exec(`
CREATE TABLE IF NOT EXISTS fleet (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  seating_capacity INTEGER,
  luggage_capacity INTEGER,
  price_per_km REAL,
  price_per_day REAL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  image TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// =============================
// FIX OLD STRUCTURE IF EXISTS
// =============================

const fleetColumnsCheck = db.prepare('PRAGMA table_info(fleet)').all();
const hasOldSeating = fleetColumnsCheck.some((col) => col.name === 'seating');

if (hasOldSeating) {
  console.log('🔄 Fixing old fleet table structure...');

  db.exec(`
    CREATE TABLE fleet_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      seating_capacity INTEGER,
      luggage_capacity INTEGER,
      price_per_km REAL,
      price_per_day REAL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      image TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    INSERT INTO fleet_new (id, name, category, seating_capacity)
    SELECT id, name, category, seating FROM fleet;
  `);

  db.exec('DROP TABLE fleet;');
  db.exec('ALTER TABLE fleet_new RENAME TO fleet;');

  console.log('✅ Fleet table migrated successfully.');
}

// =============================
// INSERT SAMPLE DATA (ONLY IF EMPTY)
// =============================

const fleetCount = db.prepare('SELECT COUNT(*) as total FROM fleet').get();

if (fleetCount.total === 0) {
  const insert = db.prepare(`
    INSERT INTO fleet 
    (name, category, seating_capacity, luggage_capacity, price_per_km, description, image)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    'Maruti Swift',
    'Hatchback',
    4,
    2,
    12,
    'Perfect for city rides.',
    '/images/fleet/swift.jpg'
  );
  insert.run(
    'Toyota Etios',
    'Sedan',
    4,
    3,
    14,
    'Comfortable sedan.',
    '/images/fleet/etios.jpg'
  );
  insert.run(
    'Honda City',
    'Prime Sedan',
    4,
    3,
    18,
    'Luxury sedan.',
    '/images/fleet/city.jpg'
  );
  insert.run(
    'Toyota Innova',
    'SUV',
    7,
    4,
    20,
    'Family outstation SUV.',
    '/images/fleet/innova.jpg'
  );
  insert.run(
    'Innova Crysta',
    'Prime SUV',
    7,
    4,
    22,
    'Premium SUV travel.',
    '/images/fleet/crysta.jpg'
  );
  insert.run(
    'Tempo Traveller 12 Seater',
    'Tempo Traveller',
    12,
    6,
    28,
    'Group travel vehicle.',
    '/images/fleet/tempo12.jpg'
  );
  insert.run(
    'Mini Bus 25 Seater',
    'Buses',
    25,
    10,
    35,
    'Large group bus.',
    '/images/fleet/minibus.jpg'
  );

  console.log('🚘 Sample Fleet Data Inserted');
}
try {
  db.exec("ALTER TABLE fleet ADD COLUMN status TEXT DEFAULT 'active'");
} catch {}

// =============================
// TESTIMONIALS TABLE
// =============================

db.exec(`
CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  service TEXT NOT NULL,
  review TEXT NOT NULL,
  rating INTEGER NOT NULL,
  image TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// Safe migration
try {
  db.exec('ALTER TABLE testimonials ADD COLUMN service TEXT');
} catch {}

// =============================
// IP COUNT TABLE
// =============================

db.prepare(
  `
CREATE TABLE IF NOT EXISTS visitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT,
  visit_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`
).run();

export default db;
