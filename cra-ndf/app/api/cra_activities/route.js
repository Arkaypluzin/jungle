// app/api/cra_activities/route.js
import { NextResponse } from "next/server";
import {
  getAllCraActivitiesController,
  createCraActivityController,
} from "./controller";

/**
 * Gère les requêtes GET pour récupérer toutes les activités CRA.
 * @param {Request} request L'objet de requête Next.js.
 * @returns {NextResponse} Une réponse JSON.
 */
export async function GET() {
  return await getAllCraActivitiesController();
}

/**
 * Gère les requêtes POST pour créer une nouvelle activité CRA.
 * @param {Request} request L'objet de requête Next.js.
 * @returns {NextResponse} Une réponse JSON.
 */
export async function POST(request) {
  try {
    const activityData = await request.json();
    return await createCraActivityController(activityData);
  } catch (error) {
    console.error("Erreur dans POST /api/cra_activities (route):", error);
    return NextResponse.json(
      {
        message: "Requête invalide: le corps doit être un JSON valide.",
        error: error.message,
      },
      { status: 400 }
    );
  }
}
