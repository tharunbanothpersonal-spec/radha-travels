import express from "express";
import db from "../db.js";
import multer from "multer";
import { requireAdmin } from "../admin/admin.middleware.js";

// --- CLOUDINARY IMPORTS ---
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Setup Cloudinary Storage for Public Reviews
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'radha_travels/reviews',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const upload = multer({ storage: storage });

/* ================= SUBMIT PAGE ================= */
router.get("/review", (req, res) => {
  res.render("review");
});

/* ================= HANDLE SUBMIT ================= */
router.post("/review", upload.single("image"), async (req, res) => { 
  const { name, service, review, rating } = req.body;
  
  // Grab the Cloudinary URL instead of a local path
  const image = req.file ? req.file.path : null;

  if (!name || !service || !review || !rating) {
    return res.redirect("/review");
  }

  try {
    await db.execute({
      sql: `INSERT INTO testimonials (name, service, review, rating, image, status) VALUES (?, ?, ?, ?, ?, 'pending')`,
      args: [name, service, review, parseInt(rating), image]
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error("Testimonial submit error:", err);
    res.status(500).json({ success: false, error: "Database Error" });
  }
});

/* ================= PUBLIC PAGE ================= */
router.get("/happy-customers", async (req, res) => { 
  const page = parseInt(req.query.page) || 1;
  const limit = 8;
  const offset = (page - 1) * limit;

  try {
    const testRes = await db.execute({
      sql: `SELECT * FROM testimonials WHERE status='approved' ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      args: [limit, offset]
    });
    const testimonials = testRes.rows;

    const countRes = await db.execute(`SELECT COUNT(*) as count FROM testimonials WHERE status='approved'`);
    const totalReviews = countRes.rows[0].count;

    const totalPages = Math.ceil(totalReviews / limit);

    const ratingDataRes = await db.execute(`SELECT rating, COUNT(*) as count FROM testimonials WHERE status='approved' GROUP BY rating`);
    const ratingData = ratingDataRes.rows;

    let ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    ratingData.forEach(r => {
      ratingCounts[r.rating] = r.count;
    });

    const totalRatingSum = ratingData.reduce((sum, r) => sum + (r.rating * r.count), 0);

    const avgRating = totalReviews
      ? (totalRatingSum / totalReviews).toFixed(1)
      : 0;

    res.render("happy-customers", {
      testimonials,
      avgRating,
      totalReviews,
      ratingCounts,
      currentPage: page,
      totalPages
    });
  } catch (err) {
    console.error("Happy customers page error:", err);
    res.status(500).send("Database Error");
  }
});

/* ================= ADMIN ================= */
router.get("/admin/testimonials", requireAdmin, async (req, res) => { 
  try {
    const result = await db.execute(`SELECT * FROM testimonials ORDER BY created_at DESC`);
    res.render("admin/testimonials", { testimonials: result.rows });
  } catch (err) {
    console.error("Admin testimonials route error:", err);
    res.status(500).send("Database Error");
  }
});

router.post("/admin/testimonials/approve/:id", requireAdmin, async (req, res) => { 
  try {
    await db.execute({
      sql: `UPDATE testimonials SET status='approved' WHERE id=?`,
      args: [req.params.id]
    });
  } catch (err) {
    console.error("Approve testimonial error:", err);
  }
  res.redirect("/admin/testimonials");
});

router.post("/admin/testimonials/delete/:id", requireAdmin, async (req, res) => { 
  try {
    await db.execute({
      sql: `DELETE FROM testimonials WHERE id=?`,
      args: [req.params.id]
    });
  } catch (err) {
    console.error("Delete testimonial error:", err);
  }
  res.redirect("/admin/testimonials");
});

export default router;