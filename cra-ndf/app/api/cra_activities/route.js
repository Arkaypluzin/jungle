// app/api/cra_activities/route.js
import { NextResponse } from "next/server";
import {
  createCraActivityController,
  getCraActivitiesByDateRangeController,
  // getCraActivityByIdController, // Non utilisé directement ici
  // updateCraActivityController, // Non utilisé directement ici
  // deleteCraActivityController, // Non utilisé directement ici
  getAllCraActivitiesController, // Importé pour gérer les requêtes sans userId
} from "./controller";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Si aucun userId n'est fourni, la requête est pour TOUTES les activités (vue d'ensemble)
  if (!userId) {
    console.log(
      "Route (CRA Activities): Requête pour toutes les activités (pas de userId)."
    );
    // Appelle le contrôleur qui récupère TOUTES les activités sans filtre utilisateur.
    // Il est crucial que getAllCraActivitiesController et son modèle sous-jacent ne filtrent PAS par userId.
    return getAllCraActivitiesController();
  }

  // Si userId est fourni, ALORS startDate et endDate sont requis.
  if (!startDate || !endDate) {
    console.warn(
      "Route (CRA Activities): Requête avec userId mais sans startDate/endDate."
    );
    return NextResponse.json(
      {
        message:
          "Les paramètres startDate et endDate sont requis lorsque l'ID utilisateur est fourni.",
      },
      { status: 400 }
    );
  }

  // Si userId ET startDate/endDate sont fournis, récupérer les activités de cet utilisateur pour la plage de dates
  console.log(
    `Route (CRA Activities): Requête pour activités de l'utilisateur ${userId} entre ${startDate} et ${endDate}.`
  );
  return getCraActivitiesByDateRangeController(userId, startDate, endDate);
}

export async function POST(request) {
  const activityData = await request.json();
  return createCraActivityController(activityData);
}

// Les fonctions PUT et DELETE pour les routes dynamiques ([id]) ne sont pas gérées ici,
// mais dans un fichier route.js séparé comme app/api/cra_activities/[id]/route.js.
// Assurez-vous que vos fichiers app/api/cra_activities/[id]/route.js existent et gèrent PUT/DELETE.
