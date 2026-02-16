export function requireAdmin(req, res, next) {
  if (!req.session || !req.session.admin) {
    return res.redirect("/admin/login");
  }
  next();
}
