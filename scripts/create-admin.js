// scripts/create-admin.js
import { createAdmin } from "../src/models/AdminSql.js";

const email = process.env.ADMIN_EMAIL || "admin@yourdomain.com";
const pass = process.env.ADMIN_PASS || "StrongPassword123";
const name = process.env.ADMIN_NAME || "Admin User";

createAdmin(email, pass, name)
  .then(r => {
    console.log("Admin created:", r);
    process.exit(0);
  })
  .catch(err => {
    console.error("Error creating admin:", err);
    process.exit(1);
  });
