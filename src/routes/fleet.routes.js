
import express from "express";
import db from "../db.js";

const router = express.Router();

/* ===============================
   GET FLEET PAGE
================================ */
router.get("/", async (req, res) => {

  try {

    const result = await db.execute(`
      SELECT * FROM fleet
      WHERE is_active = 1
      ORDER BY id DESC
    `);

    const vehicles = result.rows;

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
