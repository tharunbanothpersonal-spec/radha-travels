import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db from "../db.js";   
import { requireAdmin } from "../admin/admin.middleware.js";

// --- CLOUDINARY IMPORTS ---
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary Storage for Gallery (Handles both images and videos)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const role = req.body.uploaded_by || (req.session?.admin ? "admin" : "customer");
    return {
      folder: `radha_travels/gallery/${role}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'mp4'],
      resource_type: 'auto' // Automatically detects if it's an image or video
    };
  },
});

const upload = multer({ storage });

/* -------------------------------------------------------
   AUTO LOAD FILES FROM /auto (Leaves local hardcoded files alone)
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
          args: [file, filepath, file.endsWith(".mp4") ? "video" : "image", "auto"]
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
router.get("/", async (req, res) => { 
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
    isAdmin: req.session?.isAdmin === true   
  });
});

/* UPLOAD PAGE */
router.get("/upload", (req, res) => {
  res.render("upload", {
    title: "Upload Gallery | Radha Travels",
    query: req.query   
  });
});

/* HANDLE UPLOAD */
router.post("/upload", upload.single("file"), async (req, res) => { 
  const { title, description, uploaded_by, category } = req.body;

  if (!req.file) {
    return res.redirect("/gallery/upload?success=1");
  }

  const role = uploaded_by || (req.session?.admin ? "admin" : "customer");
  
  // Use the permanent Cloudinary URL
  const filepath = req.file.path;
  const type = req.file.mimetype.startsWith("video") ? "video" : "image";

  try {
    await db.execute({
      sql: `INSERT INTO gallery (filename, filepath, title, description, type, uploaded_by, category, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [req.file.filename || "cloudinary_upload", filepath, title || null, description || null, type, role, category, "pending"]
    });
  } catch (err) {
    console.error("❌ Gallery insert error:", err.message);
  }

  res.redirect("/gallery/upload?success=1");
});

// DELETE GALLERY ITEM — ADMIN ONLY
router.post("/delete/:id", requireAdmin, async (req, res) => { 
  const { id } = req.params;

  try {
    await db.execute({
      sql: "DELETE FROM gallery WHERE id = ?",
      args: [id]
    });
    // Removed fs.unlinkSync because we cannot delete local files that live in the cloud!
  } catch (err) {
    console.error("Gallery delete error:", err.message);
  }

  res.redirect("/gallery");
});

export default router;