import express from "express";
import db from "../db.js";
import multer from "multer";
import { requireAdmin } from "../admin/admin.middleware.js";

import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

const router = express.Router();

/* ================= CLOUDINARY CONFIG ================= */

cloudinary.config({
cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
api_key: process.env.CLOUDINARY_API_KEY,
api_secret: process.env.CLOUDINARY_API_SECRET
});

/* ================= MULTER MEMORY STORAGE ================= */

const upload = multer({
storage: multer.memoryStorage(),
limits: { fileSize: 5 * 1024 * 1024 }
});

/* ================= SUBMIT PAGE ================= */

router.get("/review", (req, res) => {
res.render("review");
});

/* ================= HANDLE REVIEW SUBMISSION ================= */

router.post("/review", upload.single("image"), async (req, res) => {

try {


const { name, service, review, rating } = req.body;

if (!name || !service || !review || !rating) {
  return res.redirect("/review");
}

let imageUrl = null;

/* ---------- Upload image to Cloudinary if present ---------- */

if (req.file) {

  const result = await new Promise((resolve, reject) => {

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "radha_travels/reviews",
        resource_type: "image"
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(stream);

  });

  imageUrl = result.secure_url;

}

/* ---------- Insert review into database ---------- */

await db.execute({
  sql: `
    INSERT INTO testimonials
    (name, service, review, rating, image, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `,
  args: [
    name,
    service,
    review,
    parseInt(rating),
    imageUrl
  ]
});

res.json({ success: true });


} catch (err) {


console.error("Testimonial submit error:", err);

res.status(500).json({
  success: false,
  error: "Database Error"
});


}

});

/* ================= PUBLIC PAGE ================= */

router.get("/happy-customers", async (req, res) => {

const page = parseInt(req.query.page) || 1;
const limit = 8;
const offset = (page - 1) * limit;

try {


const testimonials = (await db.execute({
  sql: `
    SELECT *
    FROM testimonials
    WHERE status='approved'
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `,
  args: [limit, offset]
})).rows;

const totalReviews = (await db.execute(
  `SELECT COUNT(*) as count FROM testimonials WHERE status='approved'`
)).rows[0].count;

const totalPages = Math.ceil(totalReviews / limit);

const ratingData = (await db.execute(
  `SELECT rating, COUNT(*) as count
   FROM testimonials
   WHERE status='approved'
   GROUP BY rating`
)).rows;

let ratingCounts = {1:0,2:0,3:0,4:0,5:0};

ratingData.forEach(r => {
  ratingCounts[r.rating] = r.count;
});

const totalRatingSum = ratingData.reduce(
  (sum, r) => sum + (r.rating * r.count), 0
);

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


const testimonials = (await db.execute(
  `SELECT * FROM testimonials ORDER BY created_at DESC`
)).rows;

res.render("admin/testimonials", { testimonials });


} catch (err) {


console.error("Admin testimonials route error:", err);
res.status(500).send("Database Error");


}

});

router.post("/admin/testimonials/approve/:id", requireAdmin, async (req, res) => {

await db.execute({
sql: `UPDATE testimonials SET status='approved' WHERE id=?`,
args: [req.params.id]
});

res.redirect("/admin/testimonials");

});

router.post("/admin/testimonials/delete/:id", requireAdmin, async (req, res) => {

await db.execute({
sql: `DELETE FROM testimonials WHERE id=?`,
args: [req.params.id]
});

res.redirect("/admin/testimonials");

});

export default router;
