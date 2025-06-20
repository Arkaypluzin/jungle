// app/api/client/route.js
import { NextResponse } from "next/server";
// Correction: Importer getAllClientsController (pas getClient)
import { getAllClientsController, createClientController } from "./controller";

/**
 * Gère les requêtes GET pour récupérer tous les clients.
 * @param {Request} request L'objet de requête Next.js.
 * @returns {NextResponse} Une réponse JSON.
 */
export async function GET() {
  try {
    // Correction: Appeler getAllClientsController
    return await getAllClientsController();
  } catch (error) {
    console.error("Erreur dans la route GET /api/client:", error);
    return NextResponse.json(
      {
        message: "Erreur lors de la récupération des clients.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Gère les requêtes POST pour créer un nouveau client.
 * @param {Request} request L'objet de requête Next.js.
 * @returns {NextResponse} Une réponse JSON.
 */
export async function POST(request) {
  try {
    const clientData = await request.json();
    return await createClientController(clientData);
  } catch (error) {
    console.error("Erreur dans POST /api/client (route):", error);
    return NextResponse.json(
      {
        message: "Requête invalide: le corps doit être un JSON valide.",
        error: error.message,
      },
      { status: 400 }
    );
  }
}
