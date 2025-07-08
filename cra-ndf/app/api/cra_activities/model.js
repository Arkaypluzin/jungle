// app/api/cra_activities/model.js
import { getMongoDb } from "@/lib/mongo";
import { ObjectId } from "mongodb";

const COLLECTION_NAME = "cra_activities";

export async function getAllCraActivities() {
  const db = await getMongoDb();
  try {
    const activities = await db.collection(COLLECTION_NAME).find({}).toArray();
    console.log(
      `MongoDB ${COLLECTION_NAME}: Récupération de toutes les activités: ${activities.length} documents.`
    );
    return activities;
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
    return activity;
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
  const newActivity = {
    date_activite: new Date(data.date_activite), // Assurez-vous que c'est un objet Date
    temps_passe: data.temps_passe,
    description_activite: data.description_activite || null,
    type_activite: new ObjectId(data.type_activite),
    client_id: data.client_id ? new ObjectId(data.client_id) : null,
    override_non_working_day: Boolean(data.override_non_working_day),
    status: data.status || "draft",
    user_id: data.user_id, // <-- S'assure que user_id est bien enregistré
    created_at: new Date(),
    updated_at: new Date(),
  };
  try {
    const result = await db.collection(COLLECTION_NAME).insertOne(newActivity);
    console.log(
      `MongoDB ${COLLECTION_NAME}: Activité CRA créée avec ID: ${result.insertedId}`
    );
    return { ...newActivity, _id: result.insertedId };
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
  if (updateData.type_activite !== undefined)
    updateDoc.$set.type_activite = new ObjectId(updateData.type_activite);
  if (updateData.client_id !== undefined)
    updateDoc.$set.client_id = updateData.client_id
      ? new ObjectId(updateData.client_id)
      : null;
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
    return res.value;
  } catch (error) {
    console.error(
      `MongoDB ${COLLECTION_NAME}: Erreur lors de la mise à jour de l'activité CRA par ID ${id}:`,
      error
    );
    return null;
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
    return { deleted: false };
  }
}

export async function getCraActivitiesByDateRange(startDate, endDate) {
  const db = await getMongoDb();
  try {
    const query = {
      date_activite: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
    const activities = await db
      .collection(COLLECTION_NAME)
      .find(query)
      .toArray();
    console.log(
      `MongoDB ${COLLECTION_NAME}: ${activities.length} activités trouvées entre ${startDate} et ${endDate}.`
    );
    return activities;
  } catch (error) {
    console.error(
      `MongoDB ${COLLECTION_NAME}: Erreur lors de la récupération des activités par plage de dates:`,
      error
    );
    throw new Error(
      `Échec de la récupération des activités par plage de dates: ${error.message}`
    );
  }
}
