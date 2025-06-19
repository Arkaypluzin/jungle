// app/api/cra_activities/route.js

import { NextResponse } from "next/server";
// CORRECTION ICI : Le contrôleur est dans le même dossier
import { getCraActivities, createCraActivity } from "./controller";

/**
 * Gère les requêtes GET pour récupérer toutes les activités de CRA.
 * @param {Request} request L'objet de requête.
 * @returns {NextResponse} Une réponse JSON contenant la liste des activités ou une erreur.
 */
export async function GET(request) {
  try {
    return await getCraActivities();
  } catch (error) {
    console.error("Erreur dans la route GET /api/cra_activities:", error);
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
 * Gère les requêtes POST pour créer une nouvelle activité de CRA.
 * @param {Request} request L'objet de requête.
 * @returns {NextResponse} Une réponse JSON confirmant la création ou une erreur.
 */
export async function POST(request) {
  try {
    const activityData = await request.json();
    return await createCraActivity(activityData);
  } catch (error) {
    console.error("Erreur dans la route POST /api/cra_activities:", error);
    // Le contrôleur est maintenant censé gérer les erreurs spécifiques comme la clé étrangère.
    // Cette route attrape les erreurs non gérées par le contrôleur ou les erreurs de parsing.
    return NextResponse.json(
      {
        message: "Erreur lors de la création de l'activité de CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
