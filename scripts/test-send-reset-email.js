// scripts/test-send-reset-email.js
import { findAdminByEmail } from "../src/models/AdminSql.js";
import { sendAdminResetEmail } from "../src/mailer.js";

(async () => {
  try {
    const admin = findAdminByEmail("radha.travels.info@gmail.com");
    if (!admin) {
      console.error("Admin with that email not found in DB.");
      process.exit(1);
    }
    console.log("Found admin:", { id: admin.id, email: admin.email, name: admin.name });

    // create a short-lived test token (we don't persist here; sendAdminResetEmail expects token string)
    const token = "devtest-" + Date.now();
    const r = await sendAdminResetEmail(admin, token);
    console.log("sendAdminResetEmail result:", r);
    process.exit(0);
  } catch (err) {
    console.error("Error in test-send-reset-email:", err);
    process.exit(1);
  }
})();
