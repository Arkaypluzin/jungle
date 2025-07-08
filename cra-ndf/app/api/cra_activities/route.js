// app/api/cra_activities/route.js
import { NextResponse } from "next/server";
import {
  createCraActivityController,
  getCraActivitiesByDateRangeController,
} from "./controller";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!userId) {
    return NextResponse.json(
      { message: "L'ID utilisateur est requis." },
      { status: 400 }
    );
  }

  // Si startDate et endDate sont fournis, utiliser la fonction par plage de dates
  if (startDate && endDate) {
    return getCraActivitiesByDateRangeController(userId, startDate, endDate);
  } else {
    // Sinon, utiliser la fonction pour toutes les activités de l'utilisateur (si implémentée)
    // Pour l'instant, nous redirigeons vers la plage de dates si aucune n'est spécifiée.
    // Vous pouvez implémenter une logique pour récupérer toutes les activités d'un user ici si nécessaire.
    return NextResponse.json(
      {
        message:
          "Veuillez fournir startDate et endDate pour récupérer les activités CRA.",
      },
      { status: 400 }
    );
  }
}

export async function POST(request) {
  // C'est ici que la correction est appliquée :
  // Vous devez AWAIT le parsing du corps JSON de la requête.
  const activityData = await request.json();
  return createCraActivityController(activityData);
}
