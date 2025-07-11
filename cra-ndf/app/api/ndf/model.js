import { getMongoDb } from "@/lib/mongo";

export async function getAllNdf(userId) {
    const db = await getMongoDb();
    return db.collection("ndf").find({ user_id: userId }).toArray();
}

export async function getNdfById(uuid) {
    const db = await getMongoDb();
    return db.collection("ndf").findOne({ uuid });
}

export async function createNdf({ uuid, month, year, user_id, name, statut, motif_refus }) {
    const db = await getMongoDb();
    const doc = { uuid, month, year, user_id, name, statut };
    if (motif_refus) doc.motif_refus = motif_refus;
    await db.collection("ndf").insertOne(doc);
    return doc;
}

export async function updateNdf(uuid, { month, year, statut, motif_refus }) {
    const db = await getMongoDb();
    const update = { $set: { month, year, statut } };
    if (motif_refus !== undefined) update.$set.motif_refus = motif_refus;
    await db.collection("ndf").updateOne({ uuid }, update);
    return db.collection("ndf").findOne({ uuid });
}

export async function updateNdfRefus(ndfId, refus_comment) {
    const db = await getMongoDb();
    await db.collection("ndf").updateOne(
        { uuid: ndfId },
        { $set: { statut: "Provisoire", refus_comment } }
    );
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