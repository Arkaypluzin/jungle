import { getMongoDb } from "@/lib/mongo";

function cleanMongo(obj) {
    if (Array.isArray(obj)) return obj.map(cleanMongo);
    if (!obj || typeof obj !== "object") return obj;
    const { _id, ...rest } = obj;
    return rest;
}

export async function getAllNdfKiloByNdf(id_ndf) {
    const db = await getMongoDb();
    const list = await db.collection("ndf_kilo").find({ id_ndf }).sort({ date_debut: 1 }).toArray();
    return cleanMongo(list);
}

export async function getNdfKiloById(uuid) {
    const db = await getMongoDb();
    const item = await db.collection("ndf_kilo").findOne({ uuid });
    return cleanMongo(item);
}

export async function createNdfKilo(data) {
    const db = await getMongoDb();
    const doc = {
        ...data,
        uuid: data.uuid || `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    };
    await db.collection("ndf_kilo").insertOne(doc);
    return cleanMongo(doc);
}

export async function updateNdfKilo(uuid, updateData) {
    const db = await getMongoDb();
    const { matchedCount } = await db.collection("ndf_kilo").updateOne({ uuid }, { $set: updateData });
    return matchedCount > 0;
}

export async function deleteNdfKilo(uuid) {
    const db = await getMongoDb();
    const { deletedCount } = await db.collection("ndf_kilo").deleteOne({ uuid });
    return deletedCount > 0;
}