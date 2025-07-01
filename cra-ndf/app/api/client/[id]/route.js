// app/api/client/[id]/route.js
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
    const [client] = await db.execute(
      "SELECT id, nom_client FROM client WHERE id = ?",
      [id]
    );
    if (client.length === 0) {
      return handleError("Client non trouvé.", 404);
    }
    return NextResponse.json(client[0]);
  } catch (error) {
    return handleError(`Impossible de récupérer le client : ${error.message}`);
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const { nom_client } = await request.json();

    if (!nom_client || nom_client.trim() === "") {
      return handleError("Le nom du client est requis.", 400);
    }

    const [result] = await db.execute(
      "UPDATE client SET nom_client = ? WHERE id = ?",
      [nom_client.trim(), id]
    );

    if (result.affectedRows === 0) {
      const [existingClient] = await db.execute(
        "SELECT id FROM client WHERE id = ?",
        [id]
      );
      if (existingClient) {
        return NextResponse.json(
          {
            message:
              "Client mis à jour avec succès (aucune modification nécessaire).",
          },
          { status: 200 }
        );
      } else {
        return handleError("Client non trouvé.", 404);
      }
    }

    return NextResponse.json({ message: "Client mis à jour avec succès." });
  } catch (error) {
    if (
      error.message.includes("Duplicate entry") ||
      error.code === "ER_DUP_ENTRY"
    ) {
      return handleError("Un autre client avec ce nom existe déjà.", 409); // Conflit
    }
    return handleError(
      `Impossible de mettre à jour le client : ${error.message}`
    );
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const [result] = await db.execute("DELETE FROM client WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return handleError("Client non trouvé.", 404);
    }

    return NextResponse.json({ message: "Client supprimé avec succès." });
  } catch (error) {
    if (
      error.message.includes("foreign key constraint fails") ||
      error.code === "ER_ROW_IS_REFERENCED_2"
    ) {
      return handleError(
        "Impossible de supprimer ce client car il est associé à une ou plusieurs activités CRA. Veuillez d'abord supprimer ou modifier les activités CRA associées.",
        409
      );
    }
    return handleError(`Impossible de supprimer le client : ${error.message}`);
  }
}
