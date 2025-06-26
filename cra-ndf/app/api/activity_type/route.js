// app/api/activity_type/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // Importation de 'db' nommée

// Fonction utilitaire pour gérer les réponses d'erreur
const handleError = (message, status = 500) => {
  return NextResponse.json({ message }, { status });
};

export async function GET(request) {
  try {
    // Correction du nom de la table : activity_types -> activity_type
    const [activityTypes] = await db.execute(
      "SELECT id, name FROM activity_type ORDER BY name ASC"
    );
    return NextResponse.json(activityTypes);
  } catch (error) {
    return handleError(
      `Impossible de récupérer les types d'activités : ${error.message}`
    );
  }
}

export async function POST(request) {
  try {
    const { name } = await request.json();

    if (!name || name.trim() === "") {
      return handleError("Le nom du type d'activité est requis.", 400);
    }

    // Correction du nom de la table : activity_types -> activity_type
    const [result] = await db.execute(
      "INSERT INTO activity_type (name) VALUES (?)",
      [name.trim()]
    );

    return NextResponse.json(
      { id: result.insertId, name: name.trim() },
      { status: 201 }
    );
  } catch (error) {
    if (
      error.message.includes("Duplicate entry") ||
      error.code === "ER_DUP_ENTRY"
    ) {
      return handleError("Un type d'activité avec ce nom existe déjà.", 409); // Conflit
    }
    return handleError(
      `Impossible d'ajouter le type d'activité : ${error.message}`
    );
  }
}
