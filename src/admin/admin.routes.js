import db from '../db.js'; // make sure this import exists at top
import {
  sendBookingConfirmation,
  sendDriverAllotmentEmail,
} from '../mailer.js';
import express from 'express';
import { requireAdmin } from './admin.middleware.js';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/fleet');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

const testimonialStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/testimonials');
  },

  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

const uploadTestimonial = multer({ storage: testimonialStorage });

const router = express.Router();

// 🔹 DEFAULT ADMIN ROOT
router.get('/', requireAdmin, (req, res) => {
  res.redirect('/admin/dashboard');
});

router.get('/dashboard', requireAdmin, (req, res) => {
  const bookings = db.prepare('SELECT * FROM bookings ORDER BY id DESC').all();
  const gallery = db.prepare('SELECT * FROM gallery ORDER BY id DESC').all();
  const fleet = db.prepare('SELECT * FROM fleet ORDER BY id DESC').all();

  // REVIEW ANALYTICS
  const totalReviews = db
    .prepare('SELECT COUNT(*) as c FROM testimonials')
    .get().c;

  const approvedReviews = db
    .prepare("SELECT COUNT(*) as c FROM testimonials WHERE status='approved'")
    .get().c;

  const pendingReviews = db
    .prepare("SELECT COUNT(*) as c FROM testimonials WHERE status='pending'")
    .get().c;

  const avgRating =
    db
      .prepare(
        "SELECT ROUND(AVG(rating),1) as avg FROM testimonials WHERE status='approved'"
      )
      .get().avg || 0;

  const today = new Date().toISOString().split('T')[0];

  const totalVisitors = db
    .prepare(
      `
SELECT COUNT(DISTINCT ip) as total
FROM visitors
`
    )
    .get().total;

  const todayVisitors = db
    .prepare(
      `
SELECT COUNT(DISTINCT ip) as total
FROM visitors
WHERE visit_date = ?
`
    )
    .get(today).total;

  res.render('admin/dashboard', {
    bookings,
    gallery,
    fleet,

    totalReviews,
    approvedReviews,
    pendingReviews,
    avgRating,
    totalVisitors,
    todayVisitors,

    title: 'Dashboard | Admin',
    active: 'dashboard',
  });
});

router.get('/gallery', requireAdmin, (req, res) => {
  let items = [];

  try {
    items = db
      .prepare(
        `
  SELECT
    id,
    title,
    description,
    filepath,
    uploaded_by,
    category,
    status,
    created_at
  FROM gallery
  ORDER BY created_at DESC
`
      )
      .all();
  } catch (err) {
    console.error('Admin gallery error:', err.message);
  }
  res.render('admin/gallery', {
    title: 'Gallery Management | Admin',
    items,
    active: 'gallery',
  });
});

router.get('/bookings', requireAdmin, (req, res) => {
  const bookings = db.prepare('SELECT * FROM bookings ORDER BY id DESC').all();
  res.render('admin/bookings', {
    bookings,
    title: 'Bookings | Admin',
    success: req.query.success,
    active: 'bookings',
  });
});

//booking accept route
router.post('/bookings/confirm/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!booking) return res.redirect('/admin/bookings');

    db.prepare(
      `
      UPDATE bookings
      SET status = 'confirmed'
      WHERE id = ?
    `
    ).run(id);

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
  const { id } = req.params;

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  if (!booking) return res.redirect('/admin/bookings');

  db.prepare(
    `
    UPDATE bookings
    SET status = 'rejected'
    WHERE id = ?
  `
  ).run(id);

  // Send rejection email (simple version)
  try {
    if (booking.email) {
      await sendBookingConfirmation({
        bookingId: booking.booking_id,
        fullName: booking.full_name,
        email: booking.email,
        rejected: true,
      });
    }
  } catch (err) {
    console.error('Rejection email failed:', err);
  }

  res.redirect('/admin/bookings');
});

