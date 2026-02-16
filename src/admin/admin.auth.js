import express from "express";
const router = express.Router();

/* LOGIN PAGE */
router.get("/login", (req, res) => {
  res.render("admin/login", { error: null });
});

/* LOGIN SUBMIT */
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  // TEMP credentials (change later)
  if (username === "admin" && password === "admin123") {
    req.session.admin = {
      username: "admin"
    };
    return res.redirect("/admin");
  }

  res.render("admin/login", {
    error: "Invalid credentials"
  });
});

/* LOGOUT */
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
});

export default router;
