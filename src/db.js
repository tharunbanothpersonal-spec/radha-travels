// src/db.js (ES module)
import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

// Connect to Turso Cloud DB
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

console.log('🟢 CONNECTED TO TURSO CLOUD DB');

async function initDB() {
  try {
    // =============================
    // 1. CREATE ALL TABLES
    // =============================
    
    await db.execute(`
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

    await db.execute(`
      CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        filepath TEXT,
        title TEXT,
        description TEXT,
        type TEXT,
        uploaded_by TEXT,
        category TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    await db.execute(`
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
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    await db.execute(`
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

    // Add this line to nuke the broken table
    await db.execute('DROP TABLE IF EXISTS visitors');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS visitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT,
        visit_date TEXT,
        state TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS pricing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service TEXT,
        vehicle TEXT,
        per_km INTEGER,
        min_km_per_day INTEGER,
        driver_allowance INTEGER,
        base_price INTEGER,
        base_km INTEGER,
        base_hours INTEGER,
        extra_per_hour INTEGER,
        flat_price INTEGER
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT,
        reset_token TEXT,
        reset_token_expires INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // =============================
    // 2. FORCE SAFE MIGRATIONS 
    // =============================
    // This forces Turso to add these columns if they were missed in previous runs
    const migrations = [
      'ALTER TABLE bookings ADD COLUMN driver_name TEXT',
      'ALTER TABLE bookings ADD COLUMN driver_phone TEXT',
      'ALTER TABLE bookings ADD COLUMN vehicle_type TEXT',
      'ALTER TABLE bookings ADD COLUMN vehicle_number TEXT',
      'ALTER TABLE bookings ADD COLUMN vehicle_color TEXT',
      'ALTER TABLE admins ADD COLUMN email TEXT'
    ];

   for (const query of migrations) {
      try {
        await db.execute(query);
      } catch (e) {
        // If the error ISN'T just "column already exists", log it so we can see it!
        if (!e.message.includes("duplicate column name")) {
           console.error(`⚠️ Migration failed for query: ${query}`);
           console.error(`Reason: ${e.message}`);
        }
      }
    }

    // =============================
    // 3. INSERT SAMPLE DATA
    // =============================

    // Fleet Data
    const fleetCheck = await db.execute('SELECT COUNT(*) as total FROM fleet');
    if (fleetCheck.rows[0].total === 0) {
      const fleetData = [
        ['Maruti Swift', 'Hatchback', 4, 2, 12, 'Perfect for city rides.', '/images/fleet/swift.jpg'],
        ['Toyota Etios', 'Sedan', 4, 3, 14, 'Comfortable sedan.', '/images/fleet/etios.jpg'],
        ['Honda City', 'Prime Sedan', 4, 3, 18, 'Luxury sedan.', '/images/fleet/city.jpg'],
        ['Toyota Innova', 'SUV', 7, 4, 20, 'Family outstation SUV.', '/images/fleet/innova.jpg'],
        ['Innova Crysta', 'Prime SUV', 7, 4, 22, 'Premium SUV travel.', '/images/fleet/crysta.jpg'],
        ['Tempo Traveller 12 Seater', 'Tempo Traveller', 12, 6, 28, 'Group travel vehicle.', '/images/fleet/tempo12.jpg'],
        ['Mini Bus 25 Seater', 'Buses', 25, 10, 35, 'Large group bus.', '/images/fleet/minibus.jpg']
      ];

      for (const car of fleetData) {
        await db.execute({
          sql: `INSERT INTO fleet (name, category, seating_capacity, luggage_capacity, price_per_km, description, image) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: car
        });
      }
      console.log('🚘 Sample Fleet Data Inserted');
    }

    // Pricing Data
    const pricingCheck = await db.execute('SELECT COUNT(*) as c FROM pricing');
    if (pricingCheck.rows[0].c === 0) {
      const pricingData = [
        ['Outstation', 'Hatchback', 12, 300, 400, null, null, null, null, null],
        ['Outstation', 'Sedan', 14, 300, 500, null, null, null, null, null],
        ['Outstation', 'Premium Sedan', 16, 300, 600, null, null, null, null, null],
        ['Outstation', 'SUV', 18, 300, 600, null, null, null, null, null],
        ['Outstation', 'Premium SUV', 22, 300, 700, null, null, null, null, null],
        ['Local', 'Hatchback', 12, null, null, 2200, 80, 8, 150, null],
        ['Local', 'Sedan', 14, null, null, 2600, 80, 8, 200, null],
        ['Local', 'Premium Sedan', 16, null, null, 3200, 80, 8, 250, null],
        ['Local', 'SUV', 18, null, null, 3500, 80, 8, 250, null],
        ['Local', 'Premium SUV', 22, null, null, 4200, 80, 8, 300, null],
        ['Airport', 'Hatchback', null, null, null, null, null, null, null, 1100],
        ['Airport', 'Sedan', null, null, null, null, null, null, null, 1300],
        ['Airport', 'Premium Sedan', null, null, null, null, null, null, null, 1600],
        ['Airport', 'SUV', null, null, null, null, null, null, null, 1800],
        ['Airport', 'Premium SUV', null, null, null, null, null, null, null, 2200]
      ];

      for (const price of pricingData) {
        await db.execute({
          sql: `INSERT INTO pricing (service, vehicle, per_km, min_km_per_day, driver_allowance, base_price, base_km, base_hours, extra_per_hour, flat_price) VALUES (?,?,?,?,?,?,?,?,?,?)`,
          args: price
        });
      }
    }

    // Admin Data
    const adminCheck = await db.execute('SELECT COUNT(*) as c FROM admins');
    if (adminCheck.rows[0].c === 0) {
      await db.execute({
        sql: `INSERT INTO admins (username, password, email) VALUES (?, ?, ?)`,
        args: ['admin', 'admin123', 'booking@radhatravels.co.in']
      });
      console.log('🛡️ Default Admin User Inserted');
    } else {
      await db.execute(`UPDATE admins SET email = 'booking@radhatravels.co.in' WHERE username = 'admin'`);
    }

    console.log('✅ ALL CLOUD TABLES INITIALIZED');

  } catch (error) {
    console.error('❌ Database Initialization Error:', error);
  }
}

// Run the setup
initDB();

export default db;