//delete booking route
router.post('/bookings/delete/:id', requireAdmin, (req, res) => {
  const { id } = req.params;

  db.prepare('DELETE FROM bookings WHERE id = ?').run(id);

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

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!booking) return res.redirect('/admin/bookings');

    // Update DB
    db.prepare(
      `
      UPDATE bookings SET
        driver_name = ?,
        driver_phone = ?,
        vehicle_type = ?,
        vehicle_number = ?,
        vehicle_color = ?,
        status = 'driver_assigned'
      WHERE id = ?
    `
    ).run(
      driverName || null,
      driverPhone || null,
      vehicleType || null,
      vehicleNumber || null,
      vehicleColor || null,
      id
    );

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
        {
          name: driverName,
          phone: driverPhone,
        },
        {
          type: vehicleType,
          number: vehicleNumber,
          color: vehicleColor,
        }
      );
    }

    return res.redirect('/admin/bookings?success=driver_assigned');
  } catch (err) {
    console.error('Driver assignment error:', err);
    return res.redirect('/admin/bookings?error=driver_failed');
  }
});

//gallery delete route
router.post('/gallery/delete/:id', requireAdmin, (req, res) => {
  const { id } = req.params;

  try {
    // 1. Get image path from DB
    const item = db
      .prepare('SELECT filepath FROM gallery WHERE id = ?')
      .get(id);

    if (item?.filepath) {
      const fullPath = path.join(
        process.cwd(),
        'public',
        item.filepath.replace(/^\/+/, '')
      );

      // 2. Delete file if exists
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // 3. Delete DB record
    db.prepare('DELETE FROM gallery WHERE id = ?').run(id);
  } catch (err) {
    console.error('Delete gallery item error:', err.message);
  }

  res.redirect('/admin/gallery');
});

router.post('/gallery/approve/:id', requireAdmin, (req, res) => {
  console.log('✅ APPROVE HIT, ID =', req.params.id);

  const result = db
    .prepare("UPDATE gallery SET status = 'approved' WHERE id = ?")
    .run(req.params.id);

  console.log('🧪 Rows updated:', result.changes);

  res.redirect('/admin/gallery');
});

router.post('/gallery/reject/:id', requireAdmin, (req, res) => {
  try {
    db.prepare("UPDATE gallery SET status = 'rejected' WHERE id = ?").run(
      req.params.id
    );
  } catch (err) {
    console.error('Reject error:', err.message);
  }

  res.redirect('/admin/gallery');
});

// ===============================
// FLEET MANAGEMENT
// ===============================
router.get('/fleet', requireAdmin, (req, res) => {
  const vehicles = db
    .prepare(
      'SELECT * FROM fleet ORDER BY category ASC, sort_order ASC, id DESC'
    )
    .all();

  res.render('admin/fleet', {
    title: 'Fleet Management | Admin',
    vehicles,
    active: 'fleet',
  });
});

router.post('/fleet/delete/:id', requireAdmin, (req, res) => {
  const { id } = req.params;

  db.prepare('DELETE FROM fleet WHERE id = ?').run(id);

  res.redirect('/admin/fleet');
});

// add vehicle in fleet

router.post('/fleet/add', requireAdmin, upload.single('image'), (req, res) => {
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

  const imagePath = req.file ? '/uploads/fleet/' + req.file.filename : null;

  db.prepare(
    `
    INSERT INTO fleet (
      name,
      category,
      seating_capacity,
      luggage_capacity,
      price_per_km,
      price_per_day,
      description,
      sort_order,
      is_active,
      image
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `
  ).run(
    name,
    category,
    seating_capacity || null,
    luggage_capacity || null,
    price_per_km || null,
    price_per_day || null,
    description || null,
    sort_order || 0,
    imagePath
  );

  res.redirect('/admin/fleet');
});

//toggle in fleet

router.post('/fleet/toggle/:id', requireAdmin, (req, res) => {
  const vehicle = db
    .prepare('SELECT is_active FROM fleet WHERE id = ?')
    .get(req.params.id);

  if (!vehicle) return res.redirect('/admin/fleet');

  db.prepare(
    `
    UPDATE fleet
    SET is_active = ?
    WHERE id = ?
  `
  ).run(vehicle.is_active ? 0 : 1, req.params.id);

  res.redirect('/admin/fleet');
});

// vehicle edit

router.post(
  '/fleet/edit/:id',
  requireAdmin,
  upload.single('image'),
  (req, res) => {
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

    let imagePath;

    if (req.file) {
      imagePath = '/uploads/fleet/' + req.file.filename;
    } else {
      const existing = db
        .prepare('SELECT image FROM fleet WHERE id = ?')
        .get(req.params.id);
      imagePath = existing?.image || null;
    }

    db.prepare(
      `
    UPDATE fleet SET
      name = ?,
      category = ?,
      seating_capacity = ?,
      luggage_capacity = ?,
      price_per_km = ?,
      price_per_day = ?,
      description = ?,
      sort_order = ?,
      image = ?
    WHERE id = ?
  `
    ).run(
      name,
      category,
      seating_capacity || null,
      luggage_capacity || null,
      price_per_km || null,
      price_per_day || null,
      description || null,
      sort_order || 0,
      imagePath,
      req.params.id
    );

    res.redirect('/admin/fleet');
  }
);

// ===============================
// TESTIMONIALS MANAGEMENT
// ===============================

router.get('/testimonials', requireAdmin, (req, res) => {
  const filter = req.query.status || 'all';

  let testimonials;

  if (filter === 'approved') {
    testimonials = db
      .prepare(
        "SELECT * FROM testimonials WHERE status='approved' ORDER BY created_at DESC"
      )
      .all();
  } else if (filter === 'pending') {
    testimonials = db
      .prepare(
        "SELECT * FROM testimonials WHERE status='pending' ORDER BY created_at DESC"
      )
      .all();
  } else {
    testimonials = db
      .prepare('SELECT * FROM testimonials ORDER BY created_at DESC')
      .all();
  }

  const total = db.prepare('SELECT COUNT(*) as c FROM testimonials').get().c;
  const approved = db
    .prepare("SELECT COUNT(*) as c FROM testimonials WHERE status='approved'")
    .get().c;
  const pending = db
    .prepare("SELECT COUNT(*) as c FROM testimonials WHERE status='pending'")
    .get().c;

  const avgRating =
    db
      .prepare(
        "SELECT ROUND(AVG(rating),1) as avg FROM testimonials WHERE status='approved'"
      )
      .get().avg || 0;

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
});
router.post('/testimonials/approve/:id', requireAdmin, (req, res) => {
  db.prepare(
    `
UPDATE testimonials
SET status='approved'
WHERE id=?
`
  ).run(req.params.id);

  res.redirect('/admin/testimonials');
});

router.post('/testimonials/reject/:id', requireAdmin, (req, res) => {
  db.prepare(
    `
UPDATE testimonials
SET status='pending'
WHERE id=?
`
  ).run(req.params.id);

  res.redirect('/admin/testimonials');
});

router.post('/testimonials/delete/:id', requireAdmin, (req, res) => {
  db.prepare(
    `
DELETE FROM testimonials
WHERE id=?
`
  ).run(req.params.id);

  res.redirect('/admin/testimonials');
});

//testimonial image replace route
router.post(
  '/testimonials/image/:id',
  requireAdmin,
  uploadTestimonial.single('image'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.redirect('/admin/testimonials');
      }

      const { id } = req.params;

      // 1️⃣ Get existing image from DB
      const testimonial = db
        .prepare('SELECT image FROM testimonials WHERE id = ?')
        .get(id);

      // 2️⃣ Delete old image if exists
      if (testimonial?.image) {
        const fullPath = path.join(
          process.cwd(),
          'public',
          testimonial.image.replace(/^\/+/, '')
        );

        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }

      // 3️⃣ Save new image path
      const imagePath = '/uploads/testimonials/' + req.file.filename;

      db.prepare(
        `
        UPDATE testimonials
        SET image = ?
        WHERE id = ?
      `
      ).run(imagePath, id);
    } catch (err) {
      console.error('Testimonial image replace error:', err.message);
    }

    res.redirect('/admin/testimonials');
  }
);

export default router;
