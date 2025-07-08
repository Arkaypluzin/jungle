// app/api/cra_activities/model.js
import { getMongoDb } from "@/lib/mongo";
import { ObjectId } from "mongodb";

const COLLECTION_NAME = "cra_activities";
// VÉRIFIEZ ET AJUSTEZ CES NOMS DE COLLECTION SI NÉCESSAIRE POUR CORRESPONDRE À VOTRE BASE DE DONNÉES !
// Exemple: si votre collection clients est nommée "MyClients", changez "clients" en "MyClients"
const CLIENT_COLLECTION_NAME = "clients";
const ACTIVITY_TYPE_COLLECTION_NAME = "activitytypes";

// Helper to transform _id to id for single documents
function transformDocument(doc) {
  if (!doc) return null;
  const newDoc = { ...doc, id: doc._id.toString() };
  delete newDoc._id;
  // If client_id was populated (which means it's an object), transform its _id as well
  // Note: client_id in cra_activities is now stored as String, but the populated object will have _id
  if (
    newDoc.client_id &&
    typeof newDoc.client_id === "object" &&
    newDoc.client_id._id
  ) {
    newDoc.client_id.id = newDoc.client_id._id.toString();
    delete newDoc.client_id._id;
  }
  // If type_activite was populated, transform its _id as well
  if (
    newDoc.type_activite &&
    typeof newDoc.type_activite === "object" &&
    newDoc.type_activite._id
  ) {
    newDoc.type_activite.id = newDoc.type_activite._id.toString();
    delete newDoc.type_activite._id;
  }
  return newDoc;
}

// Helper to transform _id to id for arrays of documents
function transformDocuments(docs) {
  if (!docs) return [];
  return docs.map(transformDocument);
}

export async function getAllCraActivities() {
  const db = await getMongoDb();
  try {
    const activities = await db.collection(COLLECTION_NAME).find({}).toArray();
    console.log(
      `MongoDB ${COLLECTION_NAME}: Récupération de toutes les activités: ${activities.length} documents.`
    );
    return transformDocuments(activities); // Transform for frontend
  } catch (error) {
    console.error(
      `MongoDB ${COLLECTION_NAME}: Erreur lors de la récupération de toutes les activités:`,
      error
    );
    throw new Error(
      `Échec de la récupération de toutes les activités: ${error.message}`
    );
  }
}

export async function getCraActivityById(id) {
  const db = await getMongoDb();
  if (
    !id ||
    typeof id !== "string" ||
    id.length !== 24 ||
    !id.match(/^[0-9a-fA-F]{24}$/)
  ) {
    console.warn(
      `MongoDB ${COLLECTION_NAME}: ID d'activité CRA invalide fourni pour la recherche: ${id}`
    );
    return null;
  }
  try {
    const activity = await db
      .collection(COLLECTION_NAME)
      .findOne({ _id: new ObjectId(id) });

    console.log(
      `MongoDB ${COLLECTION_NAME}: Activité CRA par ID ${id}: ${
        activity ? "Trouvée" : "Non trouvée"
      }.`
    );
    return transformDocument(activity); // Transform for frontend
  } catch (error) {
    console.error(
      `MongoDB ${COLLECTION_NAME}: Erreur lors de la récupération de l'activité CRA par ID ${id}:`,
      error
    );
    return null;
  }
}

export async function createCraActivity(data) {
  const db = await getMongoDb();

  // Store client_id and type_activite as strings directly,
  // as they are not valid ObjectIds from the frontend based on logs.
  // This assumes the 'id' field in clients/activitytypes is a string (e.g., numeric string).
  const newActivity = {
    date_activite: new Date(data.date_activite), // Assurez-vous que c'est un objet Date
    temps_passe: data.temps_passe,
    description_activite: data.description_activite || null,
    type_activite: data.type_activite, // Stored as String
    client_id: data.client_id || null, // Stored as String
    override_non_working_day: Boolean(data.override_non_working_day),
    status: data.status || "draft",
    user_id: data.user_id, // user_id is a string, not an ObjectId
    created_at: new Date(),
    updated_at: new Date(),
  };
  try {
    const result = await db.collection(COLLECTION_NAME).insertOne(newActivity);
    console.log(
      `MongoDB ${COLLECTION_NAME}: Activité CRA créée avec ID: ${result.insertedId}`
    );
    // Return the inserted document with the _id transformed to id
    return transformDocument({ ...newActivity, _id: result.insertedId });
  } catch (error) {
    console.error(
      `MongoDB ${COLLECTION_NAME}: Erreur lors de la création de l'activité CRA:`,
      error
    );
    throw new Error(`Échec de la création de l'activité CRA: ${error.message}`);
  }
}

