import { getMongoDb } from "@/lib/mongo";

export async function getAllActivityTypes() {
  const db = await getMongoDb();
  return db.collection("activity_type").find({}).toArray();
}

export async function getActivityTypeById(id) {
  const db = await getMongoDb();
  return db.collection("activity_type").findOne({ id });
}

export async function createActivityType(data) {
  const db = await getMongoDb();
  const doc = {
    id: data.id,
    name: data.name,
    is_billable: data.is_billable,
  };
  await db.collection("activity_type").insertOne(doc);
  return doc;
}

export async function updateActivityType(id, updateData) {
  const db = await getMongoDb();
  const update = { $set: {} };
  if (updateData.name !== undefined) update.$set.name = updateData.name;
  if (updateData.is_billable !== undefined) update.$set.is_billable = updateData.is_billable;
  const res = await db.collection("activity_type").updateOne({ id }, update);
  if (res.matchedCount === 0) return null;
  return db.collection("activity_type").findOne({ id });
}

export async function deleteActivityType(id) {
  const db = await getMongoDb();
  const res = await db.collection("activity_type").deleteOne({ id });
  return { deleted: res.deletedCount > 0 };
}