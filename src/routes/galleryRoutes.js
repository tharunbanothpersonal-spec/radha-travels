import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db from "../db.js";   // ✅ your existing better-sqlite3 DB
import authAdmin from "../middleware/authAdmin.js";

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
    const role = req.body.uploaded_by || "customer";
    const dir = path.join(process.cwd(), "public", "uploads", "gallery", role);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

/* -------------------------------------------------------
   AUTO LOAD FILES FROM /auto
------------------------------------------------------- */
function autoLoadGallery() {
  const autoDir = path.join(process.cwd(), "public", "uploads", "gallery", "auto");
  if (!fs.existsSync(autoDir)) return;

  const files = fs.readdirSync(autoDir);

  const checkStmt = db.prepare(
    "SELECT id FROM gallery WHERE filepath = ?"
  );

  const insertStmt = db.prepare(`
    INSERT INTO gallery (filename, filepath, type, uploaded_by)
    VALUES (?, ?, ?, ?)
  `);

  files.forEach(file => {
    const filepath = `/uploads/gallery/auto/${file}`;
    const exists = checkStmt.get(filepath);

    if (!exists) {
      insertStmt.run(
        file,
        filepath,
        file.endsWith(".mp4") ? "video" : "image",
        "auto"
      );
    }
  });
}

/* -------------------------------------------------------
   ROUTES
------------------------------------------------------- */

/* GALLERY PAGE */
router.get("/", (req, res) => {
  autoLoadGallery();

  let gallery = [];
  try {
    gallery = db
      .prepare("SELECT * FROM gallery ORDER BY created_at DESC")
      .all();
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
router.post("/upload", upload.single("file"), (req, res) => {
  const { title, description, uploaded_by } = req.body;

  if (!req.file) {
    return res.redirect("/gallery/upload?success=1");
  }

  const filepath = req.file.path.replace("public", "");
  const type = req.file.mimetype.startsWith("video") ? "video" : "image";

  try {
    db.prepare(`
      INSERT INTO gallery (
        filename,
        filepath,
        title,
        description,
        type,
        uploaded_by
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      req.file.filename,
      filepath,
      title || null,
      description || null,
      type,
      uploaded_by || "customer"
    );
  } catch (err) {
    console.error("❌ Gallery insert error:", err.message);
  }

  res.redirect("/gallery/upload?success=1");

});

// DELETE GALLERY ITEM — ADMIN ONLY

// ADMIN DELETE — JWT PROTECTED
router.post("/delete/:id", authAdmin, (req, res) => {
  const { id } = req.params;

  try {
    const item = db
      .prepare("SELECT filepath FROM gallery WHERE id = ?")
      .get(id);

    if (!item) return res.redirect("/gallery");

    db.prepare("DELETE FROM gallery WHERE id = ?").run(id);

    const fullPath = path.join(process.cwd(), "public", item.filepath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

  } catch (err) {
    console.error("Gallery delete error:", err.message);
  }

  res.redirect("/gallery");
});


export default router;
