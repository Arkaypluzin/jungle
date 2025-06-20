// app/api/activity_type/[id]/route.js
import { NextResponse } from "next/server";
import {
  getActivityTypeByIdController,
  updateActivityTypeController,
  deleteActivityTypeController,
} from "../controller";

export async function GET(request, { params }) {
  const { id } = await params;
  return await getActivityTypeByIdController(parseInt(id, 10));
}

export async function PUT(request, { params }) {
  const { id } = await params;
  try {
    const updateData = await request.json();
    return await updateActivityTypeController(parseInt(id, 10), updateData);
  } catch (error) {
    console.error("Erreur dans PUT /api/activity_type/[id]:", error);
    return NextResponse.json(
      {
        message: "Requête invalide: le corps doit être un JSON valide.",
        error: error.message,
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  return await deleteActivityTypeController(parseInt(id, 10));
}