export async function updateCraActivity(id, updateData) {
  const db = await getMongoDb();
  if (
    !id ||
    typeof id !== "string" ||
    id.length !== 24 ||
    !id.match(/^[0-9a-fA-F]{24}$/)
  ) {
    console.warn(
      `MongoDB ${COLLECTION_NAME}: ID d'activité CRA invalide fourni pour la mise à jour: ${id}`
    );
    return null;
  }
  const objectId = new ObjectId(id);
  const updateDoc = { $set: { updated_at: new Date() } };

  if (updateData.date_activite !== undefined)
    updateDoc.$set.date_activite = new Date(updateData.date_activite);
  if (updateData.temps_passe !== undefined)
    updateDoc.$set.temps_passe = updateData.temps_passe;
  if (updateData.description_activite !== undefined)
    updateDoc.$set.description_activite = updateData.description_activite;

  // Store type_activite and client_id as strings in update
  if (updateData.type_activite !== undefined) {
    updateDoc.$set.type_activite = updateData.type_activite; // Stored as String
  }

  if (updateData.client_id !== undefined) {
    updateDoc.$set.client_id = updateData.client_id; // Stored as String
  }
  if (updateData.override_non_working_day !== undefined)
    updateDoc.$set.override_non_working_day = Boolean(
      updateData.override_non_working_day
    );
  if (updateData.status !== undefined)
    updateDoc.$set.status = updateData.status;

  try {
    const res = await db
      .collection(COLLECTION_NAME)
      .findOneAndUpdate({ _id: objectId }, updateDoc, {
        returnDocument: "after",
      });
    console.log(
      `MongoDB ${COLLECTION_NAME}: Activité CRA mise à jour pour ID ${id}: ${
        res.value ? "Succès" : "Non trouvée"
      }.`
    );
    return transformDocument(res.value); // Transform for frontend
  } catch (error) {
    console.error(
      `MongoDB ${COLLECTION_NAME}: Erreur lors de la mise à jour de l'activité CRA par ID ${id}:`,
      error
    );
    throw new Error(
      `Échec de la mise à jour de l'activité CRA: ${error.message}`
    );
  }
}

export async function deleteCraActivity(id) {
  const db = await getMongoDb();
  if (
    !id ||
    typeof id !== "string" ||
    id.length !== 24 ||
    !id.match(/^[0-9a-fA-F]{24}$/)
  ) {
    console.warn(
      `MongoDB ${COLLECTION_NAME}: ID d'activité CRA invalide fourni pour la suppression: ${id}`
    );
    return { deleted: false };
  }
  try {
    const res = await db
      .collection(COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(id) });
    console.log(
      `MongoDB ${COLLECTION_NAME}: Activité CRA supprimée pour ID ${id}: ${
        res.deletedCount > 0 ? "Oui" : "Non"
      }.`
    );
    return { deleted: res.deletedCount > 0 };
  } catch (error) {
    console.error(
      `MongoDB ${COLLECTION_NAME}: Erreur lors de la suppression de l'activité CRA par ID ${id}:`,
      error
    );
    throw new Error(
      `Échec de la suppression de l'activité CRA: ${error.message}`
    );
  }
}

export async function getCraActivitiesByDateRange(userId, startDate, endDate) {
  const db = await getMongoDb();
  try {
    const query = {
      user_id: userId, // Filter by user_id (expected to be a String)
      date_activite: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: CLIENT_COLLECTION_NAME, // The collection to join with
          localField: "client_id", // Field from the input documents (now a String)
          foreignField: "id", // Field from the "from" documents (assuming it's 'id' string)
          as: "client_id", // Output array field name
        },
      },
      {
        $unwind: {
          path: "$client_id",
          preserveNullAndEmptyArrays: true, // Keep activity if no client match
        },
      },
      {
        $lookup: {
          from: ACTIVITY_TYPE_COLLECTION_NAME, // The collection to join with
          localField: "type_activite", // Field from the input documents (now a String)
          foreignField: "id", // Field from the "from" documents (assuming it's 'id' string)
          as: "type_activite",
        },
      },
      {
        $unwind: {
          path: "$type_activite",
          preserveNullAndEmptyArrays: true, // Keep activity if no activity type match
        },
      },
    ];

    console.log(
      `MongoDB ${COLLECTION_NAME}: Exécution de l'agrégation avec le pipeline:`,
      JSON.stringify(pipeline, null, 2)
    );

    const activities = await db
      .collection(COLLECTION_NAME)
      .aggregate(pipeline)
      .toArray();

    console.log(
      `MongoDB ${COLLECTION_NAME}: ${activities.length} activités trouvées pour userId ${userId} entre ${startDate} et ${endDate}.`
    );
    return transformDocuments(activities); // Transform for frontend, handles populated fields
  } catch (error) {
    console.error(
      `MongoDB ${COLLECTION_NAME}: Erreur lors de la récupération des activités par plage de dates (agrégation):`,
      error
    );
    throw new Error(
      `Échec de la récupération des activités par plage de dates: ${error.message}`
    );
  }
}
