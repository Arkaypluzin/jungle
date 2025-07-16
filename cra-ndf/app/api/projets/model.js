import { getMongoDb } from "@/lib/mongo";

function cleanMongo(obj) {
    if (Array.isArray(obj)) return obj.map(cleanMongo);
    if (!obj || typeof obj !== "object") return obj;
    const { _id, ...rest } = obj;
    return rest;
}

export async function getAllProjets() {
    const db = await getMongoDb();
    const projets = await db.collection("projets").find({}).sort({ nom: 1 }).toArray();
    return cleanMongo(projets);
}

export async function getProjetById(id) {
    const db = await getMongoDb();
    const projet = await db.collection("projets").findOne({ id });
    return cleanMongo(projet);
}

export async function createProjet(data) {
    const db = await getMongoDb();
    const doc = { ...data, id: data.id || String(Date.now()) };
    await db.collection("projets").insertOne(doc);
    return cleanMongo(doc);
}

export async function updateProjet(id, updateData) {
    const db = await getMongoDb();
    const { matchedCount } = await db.collection("projets").updateOne({ id }, { $set: updateData });
    return matchedCount > 0;
}

export async function deleteProjet(id) {
    const db = await getMongoDb();
    const { deletedCount } = await db.collection("projets").deleteOne({ id });
    return deletedCount > 0;
}