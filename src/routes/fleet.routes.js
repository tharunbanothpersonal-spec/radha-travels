import express from "express";
import db from "../db.js";

const router = express.Router();

/* ===============================
   GET FLEET PAGE
================================ */
router.get("/", (req, res) => {
  try {
    const vehicles = db.prepare(`
      SELECT * FROM fleet
      WHERE status = 'active'
      ORDER BY id DESC
    `).all();

    res.render("fleet", {
      title: "Our Fleet | Radha Travels",
      vehicles
    });

  } catch (err) {
    console.error("Fleet fetch error:", err.message);
    res.status(500).send("Server Error");
  }
});

export default router;