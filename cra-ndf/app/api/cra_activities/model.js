// app/api/cra_activities/model.js
import { getMongoDb } from "@/lib/mongo";
import { ObjectId } from "mongodb";

// IMPORTANT : Vérifiez que ces noms de collection correspondent EXACTEMENT à ceux de votre base de données MongoDB
const COLLECTION_NAME = "cra_activities";
const CLIENT_COLLECTION_NAME = "clients"; // <-- VÉRIFIEZ CE NOM DE COLLECTION DANS VOTRE DB ET AJUSTEZ SI NÉCESSAIRE
const ACTIVITY_TYPE_COLLECTION_NAME = "activitytypes"; // <-- VÉRIFIEZ CE NOM DE COLLECTION DANS VOTRE DB ET AJUSTEZ SI NÉCESSAIRE
const USER_COLLECTION_NAME = "cras_users"; // NOUVEAU : Nom de votre collection d'utilisateurs. VÉRIFIEZ ET AJUSTEZ SI NÉCESSAIRE.

// Helper to transform _id to id for single documents
function transformDocument(doc) {
  if (!doc) return null;
  const newDoc = { ...doc, id: doc._id.toString() };
  delete newDoc._id;
  return newDoc;
}

// Helper to transform _id to id for arrays of documents
function transformDocuments(docs) {
  if (!docs) return [];
  return docs.map(transformDocument);
}

// Fonction utilitaire pour le pipeline d'agrégation commun
const getLookupPipeline = () => [
  // Lookup pour les informations de l'utilisateur
  {
    $lookup: {
      from: USER_COLLECTION_NAME, // Nom de la collection des utilisateurs
      localField: "user_id", // Le champ dans cra_activities qui contient l'ID utilisateur (ex: azureAdUserId)
      foreignField: "azureAdUserId", // Le champ dans la collection users qui correspond (ex: azureAdUserId)
      as: "populatedUser", // Nom temporaire pour le champ populé
    },
  },
  {
    $unwind: {
      path: "$populatedUser",
      preserveNullAndEmptyArrays: true, // Garde le document même si l'utilisateur n'est pas trouvé (ex: activité orpheline)
    },
  },
  {
    $lookup: {
      from: CLIENT_COLLECTION_NAME,
      localField: "client_id",
      foreignField: "id", // Assumons que client_id est une chaîne et correspond à 'id' dans clients
      as: "populatedClient",
    },
  },
  {
    $unwind: {
      path: "$populatedClient",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: ACTIVITY_TYPE_COLLECTION_NAME,
      localField: "type_activite",
      foreignField: "id", // Match avec 'id' (string) dans 'activitytypes'
      as: "populatedActivityType",
    },
  },
  {
    $unwind: {
      path: "$populatedActivityType",
      preserveNullAndEmptyArrays: true,
    },
  },
  // Projet pour inclure les champs originaux et les noms populés
  {
    $project: {
      _id: 1, // Garder l'ID original pour la transformation _id -> id
      date_activite: 1,
      temps_passe: 1,
      description_activite: 1,
      override_non_working_day: 1,
      status: 1,
      user_id: 1, // Garde l'ID utilisateur original (azureAdUserId)
      created_at: 1,
      updated_at: 1,
      client_id: 1,
      type_activite: 1,

      // Nouveaux champs pour les noms populés et leurs propriétés
      userName: { $ifNull: ["$populatedUser.fullName", null] }, // Nom complet de l'utilisateur
      userAzureAdId: { $ifNull: ["$populatedUser.azureAdUserId", null] }, // L'ID Azure AD de l'utilisateur
      clientName: { $ifNull: ["$populatedClient.nom_client", null] },
      clientId: { $ifNull: ["$populatedClient.id", null] },
      activityTypeName: { $ifNull: ["$populatedActivityType.name", null] },
      activityTypeId: { $ifNull: ["$populatedActivityType.id", null] },
      is_billable: { $ifNull: ["$populatedActivityType.is_billable", false] },
      requires_client: {
        $ifNull: ["$populatedActivityType.requires_client", false],
      },
      is_overtime: { $ifNull: ["$populatedActivityType.is_overtime", false] },
    },
  },
];

