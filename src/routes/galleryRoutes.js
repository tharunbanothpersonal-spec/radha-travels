import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db from "../db.js";
import { requireAdmin } from "../admin/admin.middleware.js";

import { v2 as cloudinary } from "cloudinary";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/* -------------------------------------------------------
   CLOUDINARY STORAGE
------------------------------------------------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

/* -------------------------------------------------------
   AUTO LOAD LOCAL FILES (legacy support)
------------------------------------------------------- */

async function autoLoadGallery() {

  const autoDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "gallery",
    "auto"
  );

  if (!fs.existsSync(autoDir)) return;

  const files = fs.readdirSync(autoDir);

  for (const file of files) {

    const filepath = `/uploads/gallery/auto/${file}`;

    try {

      const existsRes = await db.execute({
        sql: "SELECT id FROM gallery WHERE filepath=?",
        args: [filepath],
      });

      if (!existsRes.rows[0]) {

        await db.execute({
          sql: `
            INSERT INTO gallery
            (filename, filepath, type, uploaded_by)
            VALUES (?, ?, ?, ?)
          `,
          args: [
            file,
            filepath,
            file.endsWith(".mp4") ? "video" : "image",
            "auto",
          ],
        });

      }

    } catch (err) {

      console.error(`Auto load error ${file}:`, err.message);

    }

  }

}

/* -------------------------------------------------------
   GALLERY PAGE
------------------------------------------------------- */

router.get("/", async (req, res) => {

  await autoLoadGallery();

  let gallery = [];

  try {

    const result = await db.execute({
      sql: `
        SELECT *
        FROM gallery
        WHERE status = ?
        ORDER BY created_at DESC
      `,
      args: ["approved"],
    });

    gallery = result.rows;

  } catch (err) {

    console.error("Gallery fetch error:", err.message);

  }

  res.render("gallery", {
    title: "Gallery | Radha Travels",
    gallery,
    isAdmin: req.session?.isAdmin === true,
  });

});

/* -------------------------------------------------------
   UPLOAD PAGE
------------------------------------------------------- */

router.get("/upload", (req, res) => {

  res.render("upload", {
    title: "Upload Gallery | Radha Travels",
    query: req.query,
  });

});

/* -------------------------------------------------------
   HANDLE UPLOAD
------------------------------------------------------- */

router.post("/upload", upload.single("file"), async (req, res) => {

  try {

    const { title, description, uploaded_by, category } = req.body;

    if (!req.file) {
      return res.redirect("/gallery/upload?error=file");
    }

    const role =
      uploaded_by ||
      (req.session?.admin ? "admin" : "customer");

    const streamUpload = (buffer) => {
      return new Promise((resolve, reject) => {

        const stream = cloudinary.uploader.upload_stream(
  {
    folder: "radha_travels/gallery",
    resource_type: "auto"
  },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        stream.end(buffer);

      });
    };

    const uploadResult = await streamUpload(req.file.buffer);

    const filepath = uploadResult.secure_url;
    const public_id = uploadResult.public_id;

    const type = req.file.mimetype.startsWith("video")
      ? "video"
      : "image";

    await db.execute({
      sql: `
        INSERT INTO gallery
        (filename, filepath, public_id, title, description, type, uploaded_by, category, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        req.file.originalname || "cloudinary_upload",
        filepath,
        public_id,
        title || null,
        description || null,
        type,
        role,
        category,
        "pending"
      ],
    });

    res.redirect("/gallery/upload?success=1");

  } catch (err) {

    console.error("Gallery upload fatal error:");
    console.error(err);
    console.error(err.stack);

    res.redirect("/gallery/upload?error=server");

  }

});
/* -------------------------------------------------------
   DELETE GALLERY ITEM (ADMIN)
------------------------------------------------------- */

router.post("/delete/:id", requireAdmin, async (req, res) => {

  const { id } = req.params;

  try {

    const itemRes = await db.execute({
      sql: "SELECT public_id FROM gallery WHERE id=?",
      args: [id],
    });

    const item = itemRes.rows[0];

    if (item?.public_id) {
      await cloudinary.uploader.destroy(item.public_id);
    }

    await db.execute({
      sql: "DELETE FROM gallery WHERE id=?",
      args: [id],
    });

  } catch (err) {

    console.error("Gallery delete error:", err.message);

  }

  res.redirect("/gallery");

});

export default router;
