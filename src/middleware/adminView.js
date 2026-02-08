import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";
const COOKIE_NAME = process.env.ADMIN_COOKIE_NAME || "rt_admin_token";

export default function adminView(req, res, next) {
  res.locals.isAdmin = false;

  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return next();

    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.id) {
      res.locals.isAdmin = true;
      req.admin = payload; // optional
    }
  } catch (err) {
    // silent fail
  }

  next();
}
