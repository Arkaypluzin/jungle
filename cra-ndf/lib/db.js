// lib/db.js
import mysql from "mysql2/promise";

let dbPool = null;

export async function getDbPool() {
  if (dbPool) {
    return dbPool;
  }

  try {
    dbPool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    console.log("Pool de connexions à la base de données créé.");
    return dbPool;
  } catch (error) {
    console.error(
      "Erreur lors de la création du pool de connexions à la base de données :",
      error
    );
    throw error;
  }
}

export const db = await getDbPool();
