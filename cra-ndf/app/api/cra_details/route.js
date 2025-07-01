// app/api/cra_details/route.js
import { NextResponse } from "next/server";
import {
  getCraDetailsController,
  createCraDetailController,
} from "./controller";

export async function GET() {
  return await getCraDetailsController();
}

export async function POST(request) {
  try {
    const body = await request.json();
    return await createCraDetailController(body);
  } catch (error) {
    console.error("Erreur dans POST /api/cra_details:", error);
    return NextResponse.json(
      {
        message: "Requête invalide: le corps doit être un JSON valide.",
        error: error.message,
      },
      { status: 400 }
    );
  }
}
