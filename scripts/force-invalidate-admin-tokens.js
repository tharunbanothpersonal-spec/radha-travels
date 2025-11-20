// scripts/force-invalidate-admin-tokens.js
import db from "../src/db.js";
const now = new Date().toISOString();
const info = db.prepare("UPDATE admins SET password_changed_at = ?").run(now);
console.log("updated admins:", info);
db.close();
