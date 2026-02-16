import db from "./db.js";

const columns = db.prepare("PRAGMA table_info(gallery)").all();
console.log(columns.map(c => `${c.name} (${c.type})`));
