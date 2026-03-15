import db from '../db.js'; 
import {
  sendBookingConfirmation,
  sendDriverAllotmentEmail,
} from '../mailer.js';
import express from 'express';
import { requireAdmin } from './admin.middleware.js';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

// --- NEW CLOUDINARY IMPORTS ---
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Setup Cloudinary Storage for Fleet
const fleetStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
  folder: "radha_travels/fleet",
  resource_type: "image"
}
});
const upload = multer({ storage: fleetStorage });

// Setup Cloudinary Storage for Testimonials
const testimonialStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'radha_travels/testimonials',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});
const uploadTestimonial = multer({ storage: testimonialStorage });

const router = express.Router();

// 🔹 DEFAULT ADMIN ROOT
router.get('/', requireAdmin, (req, res) => {
  res.redirect('/admin/dashboard');
});

router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const bookingsRes = await db.execute('SELECT * FROM bookings ORDER BY id DESC');
    const bookings = bookingsRes.rows;

    const galleryRes = await db.execute('SELECT * FROM gallery ORDER BY id DESC');
    const gallery = galleryRes.rows;

    const fleetRes = await db.execute('SELECT * FROM fleet ORDER BY id DESC');
    const fleet = fleetRes.rows;

    // REVIEW ANALYTICS
    const totalReviewsRes = await db.execute('SELECT COUNT(*) as c FROM testimonials');
    const totalReviews = totalReviewsRes.rows[0].c;

    const approvedReviewsRes = await db.execute("SELECT COUNT(*) as c FROM testimonials WHERE status='approved'");
    const approvedReviews = approvedReviewsRes.rows[0].c;

    const pendingReviewsRes = await db.execute("SELECT COUNT(*) as c FROM testimonials WHERE status='pending'");
    const pendingReviews = pendingReviewsRes.rows[0].c;

    const avgRatingRes = await db.execute("SELECT ROUND(AVG(rating),1) as avg FROM testimonials WHERE status='approved'");
    const avgRating = avgRatingRes.rows[0].avg || 0;

    const today = new Date().toISOString().split('T')[0];

    const totalVisitorsRes = await db.execute('SELECT COUNT(DISTINCT ip) as total FROM visitors');
    const totalVisitors = totalVisitorsRes.rows[0].total;

    const todayVisitorsRes = await db.execute({
      sql: 'SELECT COUNT(DISTINCT ip) as total FROM visitors WHERE visit_date = ?',
      args: [today]
    });
    const todayVisitors = todayVisitorsRes.rows[0].total;

    const stateVisitorsRes = await db.execute('SELECT state, COUNT(*) as total FROM visitors GROUP BY state ORDER BY total DESC LIMIT 10');
    const stateVisitors = stateVisitorsRes.rows;

    res.render('admin/dashboard', {
      bookings,
      gallery,
      fleet,
      totalReviews,
      approvedReviews,
      pendingReviews,
      avgRating,
      totalVisitors,
      stateVisitors,
      todayVisitors,
      title: 'Dashboard | Admin',
      active: 'dashboard',
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).send('Database Error');
  }
});

router.get('/gallery', requireAdmin, async (req, res) => {
  let items = [];
  try {
    const result = await db.execute(`
      SELECT id, title, description, filepath, uploaded_by, category, status, created_at
      FROM gallery ORDER BY created_at DESC
    `);
    items = result.rows;
  } catch (err) {
    console.error('Admin gallery error:', err.message);
  }
  
  res.render('admin/gallery', {
    title: 'Gallery Management | Admin',
    items,
    active: 'gallery',
  });
});

router.get('/bookings', requireAdmin, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM bookings ORDER BY id DESC');
    res.render('admin/bookings', {
      bookings: result.rows,
      title: 'Bookings | Admin',
      success: req.query.success,
      active: 'bookings',
    });
  } catch (err) {
    console.error('Bookings error:', err);
    res.status(500).send('Database Error');
  }
});

