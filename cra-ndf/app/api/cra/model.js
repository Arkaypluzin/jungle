import { getMongoDb } from "@/lib/mongo";

export async function getAllCRAs() {
  const db = await getMongoDb();
  return db.collection("cra").find({}).toArray();
}

export async function getCRAById(id) {
  const db = await getMongoDb();
  return db.collection("cra").findOne({ id });
}

export async function createCRA(craData) {
  const db = await getMongoDb();
  const doc = {
    id: craData.id,
    user_id: craData.user_id,
    client_id: craData.client_id,
    date_cra: craData.date_cra,
    statut: craData.statut || "Brouillon",
    commentaires: craData.commentaires || null,
  };
  await db.collection("cra").insertOne(doc);
  return doc;
}

export async function updateCRA(id, updateData) {
  const db = await getMongoDb();
  const update = { $set: {} };
  if (updateData.user_id !== undefined) update.$set.user_id = updateData.user_id;
  if (updateData.client_id !== undefined) update.$set.client_id = updateData.client_id;
  if (updateData.date_cra !== undefined) update.$set.date_cra = updateData.date_cra;
  if (updateData.statut !== undefined) update.$set.statut = updateData.statut;
  if (updateData.commentaires !== undefined) update.$set.commentaires = updateData.commentaires;
  await db.collection("cra").updateOne({ id }, update);
  return db.collection("cra").findOne({ id });
}

export async function deleteCRA(id) {
  const db = await getMongoDb();
  const res = await db.collection("cra").deleteOne({ id });
  return { deleted: res.deletedCount > 0 };
}