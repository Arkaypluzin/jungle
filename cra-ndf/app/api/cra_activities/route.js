// app/api/cra_activities/route.js
import { NextResponse } from "next/server";
import {
  getAllCraActivitiesController,
  createCraActivityController,
  getCraActivityByIdController,
  updateCraActivityController,
  deleteCraActivityController,
} from "./controller";

export async function GET(request) {
  // Passe la requête pour que le contrôleur puisse accéder aux searchParams (userId)
  return getAllCraActivitiesController(request);
}

export async function POST(request) {
  const activity = await request.json();
  return createCraActivityController(activity);
}

// Pour les routes dynamiques comme /api/cra_activities/[id]
// Assurez-vous que vous avez un dossier [id] à côté de ce route.js
// et un fichier route.js à l'intérieur de ce dossier [id]
// Ex: app/api/cra_activities/[id]/route.js
/*
export async function GET_BY_ID(request, { params }) { // Cette fonction n'est pas appelée directement par Next.js dans route.js
  const { id } = params;
  return getCraActivityByIdController(id);
}
*/

export async function PUT(request, { params }) {
  const { id } = params;
  const updateData = await request.json();
  return updateCraActivityController(id, updateData);
}

export async function DELETE(request, { params }) {
  const { id } = params;
  return deleteCraActivityController(id);
}
