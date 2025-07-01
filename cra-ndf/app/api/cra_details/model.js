import { getMongoDb } from "@/lib/mongo";

export async function getAllCraDetails() {
  const db = await getMongoDb();
  return db.collection("cra_details").find({}).toArray();
}

export async function getCraDetailById(id) {
  const db = await getMongoDb();
  return db.collection("cra_details").findOne({ id });
}

export async function getDetailsByCraId(cra_id) {
  const db = await getMongoDb();
  return db.collection("cra_details").find({ cra_id }).toArray();
}

export async function createCraDetail(detailData) {
  const db = await getMongoDb();
  const doc = {
    id: detailData.id,
    cra_id: detailData.cra_id,
    type_detail: detailData.type_detail,
    description: detailData.description,
    date_detail: detailData.date_detail,
  };
  await db.collection("cra_details").insertOne(doc);
  return doc;
}

export async function updateCraDetail(id, updateData) {
  const db = await getMongoDb();
  const update = { $set: {} };
  if (updateData.type_detail !== undefined) update.$set.type_detail = updateData.type_detail;
  if (updateData.description !== undefined) update.$set.description = updateData.description;
  if (updateData.date_detail !== undefined) update.$set.date_detail = updateData.date_detail;
  await db.collection("cra_details").updateOne({ id }, update);
  return db.collection("cra_details").findOne({ id });
}

export async function deleteCraDetail(id) {
  const db = await getMongoDb();
  const res = await db.collection("cra_details").deleteOne({ id });
  return { deleted: res.deletedCount > 0 };
}