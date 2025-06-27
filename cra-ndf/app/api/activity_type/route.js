// app/api/activity_type/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const handleError = (message, status = 500) => {
  console.error("API Error:", message);
  return NextResponse.json({ message }, { status });
};

// GET handler (récupérer tous les types d'activité)
export async function GET() {
  // Removed { params } from here
  try {
    const [rows] = await db.execute(
      "SELECT id, name, is_billable FROM activity_type ORDER BY name ASC"
    );
    return NextResponse.json(rows);
  } catch (error) {
    return handleError(`Error fetching activity types: ${error.message}`);
  }
}

// POST handler (ajouter un nouveau type d'activité)
export async function POST(request) {
  try {
    const { name, is_billable } = await request.json();

    if (!name) {
      return handleError("Activity type name is required.", 400);
    }

    const [result] = await db.execute(
      "INSERT INTO activity_type (name, is_billable) VALUES (?, ?)",
      [name, is_billable ? 1 : 0]
    );

    const [newTypeResult] = await db.execute(
      "SELECT id, name, is_billable FROM activity_type WHERE id = ?",
      [result.insertId]
    );
    const newType = newTypeResult[0];

    return NextResponse.json(newType, { status: 201 });
  } catch (error) {
    return handleError(`Error adding activity type: ${error.message}`);
  }
}
