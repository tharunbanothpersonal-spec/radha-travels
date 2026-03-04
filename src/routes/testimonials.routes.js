import express from "express";
import db from "../db.js";
import multer from "multer";
import { requireAdmin } from "../admin/admin.middleware.js";

const router = express.Router();

const upload = multer({ dest: "public/uploads/" });

/* ================= SUBMIT PAGE ================= */

router.get("/review", (req, res) => {
  res.render("review");
});

/* ================= HANDLE SUBMIT ================= */

router.post("/review", upload.single("image"), (req, res) => {

  const { name, service, review, rating } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name || !service || !review || !rating) {
    return res.redirect("/review");
  }

  db.prepare(`
    INSERT INTO testimonials (name, service, review, rating, image, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(name, service, review, parseInt(rating), image);

  res.json({ success: true });

});

/* ================= PUBLIC PAGE ================= */

router.get("/happy-customers", (req, res) => {

  const page = parseInt(req.query.page) || 1;
  const limit = 8;
  const offset = (page - 1) * limit;

  // PAGINATED TESTIMONIALS
  const testimonials = db.prepare(`
    SELECT * FROM testimonials
    WHERE status='approved'
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  // TOTAL REVIEWS
  const totalReviews = db.prepare(`
    SELECT COUNT(*) as count
    FROM testimonials
    WHERE status='approved'
  `).get().count;

  const totalPages = Math.ceil(totalReviews / limit);

  // AVERAGE RATING
  const ratingData = db.prepare(`
    SELECT rating, COUNT(*) as count
    FROM testimonials
    WHERE status='approved'
    GROUP BY rating
  `).all();

  let ratingCounts = {1:0,2:0,3:0,4:0,5:0};

  ratingData.forEach(r=>{
    ratingCounts[r.rating] = r.count;
  });

  const totalRatingSum = ratingData.reduce((sum,r)=>sum + (r.rating * r.count),0);

  const avgRating = totalReviews
    ? (totalRatingSum / totalReviews).toFixed(1)
    : 0;

  res.render("happy-customers",{
    testimonials,
    avgRating,
    totalReviews,
    ratingCounts,
    currentPage: page,
    totalPages
  });

});
/* ================= ADMIN ================= */

router.get("/admin/testimonials", requireAdmin, (req, res) => {
  const testimonials = db.prepare(`
    SELECT * FROM testimonials
    ORDER BY created_at DESC
  `).all();

  res.render("admin/testimonials", { testimonials });
});

router.post("/admin/testimonials/approve/:id", requireAdmin, (req, res) => {
  db.prepare(`UPDATE testimonials SET status='approved' WHERE id=?`)
    .run(req.params.id);

  res.redirect("/admin/testimonials");
});

router.post("/admin/testimonials/delete/:id", requireAdmin, (req, res) => {
  db.prepare(`DELETE FROM testimonials WHERE id=?`)
    .run(req.params.id);

  res.redirect("/admin/testimonials");
});

export default router;