// Fonction pour récupérer TOUTES les activités (sans filtre userId)
export async function getAllCraActivities() {
  const db = await getMongoDb();
  try {
    const pipeline = getLookupPipeline(); // Utilise le pipeline commun sans $match initial
    const activities = await db
      .collection(COLLECTION_NAME)
      .aggregate(pipeline)
      .toArray();
    console.log(
      `MongoDB ${COLLECTION_NAME}: Récupération de toutes les activités avec lookup: ${activities.length} documents.`
    );
    return transformDocuments(activities);
  } catch (error) {
    console.error(
      `MongoDB ${COLLECTION_NAME}: Erreur lors de la récupération de toutes les activités (agrégation):`,
      error
    );
    throw new Error(
      `Échec de la récupération de toutes les activités: ${error.message}`
    );
  }
}

export async function getCraActivityById(id) {
  const db = await getMongoDb();
  if (!ObjectId.isValid(id)) {
    console.warn(
      `MongoDB ${COLLECTION_NAME}: ID d'activité CRA invalide fourni pour la recherche: ${id}`
    );
    return null;
  }
  try {
    const pipeline = [
      { $match: { _id: new ObjectId(id) } },
      ...getLookupPipeline(), // Utilise le pipeline commun
    ];
    const activity = await db
      .collection(COLLECTION_NAME)
      .aggregate(pipeline)
      .toArray();

    console.log(
      `MongoDB ${COLLECTION_NAME}: Activité CRA par ID ${id}: ${
        activity.length > 0 ? "Trouvée" : "Non trouvée"
      }.`
    );
    return transformDocument(activity[0]);
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
    date_activite: new Date(data.date_activite),
    temps_passe: data.temps_passe,
    description_activite: data.description_activite || null,
    type_activite: String(data.type_activite),
    client_id: String(data.client_id) || null,
    override_non_working_day: Boolean(data.override_non_working_day),
    status: data.status || "draft",
    user_id: data.user_id, // user_id est l'azureAdUserId ici
    created_at: new Date(),
    updated_at: new Date(),
  };
  try {
    const result = await db.collection(COLLECTION_NAME).insertOne(newActivity);
    console.log(
      `MongoDB ${COLLECTION_NAME}: Activité CRA créée avec ID: ${result.insertedId}`
    );
    return { id: result.insertedId.toString(), ...newActivity };
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
  if (!ObjectId.isValid(id)) {
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
    updateDoc.$set.type_activite = String(updateData.type_activite);
  if (updateData.client_id !== undefined) {
    updateDoc.$set.client_id = String(updateData.client_id);
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
    return { id: id, ...updateData };
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
  if (!ObjectId.isValid(id)) {
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

// Fonction pour récupérer les activités par userId et plage de dates
export async function getCraActivitiesByDateRange(userId, startDate, endDate) {
  const db = await getMongoDb();
  try {
    const query = {
      user_id: userId, // Ici, user_id est l'azureAdUserId
      date_activite: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    const pipeline = [
      { $match: query },
      ...getLookupPipeline(), // Utilise le pipeline commun
    ];

    console.log(
      `MongoDB ${COLLECTION_NAME}: Exécution de l'agrégation avec le pipeline pour userId ${userId}:`,
      JSON.stringify(pipeline, null, 2)
    );

    const activities = await db
      .collection(COLLECTION_NAME)
      .aggregate(pipeline)
      .toArray();

    console.log(
      `MongoDB ${COLLECTION_NAME}: ${activities.length} activités trouvées pour userId ${userId} entre ${startDate} et ${endDate}.`
    );
    return transformDocuments(activities);
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
