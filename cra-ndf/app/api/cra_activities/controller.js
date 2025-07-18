// app/api/cra_activities/controller.js
import * as craActivityModel from "./model";
import { NextResponse } from "next/server";

export async function getAllCraActivitiesController() {
  try {
    // Cette fonction appelle le modèle pour obtenir TOUTES les activités.
    // Elle ne doit PAS ajouter de filtre userId ici.
    const activities = await craActivityModel.getAllCraActivities();
    console.log(
      "Controller (CRA Activities): Récupération de toutes les activités:",
      activities.length,
      "documents."
    );
    return NextResponse.json(activities, { status: 200 });
  } catch (error) {
    console.error(
      "Controller (CRA Activities): Erreur dans getAllCraActivitiesController:",
      error
    );
    return NextResponse.json(
      {
        message: "Erreur lors de la récupération des activités CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function getCraActivityByIdController(id) {
  try {
    console.log(
      "Controller (CRA Activities): Réception de la requête pour getCraActivityByIdController avec ID:",
      id
    );
    const activity = await craActivityModel.getCraActivityById(id);
    if (activity) {
      console.log(
        "Controller (CRA Activities): Activité trouvée (getCraActivityById):",
        JSON.stringify(activity),
        `id présent: ${!!activity.id}`
      );
      return NextResponse.json(activity, { status: 200 });
    }
    console.warn(
      "Controller (CRA Activities): Activité non trouvée pour l'ID:",
      id
    );
    return NextResponse.json(
      { message: "Activité CRA non trouvée." },
      { status: 404 }
    );
  } catch (error) {
    console.error(
      "Controller (CRA Activities): Erreur dans getCraActivityByIdController pour ID:",
      id,
      error
    );
    return NextResponse.json(
      { message: "Erreur serveur.", error: error.message },
      { status: 500 }
    );
  }
}

export async function createCraActivityController(activityData) {
  console.log(
    "Controller (CRA Activities): Tentative de création d'une activité CRA avec données:",
    activityData
  );

  if (
    !activityData.date_activite ||
    !activityData.temps_passe ||
    !activityData.type_activite ||
    !activityData.user_id // Assurez-vous que user_id est toujours requis pour la création
  ) {
    console.warn(
      "Controller (CRA Activities): Données d'activité manquantes (validation échouée)."
    );
    return NextResponse.json(
      {
        message:
          "La date, le temps passé, le type d'activité et l'ID utilisateur sont requis.",
      },
      { status: 400 }
    );
  }
  try {
    const newActivity = await craActivityModel.createCraActivity(activityData);
    console.log(
      "Controller (CRA Activities): Activité CRA créée avec succès. ID:",
      newActivity.id,
      `id présent: ${!!newActivity.id}`
    );
    return NextResponse.json(newActivity, { status: 201 });
  } catch (error) {
    console.error(
      "Controller (CRA Activities): Erreur lors de la création de l'activité CRA:",
      error
    );
    return NextResponse.json(
      {
        message:
          error.message || "Erreur lors de la création de l'activité CRA.",
      },
      { status: error.cause?.name === "ValidationError" ? 400 : 500 }
    );
  }
}

export async function updateCraActivityController(id, updateData) {
  console.log(
    "Controller (CRA Activities): Réception de la requête pour updateCraActivityController avec ID:",
    id,
    "et données:",
    updateData
  );
  if (Object.keys(updateData).length === 0) {
    console.warn(
      "Controller (CRA Activities): Aucune donnée valide fournie pour la mise à jour."
    );
    return NextResponse.json(
      { message: "Aucune donnée valide fournie pour la mise à jour." },
      { status: 400 }
    );
  }

  try {
    const updatedActivity = await craActivityModel.updateCraActivity(
      id,
      updateData
    );
    if (updatedActivity) {
      console.log(
        "Controller (CRA Activities): Activité CRA mise à jour avec succès. ID:",
        updatedActivity.id,
        `id présent: ${!!updatedActivity.id}`
      );
      return NextResponse.json(updatedActivity, { status: 200 });
    }
    console.warn(
      "Controller (CRA Activities): Activité CRA non trouvée ou aucune modification effectuée pour ID:",
      id
    );
    return NextResponse.json(
      { message: "Activité CRA non trouvée ou aucune modification effectuée." },
      { status: 404 }
    );
  } catch (error) {
    console.error(
      "Controller (CRA Activities): Erreur lors de la mise à jour de l'activité CRA pour ID:",
      id,
      error
    );
    return NextResponse.json(
      { message: error.message || "Erreur serveur.", error: error.message },
      { status: 500 }
    );
  }
}

export async function deleteCraActivityController(id) {
  try {
    console.log(
      "Controller (CRA Activities): Réception de la requête pour deleteCraActivityController avec ID:",
      id
    );
    const result = await craActivityModel.deleteCraActivity(id);
    if (result.deleted) {
      console.log(
        "Controller (CRA Activities): Activité CRA supprimée avec succès. ID:",
        id
      );
      return new NextResponse(null, { status: 204 });
    }
    console.warn(
      "Controller (CRA Activities): Activité CRA non trouvée pour la suppression. ID:",
      id
    );
    return NextResponse.json(
      { message: "Activité CRA non trouvée." },
      { status: 404 }
    );
  } catch (error) {
    console.error(
      `Controller (CRA Activities): Erreur lors de la suppression de l'activité CRA par ID ${id}:`,
      error
    );
    return NextResponse.json(
      { message: error.message || "Erreur serveur.", error: error.message },
      { status: 500 }
    );
  }
}

export async function getCraActivitiesByDateRangeController(
  userId,
  startDate,
  endDate
) {
  try {
    console.log(
      `Controller (CRA Activities): Récupération des activités pour userId: ${userId}, du ${startDate} au ${endDate}`
    );
    // Cette fonction appelle le modèle avec un filtre userId
    const activities = await craActivityModel.getCraActivitiesByDateRange(
      userId,
      startDate,
      endDate
    );
    console.log(
      "Controller (CRA Activities): Activités CRA par plage de dates récupérées:",
      activities.length,
      "documents."
    );
    return NextResponse.json(activities, { status: 200 });
  } catch (error) {
    console.error(
      "Controller (CRA Activities): Erreur dans getCraActivitiesByDateRangeController:",
      error
    );
    return NextResponse.json(
      {
        message:
          error.message ||
          "Erreur lors de la récupération des activités CRA par plage de dates.",
      },
      { status: 500 }
    );
  }
}
