import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db from "../db.js";   // Now points to your Turso DB
import { requireAdmin } from "../admin/admin.middleware.js";

const router = express.Router();

/* -------------------------------------------------------
   PATH SETUP (ESM SAFE)
------------------------------------------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------------------------------------------
   MULTER STORAGE
------------------------------------------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine role safely
    const role =
      req.body.uploaded_by ||
      (req.session?.admin ? "admin" : "customer");

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "gallery",
      role
    );

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const unique =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

/* -------------------------------------------------------
   AUTO LOAD FILES FROM /auto (Converted to Async Turso)
------------------------------------------------------- */
async function autoLoadGallery() {
  const autoDir = path.join(process.cwd(), "public", "uploads", "gallery", "auto");
  if (!fs.existsSync(autoDir)) return;

  const files = fs.readdirSync(autoDir);

  for (const file of files) {
    const filepath = `/uploads/gallery/auto/${file}`;
    
    try {
      const existsRes = await db.execute({
        sql: "SELECT id FROM gallery WHERE filepath = ?",
        args: [filepath]
      });
      
      const exists = existsRes.rows[0];

      if (!exists) {
        await db.execute({
          sql: `INSERT INTO gallery (filename, filepath, type, uploaded_by) VALUES (?, ?, ?, ?)`,
          args: [
            file,
            filepath,
            file.endsWith(".mp4") ? "video" : "image",
            "auto"
          ]
        });
      }
    } catch (err) {
      console.error(`Error auto-loading ${file}:`, err.message);
    }
  }
}

/* -------------------------------------------------------
   ROUTES
------------------------------------------------------- */

/* GALLERY PAGE */
router.get("/", async (req, res) => { // <-- ADDED ASYNC
  await autoLoadGallery();

  let gallery = [];
  try {
    const result = await db.execute({
      sql: "SELECT * FROM gallery WHERE status = ? ORDER BY created_at DESC",
      args: ["approved"]
    });
    gallery = result.rows;
  } catch (err) {
    console.error("Gallery fetch error:", err.message);
  }

  res.render("gallery", {
    title: "Gallery | Radha Travels",
    gallery,
    isAdmin: req.session?.isAdmin === true   // ✅ EXPLICIT
  });
});

/* UPLOAD PAGE */
router.get("/upload", (req, res) => {
  res.render("upload", {
    title: "Upload Gallery | Radha Travels",
    query: req.query   // 👈 IMPORTANT
  });
});

/* HANDLE UPLOAD */
router.post("/upload", upload.single("file"), async (req, res) => { // <-- ADDED ASYNC
  const { title, description, uploaded_by, category } = req.body;

  if (!req.file) {
    return res.redirect("/gallery/upload?success=1");
  }

  // ✅ Determine role (single source of truth)
  const role =
    uploaded_by ||
    (req.session?.admin ? "admin" : "customer");

  // ✅ Build browser-safe filepath intentionally
  const filepath = `/uploads/gallery/${role}/${req.file.filename}`;

  const type = req.file.mimetype.startsWith("video") ? "video" : "image";

  try {
    await db.execute({
      sql: `INSERT INTO gallery (filename, filepath, title, description, type, uploaded_by, category, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        req.file.filename,
        filepath,
        title || null,
        description || null,
        type,
        role,
        category,
        "pending"
      ]
    });
  } catch (err) {
    console.error("❌ Gallery insert error:", err.message);
  }

  res.redirect("/gallery/upload?success=1");
});

// DELETE GALLERY ITEM — ADMIN ONLY
router.post("/delete/:id", requireAdmin, async (req, res) => { // <-- ADDED ASYNC
  const { id } = req.params;

  try {
    const itemRes = await db.execute({
      sql: "SELECT filepath FROM gallery WHERE id = ?",
      args: [id]
    });
    
    const item = itemRes.rows[0];

    if (!item) return res.redirect("/gallery");

    await db.execute({
      sql: "DELETE FROM gallery WHERE id = ?",
      args: [id]
    });

    const fullPath = path.join(process.cwd(), "public", item.filepath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

  } catch (err) {
    console.error("Gallery delete error:", err.message);
  }

  res.redirect("/gallery");
});

export default router;