//booking accept route
router.post('/bookings/confirm/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const bookingRes = await db.execute({ sql: 'SELECT * FROM bookings WHERE id = ?', args: [id] });
    const booking = bookingRes.rows[0];
    
    if (!booking) return res.redirect('/admin/bookings');

    await db.execute({
      sql: "UPDATE bookings SET status = 'confirmed' WHERE id = ?",
      args: [id]
    });

    console.log('Booking confirmed:', booking.booking_id);

    // Send confirmation email
    if (booking.email) {
      const mailResult = await sendBookingConfirmation({
        bookingId: booking.booking_id,
        fullName: booking.full_name,
        phone: booking.phone,
        email: booking.email,
        service: booking.service,
        bookingType: booking.booking_type,
        carType: booking.car_type,
        numDays: booking.num_days,
        date: booking.date,
        time: booking.time,
        pickup: booking.pickup,
        notes: booking.notes,
      });
      console.log('Mail result:', mailResult);
    }

    res.redirect('/admin/bookings');
  } catch (err) {
    console.error('Confirm route error:', err);
    res.redirect('/admin/bookings');
  }
});

//booking reject route
router.post('/bookings/reject/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const bookingRes = await db.execute({ sql: 'SELECT * FROM bookings WHERE id = ?', args: [id] });
    const booking = bookingRes.rows[0];
    
    if (!booking) return res.redirect('/admin/bookings');

    await db.execute({
      sql: "UPDATE bookings SET status = 'rejected' WHERE id = ?",
      args: [id]
    });

    // Send rejection email
    if (booking.email) {
      await sendBookingConfirmation({
        bookingId: booking.booking_id,
        fullName: booking.full_name,
        email: booking.email,
        rejected: true,
      });
    }
  } catch (err) {
    console.error('Rejection error:', err);
  }
  
  res.redirect('/admin/bookings');
});

//delete booking route
router.post('/bookings/delete/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute({ sql: 'DELETE FROM bookings WHERE id = ?', args: [id] });
  } catch (err) {
    console.error('Delete booking error:', err);
  }
  res.redirect('/admin/bookings');
});

//Driver allotment route
router.post('/bookings/assign-driver/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      driverName,
      driverPhone,
      vehicleType,
      vehicleNumber,
      vehicleColor,
    } = req.body;

    const bookingRes = await db.execute({ sql: 'SELECT * FROM bookings WHERE id = ?', args: [id] });
    const booking = bookingRes.rows[0];
    
    if (!booking) return res.redirect('/admin/bookings');

    // Update DB
    await db.execute({
      sql: `UPDATE bookings SET driver_name = ?, driver_phone = ?, vehicle_type = ?, vehicle_number = ?, vehicle_color = ?, status = 'driver_assigned' WHERE id = ?`,
      args: [
        driverName || null,
        driverPhone || null,
        vehicleType || null,
        vehicleNumber || null,
        vehicleColor || null,
        id
      ]
    });

    // Send driver allotment email
    if (booking.email) {
      await sendDriverAllotmentEmail(
        {
          bookingId: booking.booking_id,
          fullName: booking.full_name,
          phone: booking.phone,
          email: booking.email,
          date: booking.date,
          time: booking.time,
          pickup: booking.pickup,
          service: booking.service,
          notes: booking.notes,
          carType: booking.car_type,
          bookingType: booking.booking_type,
        },
        { name: driverName, phone: driverPhone },
        { type: vehicleType, number: vehicleNumber, color: vehicleColor }
      );
    }

    return res.redirect('/admin/bookings?success=driver_assigned');
  } catch (err) {
    console.error('Driver assignment error:', err);
    return res.redirect('/admin/bookings?error=driver_failed');
  }
});

//gallery delete route
router.post('/gallery/delete/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // We strictly delete from the database now. Cloudinary hosts the file.
    await db.execute({ sql: 'DELETE FROM gallery WHERE id = ?', args: [id] });
  } catch (err) {
    console.error('Delete gallery item error:', err.message);
  }

  res.redirect('/admin/gallery');
});

router.post('/gallery/approve/:id', requireAdmin, async (req, res) => {
  try {
    await db.execute({ sql: "UPDATE gallery SET status = 'approved' WHERE id = ?", args: [req.params.id] });
  } catch (err) {
    console.error('Approve gallery error:', err.message);
  }
  res.redirect('/admin/gallery');
});

