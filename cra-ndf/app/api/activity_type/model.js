import { getMongoDb } from "@/lib/mongo";
import { ObjectId } from "mongodb";

export async function getAllActivityTypes() {
  const db = await getMongoDb();
  return db.collection("activity_type").find({}).toArray();
}

export async function getActivityTypeById(id) {
  const db = await getMongoDb();
  try {
    return db.collection("activity_type").findOne({ _id: new ObjectId(id) });
  } catch (err) {
    return null;
  }
}

export async function createActivityType(data) {
  const db = await getMongoDb();
  const doc = {
    name: data.name,
    is_billable: data.is_billable,
  };
  const { insertedId } = await db.collection("activity_type").insertOne(doc);
  doc._id = insertedId;
  return doc;
}

export async function updateActivityType(id, updateData) {
  const db = await getMongoDb();
  const update = { $set: {} };
  if (updateData.name !== undefined) update.$set.name = updateData.name;
  if (updateData.is_billable !== undefined) update.$set.is_billable = updateData.is_billable;
  try {
    const res = await db.collection("activity_type").updateOne({ _id: new ObjectId(id) }, update);
    if (res.matchedCount === 0) return null;
    return db.collection("activity_type").findOne({ _id: new ObjectId(id) });
  } catch (err) {
    return null;
  }
}

export async function deleteActivityType(id) {
  const db = await getMongoDb();
  try {
    const res = await db.collection("activity_type").deleteOne({ _id: new ObjectId(id) });
    return { deleted: res.deletedCount > 0 };
  } catch (err) {
    return { deleted: false };
  }
}