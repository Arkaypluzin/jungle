// app/api/activity_type/[id]/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // Importation de 'db' nommée

// Fonction utilitaire pour gérer les réponses d'erreur
const handleError = (message, status = 500) => {
  console.error("Erreur API :", message);
  return NextResponse.json({ message }, { status });
};

export async function GET(request, { params }) {
  const { id } = params;
  try {
    // Correction du nom de la table : activity_types -> activity_type
    const [activityType] = await db.execute(
      "SELECT id, name FROM activity_type WHERE id = ?",
      [id]
    );
    if (activityType.length === 0) {
      return handleError("Type d'activité non trouvé.", 404);
    }
    return NextResponse.json(activityType[0]);
  } catch (error) {
    return handleError(
      `Impossible de récupérer le type d'activité : ${error.message}`
    );
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const { name } = await request.json();

    if (!name || name.trim() === "") {
      return handleError("Le nom du type d'activité est requis.", 400);
    }

    // Correction du nom de la table : activity_types -> activity_type
    const [result] = await db.execute(
      "UPDATE activity_type SET name = ? WHERE id = ?",
      [name.trim(), id]
    );

    if (result.affectedRows === 0) {
      // Correction du nom de la table : activity_types -> activity_type
      const [existingType] = await db.execute(
        "SELECT id FROM activity_type WHERE id = ?",
        [id]
      );
      if (existingType) {
        return NextResponse.json(
          {
            message:
              "Type d'activité mis à jour avec succès (aucune modification nécessaire).",
          },
          { status: 200 }
        );
      } else {
        return handleError("Type d'activité non trouvé.", 404);
      }
    }

    return NextResponse.json({
      message: "Type d'activité mis à jour avec succès.",
    });
  } catch (error) {
    if (
      error.message.includes("Duplicate entry") ||
      error.code === "ER_DUP_ENTRY"
    ) {
      return handleError(
        "Un autre type d'activité avec ce nom existe déjà.",
        409
      ); // Conflit
    }
    return handleError(
      `Impossible de mettre à jour le type d'activité : ${error.message}`
    );
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    // Correction du nom de la table : activity_types -> activity_type
    const [result] = await db.execute(
      "DELETE FROM activity_type WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return handleError("Type d'activité non trouvé.", 404);
    }

    return NextResponse.json({
      message: "Type d'activité supprimé avec succès.",
    });
  } catch (error) {
    if (
      error.message.includes("foreign key constraint fails") ||
      error.code === "ER_ROW_IS_REFERENCED_2"
    ) {
      return handleError(
        "Impossible de supprimer ce type d'activité car il est associé à une ou plusieurs activités CRA. Veuillez d'abord supprimer ou modifier les activités CRA associées.",
        409
      );
    }
    return handleError(
      `Impossible de supprimer le type d'activité : ${error.message}`
    );
  }
}
