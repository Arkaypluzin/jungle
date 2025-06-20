// app/api/activity_type/route.js
import { NextResponse } from "next/server";
import {
  getAllActivityTypesController,
  createActivityTypeController,
} from "./controller";

export async function GET() {
  return await getAllActivityTypesController();
}

export async function POST(request) {
  try {
    const activityTypeData = await request.json();
    return await createActivityTypeController(activityTypeData);
  } catch (error) {
    console.error("Erreur dans POST /api/activity_type (route):", error);
    return NextResponse.json(
      {
        message: "Requête invalide: le corps doit être un JSON valide.",
        error: error.message,
      },
      { status: 400 }
    );
  }
}
