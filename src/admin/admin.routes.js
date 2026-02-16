import db from "../db.js"; // make sure this import exists at top
import { sendBookingConfirmation, sendDriverAllotmentEmail } from "../mailer.js";
import express from "express";
import { requireAdmin } from "./admin.middleware.js";
import fs from "fs";
import path from "path";



const router = express.Router();

// 🔹 DEFAULT ADMIN ROOT
router.get("/", requireAdmin, (req, res) => {
  res.redirect("/admin/dashboard");
});

router.get("/dashboard", requireAdmin, (req, res) => {

  const bookings = db.prepare("SELECT * FROM bookings ORDER BY id DESC").all();
  const gallery = db.prepare("SELECT * FROM gallery ORDER BY id DESC").all();

  res.render("admin/dashboard", {
    bookings,
    gallery,
    title: "Dashboard | Admin"
  });

});


router.get("/gallery", requireAdmin, (req, res) => {
  let items = [];

  try {
    items = db.prepare(`
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
`).all();
  } catch (err) {
    console.error("Admin gallery error:", err.message);
  }
  res.render("admin/gallery", {
  title: "Gallery Management | Admin",
  items
});
});


router.get("/bookings", requireAdmin, (req, res) => {

  const bookings = db.prepare("SELECT * FROM bookings ORDER BY id DESC").all();
  res.render("admin/bookings", {
    bookings,
    title: "Bookings | Admin",
    success: req.query.success
  });

});


//booking accept route
router.post("/bookings/confirm/:id", requireAdmin, async (req, res) => {

  try {
    const { id } = req.params;

    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
    if (!booking) return res.redirect("/admin/bookings");

    db.prepare(`
      UPDATE bookings
      SET status = 'confirmed'
      WHERE id = ?
    `).run(id);

    console.log("Booking confirmed:", booking.booking_id);

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
        notes: booking.notes
      });

      console.log("Mail result:", mailResult);
    }

    res.redirect("/admin/bookings");

  } catch (err) {
    console.error("Confirm route error:", err);
    res.redirect("/admin/bookings");
  }

});


//booking reject route
router.post("/bookings/reject/:id", requireAdmin, async (req, res) => {

  const { id } = req.params;

  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
  if (!booking) return res.redirect("/admin/bookings");

  db.prepare(`
    UPDATE bookings
    SET status = 'rejected'
    WHERE id = ?
  `).run(id);

  // Send rejection email (simple version)
  try {
    if (booking.email) {
      await sendBookingConfirmation({
        bookingId: booking.booking_id,
        fullName: booking.full_name,
        email: booking.email,
        rejected: true
      });
    }
  } catch (err) {
    console.error("Rejection email failed:", err);
  }

  res.redirect("/admin/bookings");
});

//delete booking route
router.post("/bookings/delete/:id", requireAdmin, (req, res) => {

  const { id } = req.params;

  db.prepare("DELETE FROM bookings WHERE id = ?").run(id);

  res.redirect("/admin/bookings");
});

//Driver allotment route
router.post("/bookings/assign-driver/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      driverName,
      driverPhone,
      vehicleType,
      vehicleNumber,
      vehicleColor
    } = req.body;

    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
    if (!booking) return res.redirect("/admin/bookings");

    // Update DB
    db.prepare(`
      UPDATE bookings SET
        driver_name = ?,
        driver_phone = ?,
        vehicle_type = ?,
        vehicle_number = ?,
        vehicle_color = ?,
        status = 'driver_assigned'
      WHERE id = ?
    `).run(
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
          bookingType: booking.booking_type
        },
        {
          name: driverName,
          phone: driverPhone
        },
        {
          type: vehicleType,
          number: vehicleNumber,
          color: vehicleColor
        }
      );
    }

    return res.redirect("/admin/bookings?success=driver_assigned");

} catch (err) {
  console.error("Driver assignment error:", err);
  return res.redirect("/admin/bookings?error=driver_failed");
}
});


//gallery delete route
router.post("/gallery/delete/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  
  try {
    // 1. Get image path from DB
    const item = db.prepare(
      "SELECT filepath FROM gallery WHERE id = ?"
    ).get(id);
    
    if (item?.filepath) {
      const fullPath = path.join(
        process.cwd(),
        "public",
        item.filepath.replace(/^\/+/, "")
      );
      
      // 2. Delete file if exists
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    
    // 3. Delete DB record
    db.prepare("DELETE FROM gallery WHERE id = ?").run(id);
    
  } catch (err) {
    console.error("Delete gallery item error:", err.message);
  }
  
  res.redirect("/admin/gallery");
});

router.post("/gallery/approve/:id", requireAdmin, (req, res) => {
  console.log("✅ APPROVE HIT, ID =", req.params.id);

  const result = db.prepare(
    "UPDATE gallery SET status = 'approved' WHERE id = ?"
  ).run(req.params.id);

  console.log("🧪 Rows updated:", result.changes);

  res.redirect("/admin/gallery");
});



router.post("/gallery/reject/:id", requireAdmin, (req, res) => {
  try {
    db.prepare(
      "UPDATE gallery SET status = 'rejected' WHERE id = ?"
    ).run(req.params.id);
  } catch (err) {
    console.error("Reject error:", err.message);
  }

  res.redirect("/admin/gallery");
});


export default router;