router.post('/gallery/reject/:id', requireAdmin, async (req, res) => {
  try {
    await db.execute({ sql: "UPDATE gallery SET status = 'rejected' WHERE id = ?", args: [req.params.id] });
  } catch (err) {
    console.error('Reject gallery error:', err.message);
  }
  res.redirect('/admin/gallery');
});

// ===============================
// FLEET MANAGEMENT
// ===============================
router.get('/fleet', requireAdmin, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM fleet ORDER BY category ASC, sort_order ASC, id DESC');
    res.render('admin/fleet', {
      title: 'Fleet Management | Admin',
      vehicles: result.rows,
      active: 'fleet',
    });
  } catch (err) {
    console.error('Fleet route error:', err);
    res.status(500).send('Database Error');
  }
});

router.post('/fleet/delete/:id', requireAdmin, async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM fleet WHERE id = ?', args: [req.params.id] });
  } catch (err) {
    console.error('Delete fleet error:', err);
  }
  res.redirect('/admin/fleet');
});

// add vehicle in fleet
router.post('/fleet/add', requireAdmin, upload.single('image'), async (req, res) => {
  try {

    console.log("Fleet upload request received");

    if (!req.file) {
      console.error("No file received from upload");
      return res.redirect('/admin/fleet');
    }

    console.log("Cloudinary upload result:", req.file);

    const {
      name,
      category,
      seating_capacity,
      luggage_capacity,
      price_per_km,
      price_per_day,
      description,
      sort_order,
    } = req.body;

    const imagePath = req.file?.path || null;

    await db.execute({
      sql: `INSERT INTO fleet
      (name, category, seating_capacity, luggage_capacity, price_per_km, price_per_day, description, sort_order, is_active, image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      args: [
        name,
        category,
        seating_capacity || null,
        luggage_capacity || null,
        price_per_km || null,
        price_per_day || null,
        description || null,
        sort_order || 0,
        imagePath
      ]
    });

    console.log("Fleet vehicle inserted successfully");

    res.redirect('/admin/fleet');

  } catch (err) {

    console.error("Fleet add error:", err);

    res.status(500).send("Fleet Upload Failed");

  }
});
//toggle in fleet
router.post('/fleet/toggle/:id', requireAdmin, async (req, res) => {
  try {
    const vehicleRes = await db.execute({ sql: 'SELECT is_active FROM fleet WHERE id = ?', args: [req.params.id] });
    const vehicle = vehicleRes.rows[0];

    if (!vehicle) return res.redirect('/admin/fleet');

    await db.execute({
      sql: 'UPDATE fleet SET is_active = ? WHERE id = ?',
      args: [vehicle.is_active ? 0 : 1, req.params.id]
    });
  } catch (err) {
    console.error('Toggle fleet error:', err);
  }
  res.redirect('/admin/fleet');
});

// vehicle edit
router.post('/fleet/edit/:id', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const {
      name, category, seating_capacity, luggage_capacity,
      price_per_km, price_per_day, description, sort_order,
    } = req.body;

    let imagePath;

    if (req.file) {
      // Assign the Cloudinary URL
      imagePath = req.file.path;
    } else {
      const existingRes = await db.execute({ sql: 'SELECT image FROM fleet WHERE id = ?', args: [req.params.id] });
      imagePath = existingRes.rows[0]?.image || null;
    }

    await db.execute({
      sql: `UPDATE fleet SET name = ?, category = ?, seating_capacity = ?, luggage_capacity = ?, price_per_km = ?, price_per_day = ?, description = ?, sort_order = ?, image = ? WHERE id = ?`,
      args: [
        name, category, seating_capacity || null, luggage_capacity || null,
        price_per_km || null, price_per_day || null, description || null,
        sort_order || 0, imagePath, req.params.id
      ]
    });
  } catch (err) {
    console.error('Edit fleet error:', err);
  }
  res.redirect('/admin/fleet');
});

// ===============================
// TESTIMONIALS MANAGEMENT
// ===============================

router.get('/testimonials', requireAdmin, async (req, res) => {
  try {
    const filter = req.query.status || 'all';
    let testimonials;

    if (filter === 'approved') {
      const resData = await db.execute("SELECT * FROM testimonials WHERE status='approved' ORDER BY created_at DESC");
      testimonials = resData.rows;
    } else if (filter === 'pending') {
      const resData = await db.execute("SELECT * FROM testimonials WHERE status='pending' ORDER BY created_at DESC");
      testimonials = resData.rows;
    } else {
      const resData = await db.execute('SELECT * FROM testimonials ORDER BY created_at DESC');
      testimonials = resData.rows;
    }

    const totalRes = await db.execute('SELECT COUNT(*) as c FROM testimonials');
    const total = totalRes.rows[0].c;

    const approvedRes = await db.execute("SELECT COUNT(*) as c FROM testimonials WHERE status='approved'");
    const approved = approvedRes.rows[0].c;

    const pendingRes = await db.execute("SELECT COUNT(*) as c FROM testimonials WHERE status='pending'");
    const pending = pendingRes.rows[0].c;

    const avgRatingRes = await db.execute("SELECT ROUND(AVG(rating),1) as avg FROM testimonials WHERE status='approved'");
    const avgRating = avgRatingRes.rows[0].avg || 0;

    res.render('admin/testimonials', {
      title: 'Testimonials | Admin',
      testimonials,
      total,
      approved,
      pending,
      avgRating,
      filter,
      active: 'testimonials',
    });
  } catch (err) {
    console.error('Testimonials route error:', err);
    res.status(500).send('Database Error');
  }
});

router.post('/testimonials/approve/:id', requireAdmin, async (req, res) => {
  try {
    await db.execute({ sql: "UPDATE testimonials SET status='approved' WHERE id=?", args: [req.params.id] });
  } catch (err) {
    console.error('Approve testimonial error:', err);
  }
  res.redirect('/admin/testimonials');
});

router.post('/testimonials/reject/:id', requireAdmin, async (req, res) => {
  try {
    await db.execute({ sql: "UPDATE testimonials SET status='pending' WHERE id=?", args: [req.params.id] });
  } catch (err) {
    console.error('Reject testimonial error:', err);
  }
  res.redirect('/admin/testimonials');
});

router.post('/testimonials/delete/:id', requireAdmin, async (req, res) => {
  try {
    await db.execute({ sql: "DELETE FROM testimonials WHERE id=?", args: [req.params.id] });
  } catch (err) {
    console.error('Delete testimonial error:', err);
  }
  res.redirect('/admin/testimonials');
});

//testimonial image replace route
router.post('/testimonials/image/:id', requireAdmin, uploadTestimonial.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.redirect('/admin/testimonials');

    const { id } = req.params;

    // Grab the permanent Cloudinary URL
    const imagePath = req.file.path;

    // Update the database directly, avoiding local file deletions
    await db.execute({ sql: "UPDATE testimonials SET image = ? WHERE id = ?", args: [imagePath, id] });
  } catch (err) {
    console.error('Testimonial image replace error:', err.message);
  }
  res.redirect('/admin/testimonials');
});

//pricing admin
router.get('/pricing', requireAdmin, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM pricing ORDER BY service, vehicle');
    res.render('admin/pricing', {
      title: 'Pricing Management | Admin',
      pricing: result.rows,
      active: 'pricing'
    });
  } catch (err) {
    console.error('Pricing route error:', err);
    res.status(500).send('Database Error');
  }
});

router.post('/pricing/update/:id', requireAdmin, async (req, res) => {
  try {
    const { per_km, driver_allowance, base_price, flat_price } = req.body;

    await db.execute({
      sql: `UPDATE pricing SET per_km=?, driver_allowance=?, base_price=?, flat_price=? WHERE id=?`,
      args: [
        per_km || null,
        driver_allowance || null,
        base_price || null,
        flat_price || null,
        req.params.id
      ]
    });
  } catch (err) {
    console.error('Pricing update error:', err);
  }
  res.redirect('/admin/pricing');
});

export default router;