// app/api/activity_type/[id]/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const handleError = (message, status = 500) => {
  console.error("API Error:", message);
  return NextResponse.json({ message }, { status });
};

// GET handler (récupérer un type d'activité par ID)
export async function GET(request, { params }) {
  const { id } = await params; // Await params as suggested by Next.js error

  if (!id) {
    return handleError("Activity type ID is required.", 400);
  }

  try {
    const [rows] = await db.execute(
      "SELECT id, name, is_billable FROM activity_type WHERE id = ?",
      [id]
    );
    if (rows.length === 0) {
      return handleError("Activity type not found.", 404);
    }
    return NextResponse.json(rows[0]);
  } catch (error) {
    return handleError(`Error fetching activity type: ${error.message}`);
  }
}

// PUT handler (mettre à jour un type d'activité par ID)
export async function PUT(request, { params }) {
  const { id } = await params; // Await params as suggested by Next.js error

  try {
    const { name, is_billable } = await request.json();

    if (!id) {
      return handleError("Activity type ID is required for update.", 400);
    }
    if (!name) {
      return handleError("Activity type name is required.", 400);
    }

    const [result] = await db.execute(
      "UPDATE activity_type SET name = ?, is_billable = ? WHERE id = ?",
      [name, is_billable ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      return handleError("Activity type not found or no changes made.", 404);
    }

    // Récupérer le type d'activité mis à jour pour le renvoyer
    const [updatedTypeResult] = await db.execute(
      "SELECT id, name, is_billable FROM activity_type WHERE id = ?",
      [id]
    );
    const updatedType = updatedTypeResult[0];

    return NextResponse.json(updatedType);
  } catch (error) {
    return handleError(`Error updating activity type: ${error.message}`);
  }
}

// DELETE handler (supprimer un type d'activité par ID)
export async function DELETE(request, { params }) {
  const { id } = await params; // Await params as suggested by Next.js error

  if (!id) {
    return handleError("Activity type ID is required for deletion.", 400);
  }

  try {
    const [result] = await db.execute(
      "DELETE FROM activity_type WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return handleError("Activity type not found.", 404);
    }

    return NextResponse.json({
      message: "Activity type deleted successfully.",
    });
  } catch (error) {
    return handleError(`Error deleting activity type: ${error.message}`);
  }
}
