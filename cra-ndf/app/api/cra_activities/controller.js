// app/api/cra_activities/controller.js

// Importe le modèle d'activités de CRA pour interagir avec la base de données.
// Le chemin './model' suppose que model.js est dans le même dossier que ce contrôleur.
import * as craActivityModel from "./model";
// Importe NextResponse de Next.js pour gérer les réponses HTTP.
import { NextResponse } from "next/server";

/**
 * Récupère toutes les activités de CRA.
 * @returns {NextResponse} Une réponse JSON contenant la liste des activités ou une erreur.
 */
export async function getCraActivities() {
  try {
    const activities = await craActivityModel.getAllCraActivities();
    return NextResponse.json(activities, { status: 200 });
  } catch (error) {
    console.error("Erreur dans getCraActivities:", error);
    return NextResponse.json(
      {
        message: "Erreur lors de la récupération des activités de CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Crée une nouvelle activité de CRA.
 * @param {Object} activityData Les données de la nouvelle activité.
 * @returns {NextResponse} Une réponse JSON confirmant la création ou une erreur.
 */
export async function createCraActivity(activityData) {
  // Validation améliorée pour s'assurer que les champs sont présents et non vides.
  if (
    !activityData ||
    !activityData.description_activite ||
    activityData.description_activite.trim() === "" ||
    !activityData.temps_passe ||
    !activityData.date_activite ||
    activityData.date_activite.trim() === "" ||
    !activityData.type_activite ||
    activityData.type_activite.trim() === ""
  ) {
    return NextResponse.json(
      {
        message:
          "Les champs 'description_activite', 'temps_passe', 'date_activite' et 'type_activite' sont requis et ne peuvent pas être vides.",
      },
      { status: 400 }
    );
  }

  try {
    const newActivity = await craActivityModel.createCraActivity(activityData);
    return NextResponse.json(newActivity, { status: 201 });
  } catch (error) {
    console.error("Erreur dans createCraActivity (contrôleur):", error);
    let errorMessage = "Erreur lors de la création de l'activité de CRA.";
    let statusCode = 500;

    // Détecte spécifiquement l'erreur de contrainte de clé étrangère
    if (error.code === "ER_NO_REFERENCED_ROW_2" || error.errno === 1452) {
      errorMessage =
        "Erreur: Le CRA spécifié () n'existe pas. Veuillez créer le CRA d'abord ou utiliser un ID de CRA valide.";
      statusCode = 400; // Bad Request car l'ID fourni est invalide.
    }

    return NextResponse.json(
      { message: errorMessage, error: error.message },
      { status: statusCode }
    );
  }
}

/**
 * Récupère une activité de CRA par son ID.
 * @param {number} id L'ID de l'activité à récupérer.
 * @returns {NextResponse} Une réponse JSON contenant l'activité ou une erreur.
 */
export async function getCraActivityById(id) {
  try {
    const activity = await craActivityModel.getCraActivityById(id);
    if (activity) {
      return NextResponse.json(activity, { status: 200 });
    } else {
      return NextResponse.json(
        { message: "Activité de CRA non trouvée." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(`Erreur dans getCraActivityById pour l'ID ${id}:`, error);
    return NextResponse.json(
      {
        message: "Erreur lors de la récupération de l'activité de CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Met à jour une activité de CRA existante.
 * @param {number} id L'ID de l'activité à mettre à jour.
 * @param {Object} updateData Les données à mettre à jour pour l'activité.
 * @returns {NextResponse} Une réponse JSON de confirmation ou une erreur.
 */
export async function updateCraActivity(id, updateData) {
  if (
    !updateData ||
    typeof updateData !== "object" ||
    Object.keys(updateData).length === 0
  ) {
    return NextResponse.json(
      {
        message:
          "Aucune donnée valide fournie pour la mise à jour de l'activité de CRA.",
      },
      { status: 400 }
    );
  }
  try {
    const success = await craActivityModel.updateCraActivity(id, updateData);
    if (success) {
      return NextResponse.json(
        { message: "Activité de CRA mise à jour avec succès." },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          message:
            "Activité de CRA non trouvée ou aucune modification effectuée.",
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(`Erreur dans updateCraActivity pour l'ID ${id}:`, error);
    return NextResponse.json(
      {
        message: "Erreur lors de la mise à jour de l'activité de CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Supprime une activité de CRA par son ID.
 * @param {number} id L'ID de l'activité à supprimer.
 * @returns {NextResponse} Une réponse JSON de confirmation ou une erreur.
 */
export async function deleteCraActivity(id) {
  try {
    const success = await craActivityModel.deleteCraActivity(id);
    if (success) {
      return NextResponse.json(
        { message: "Activité de CRA supprimée avec succès." },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: "Activité de CRA non trouvée." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(`Erreur dans deleteCraActivity pour l'ID ${id}:`, error);
    return NextResponse.json(
      {
        message: "Erreur lors de la suppression de l'activité de CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
