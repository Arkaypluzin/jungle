// lib/db.js
import mysql from "mysql2/promise";

// TEMPORAIRE POUR DEBUG : Vérifiez ce que Next.js lit
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD ? "SET" : "NOT SET"); // Ne pas afficher le mot de passe réel
console.log("DB_NAME:", process.env.DB_NAME);

export const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT, // Assurez-vous que 'port' est bien utilisé ici !
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Note: La connexion est exportée directement.
// Les fichiers qui l'importent devront utiliser `db.execute()` ou `db.query()`
// directement sur l'objet 'db'.
