import { getMongoDb } from "@/lib/mongo";

export async function getAllNdf(userId) {
    const db = await getMongoDb();
    return db.collection("ndf").find({ user_id: userId }).toArray();
}

export async function getNdfById(uuid) {
    const db = await getMongoDb();
    return db.collection("ndf").findOne({ uuid });
}

export async function createNdf({ uuid, month, year, user_id, name, statut }) {
    const db = await getMongoDb();
    const doc = { uuid, month, year, user_id, name, statut };
    await db.collection("ndf").insertOne(doc);
    return doc;
}

export async function updateNdf(uuid, { month, year, statut }) {
    const db = await getMongoDb();
    const update = { $set: { month, year, statut } };
    await db.collection("ndf").updateOne({ uuid }, update);
    return db.collection("ndf").findOne({ uuid });
}

export async function deleteNdf(uuid) {
    const db = await getMongoDb();
    await db.collection("ndf").deleteOne({ uuid });
    return { deleted: true };
}

export async function getNdfByMonthYearUser(month, year, user_id) {
    const db = await getMongoDb();
    return db.collection("ndf").findOne({ month, year, user_id });
}

export async function getAllNdfsAdmin() {
    const db = await getMongoDb();
    return db.collection("ndf")
        .find({ statut: { $ne: "Provisoire" } })
        .sort({ year: -1, month: -1 })
        .toArray();
}