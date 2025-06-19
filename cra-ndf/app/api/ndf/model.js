import { db } from "@/lib/db";

export async function getAllNdf(userId) {
    const [rows] = await db.execute("SELECT * FROM ndf WHERE user_id = ?", [userId]);
    return rows;
}

export async function getNdfById(uuid) {
    const [rows] = await db.execute("SELECT * FROM ndf WHERE uuid = ?", [uuid]);
    return rows[0];
}

export async function createNdf({ uuid, month, year, user_id, statut }) {
    const query = `
        INSERT INTO ndf (uuid, month, year, user_id, statut)
        VALUES (?, ?, ?, ?, ?)
    `;
    await db.execute(query, [uuid, month, year, user_id, statut]);
    return { uuid, month, year, user_id, statut };
}

export async function updateNdf(uuid, { month, year, statut }) {
    const query = `
        UPDATE ndf SET month = ?, year = ?, statut = ?
        WHERE uuid = ?
    `;
    await db.execute(query, [month, year, statut, uuid]);
    return { uuid, month, year, statut };
}

export async function deleteNdf(uuid) {
    await db.execute("DELETE FROM ndf WHERE uuid = ?", [uuid]);
    return { deleted: true };
}

export async function getNdfByMonthYearUser(month, year, user_id) {
    const [rows] = await db.execute(
        "SELECT * FROM ndf WHERE month = ? AND year = ? AND user_id = ?",
        [month, year, user_id]
    );
    return rows[0];
}

export async function getAllNdfsAdmin() {
    const [rows] = await db.execute(`
        SELECT * FROM ndf
        WHERE statut != 'Provisoire'
        ORDER BY year DESC, month DESC
    `);
    return rows;
}