import { getMongoDb } from "@/lib/mongo";

export async function getAllCraActivities() {
  const db = await getMongoDb();
  return db.collection("cra_activities").find({}).toArray();
}

export async function getCraActivityById(id) {
  const db = await getMongoDb();
  return db.collection("cra_activities").findOne({ id });
}

export async function createCraActivity(activity) {
  const db = await getMongoDb();
  const doc = {
    id: activity.id,
    description_activite: activity.description_activite || "",
    temps_passe: activity.temps_passe,
    date_activite: activity.date_activite,
    type_activite: activity.type_activite,
    client_name: activity.type_activite?.includes("Absence") ? null : activity.client_name,
    override_non_working_day: activity.override_non_working_day || false,
  };
  await db.collection("cra_activities").insertOne(doc);
  return doc;
}

export async function updateCraActivity(id, updateData) {
  const db = await getMongoDb();
  const update = { $set: {} };
  if (updateData.description_activite !== undefined) update.$set.description_activite = updateData.description_activite;
  if (updateData.temps_passe !== undefined) update.$set.temps_passe = updateData.temps_passe;
  if (updateData.date_activite !== undefined) update.$set.date_activite = updateData.date_activite;
  if (updateData.type_activite !== undefined) update.$set.type_activite = updateData.type_activite;
  if (updateData.client_name !== undefined) update.$set.client_name = updateData.client_name;
  if (updateData.override_non_working_day !== undefined) update.$set.override_non_working_day = updateData.override_non_working_day;
  await db.collection("cra_activities").updateOne({ id }, update);
  return db.collection("cra_activities").findOne({ id });
}

export async function deleteCraActivity(id) {
  const db = await getMongoDb();
  const res = await db.collection("cra_activities").deleteOne({ id });
  return { deleted: res.deletedCount > 0 };
}