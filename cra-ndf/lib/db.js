import { Pool } from "pg";

let dbPool = null;

export function getDbPool() {
    if (dbPool) {
        return dbPool;
    }

    dbPool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        max: 10,
    });

    console.log("Pool de connexions à la base de données PostgreSQL créé.");
    return dbPool;
}

export const db = getDbPool();