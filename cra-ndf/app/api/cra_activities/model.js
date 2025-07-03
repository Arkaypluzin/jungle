import { getMongoDb } from "@/lib/mongo";
import { ObjectId } from "mongodb";

export async function getAllCraActivities() {
  try {
    const db = await getMongoDb();
    if (!db) {
      console.error(
        "MongoDB connection failed: db object is null or undefined."
      );
      throw new Error("Database connection not established.");
    }
    return await db.collection("cra_activities").find({}).toArray();
  } catch (error) {
    console.error("Error in getAllCraActivities model:", error);
    throw new Error(
      `Failed to retrieve CRA activities from database: ${error.message}`
    );
  }
}

export async function getCraActivityById(id) {
  const db = await getMongoDb();
  if (!db) {
    console.error("MongoDB connection failed: db object is null or undefined.");
    throw new Error("Database connection not established.");
  }
  try {
    return db.collection("cra_activities").findOne({ _id: new ObjectId(id) });
  } catch (err) {
    console.error(
      `Error converting ID to ObjectId for getCraActivityById: ${id}`,
      err
    );
    // Si l'ID n'est pas un ObjectId valide, cela peut signifier un ID malformé
    throw new Error(`Invalid activity ID provided: ${id}`);
  }
}

export async function createCraActivity(activity) {
  const db = await getMongoDb();
  if (!db) {
    console.error("MongoDB connection failed: db object is null or undefined.");
    throw new Error("Database connection not established.");
  }
  try {
    const doc = {
      description_activite: activity.description_activite || "",
      temps_passe: activity.temps_passe,
      date_activite: activity.date_activite,
      type_activite: activity.type_activite,
      type_activite_name: activity.type_activite_name,
      client_id: activity.client_id || null,
      client_name: activity.client_name || null,
      override_non_working_day: activity.override_non_working_day || 0,
      user_id: activity.user_id,
      is_billable: activity.is_billable || 0,
      is_overtime: activity.is_overtime || 0,
      status: activity.status || "draft",
      created_at: new Date(),
      updated_at: new Date(),
    };
    const { insertedId } = await db.collection("cra_activities").insertOne(doc);
    doc._id = insertedId;
    return doc;
  } catch (error) {
    console.error("Error in createCraActivity model:", error);
    throw new Error(
      `Failed to create CRA activity in database: ${error.message}`
    );
  }
}

export async function updateCraActivity(id, updateData) {
  const db = await getMongoDb();
  if (!db) {
    console.error("MongoDB connection failed: db object is null or undefined.");
    throw new Error("Database connection not established.");
  }
  const update = { $set: {} };

  for (const key in updateData) {
    if (updateData.hasOwnProperty(key)) {
      update.$set[key] = updateData[key];
    }
  }
  update.$set.updated_at = new Date();

  try {
    const res = await db
      .collection("cra_activities")
      .updateOne({ _id: new ObjectId(id) }, update);
    if (res.matchedCount === 0) return null;
    return await db
      .collection("cra_activities")
      .findOne({ _id: new ObjectId(id) });
  } catch (err) {
    console.error("Error in updateCraActivity model:", err);
    throw new Error(
      `Failed to update CRA activity in database: ${err.message}`
    );
  }
}

export async function deleteCraActivity(id) {
  const db = await getMongoDb();
  if (!db) {
    console.error("MongoDB connection failed: db object is null or undefined.");
    throw new Error("Database connection not established.");
  }
  try {
    const res = await db
      .collection("cra_activities")
      .deleteOne({ _id: new ObjectId(id) });
    return { deleted: res.deletedCount > 0 };
  } catch (err) {
    console.error("Error in deleteCraActivity model:", err);
    throw new Error(
      `Failed to delete CRA activity from database: ${err.message}`
    );
  }
}
