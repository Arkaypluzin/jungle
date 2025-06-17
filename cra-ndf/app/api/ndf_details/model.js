import { db } from "@/lib/db";

export async function getAllDetailsByNdf(ndfId) {
    const [rows] = await db.execute(
        "SELECT * FROM ndf_details WHERE id_ndf = ?",
        [ndfId]
    );
    return rows;
}

export async function getDetailById(uuid) {
    const [rows] = await db.execute(
        "SELECT * FROM ndf_details WHERE uuid = ?",
        [uuid]
    );
    return rows[0];
}

export async function createDetail(detail) {
    const { uuid, id_ndf, date_str, nature, description, tva, montant, img_url } = detail;
    await db.execute(
        `INSERT INTO ndf_details (uuid, id_ndf, date_str, nature, description, tva, montant, img_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuid, id_ndf, date_str, nature, description, tva, montant, img_url]
    );
    return detail;
}

export async function updateDetail(uuid, update) {
    const { date_str, nature, description, tva, montant, img_url } = update;
    await db.execute(
        `UPDATE ndf_details
         SET date_str=?, nature=?, description=?, tva=?, montant=?, img_url=?
         WHERE uuid=?`,
        [date_str, nature, description, tva, montant, img_url, uuid]
    );
    return { uuid, ...update };
}

export async function deleteDetail(uuid) {
    await db.execute(
        `DELETE FROM ndf_details WHERE uuid = ?`,
        [uuid]
    );
    return { deleted: true };
}