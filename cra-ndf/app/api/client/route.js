// app/api/client/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // Importation de 'db' nommée

// Fonction utilitaire pour gérer les réponses d'erreur
const handleError = (message, status = 500) => {
  console.error("Erreur API :", message);
  return NextResponse.json({ message }, { status });
};

export async function GET(request) {
  try {
    const [clients] = await db.execute(
      "SELECT id, nom_client FROM client ORDER BY nom_client ASC"
    );
    return NextResponse.json(clients);
  } catch (error) {
    return handleError(
      `Impossible de récupérer les clients : ${error.message}`
    );
  }
}

export async function POST(request) {
  try {
    const { nom_client } = await request.json();

    if (!nom_client || nom_client.trim() === "") {
      return handleError("Le nom du client est requis.", 400);
    }

    const [result] = await db.execute(
      "INSERT INTO client (nom_client) VALUES (?)",
      [nom_client.trim()]
    );

    return NextResponse.json(
      { id: result.insertId, nom_client: nom_client.trim() },
      { status: 201 }
    );
  } catch (error) {
    if (
      error.message.includes("Duplicate entry") ||
      error.code === "ER_DUP_ENTRY"
    ) {
      return handleError("Un client avec ce nom existe déjà.", 409); // Conflit
    }
    return handleError(`Impossible d'ajouter le client : ${error.message}`);
  }
}
