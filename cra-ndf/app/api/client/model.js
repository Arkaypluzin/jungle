import { getMongoDb } from "@/lib/mongo";

function cleanMongo(obj) {
  if (Array.isArray(obj)) return obj.map(cleanMongo);
  if (!obj || typeof obj !== "object") return obj;
  const { _id, ...rest } = obj;
  return rest;
}

export async function getAllClients() {
  const db = await getMongoDb();
  const rows = await db.collection("client").find({}).sort({ nom_client: 1 }).toArray();
  return cleanMongo(rows);
}

export async function getClientById(id) {
  const db = await getMongoDb();
  const row = await db.collection("client").findOne({ id });
  return cleanMongo(row);
}

export async function createClient(clientData) {
  const db = await getMongoDb();
  const doc = { ...clientData, id: clientData.id || String(Date.now()) };
  await db.collection("client").insertOne(doc);
  return cleanMongo(doc);
}

export async function updateClient(id, updateData) {
  const db = await getMongoDb();
  const { matchedCount } = await db.collection("client").updateOne(
    { id },
    { $set: updateData }
  );
  return matchedCount > 0;
}

export async function deleteClient(id) {
  const db = await getMongoDb();
  const { deletedCount } = await db.collection("client").deleteOne({ id });
  return deletedCount > 0;
}