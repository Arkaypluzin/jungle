// app/api/cra/route.js
import { NextResponse } from "next/server";
// CORRECTION ICI: Changer 'getCRAsController' en 'getAllCRAsController'
import { getAllCRAsController, createCRAController } from "./controller"; // Importe les fonctions du contrôleur local

/**
 * Gère les requêtes GET pour récupérer tous les CRAs.
 * @param {Request} request L'objet de requête Next.js.
 * @returns {NextResponse} Une réponse JSON.
 */
export async function GET() {
  return await getAllCRAsController();
}

/**
 * Gère les requêtes POST pour créer un nouveau CRA.
 * @param {Request} request L'objet de requête Next.js.
 * @returns {NextResponse} Une réponse JSON.
 */
export async function POST(request) {
  try {
    const craData = await request.json();
    return await createCRAController(craData);
  } catch (error) {
    console.error("Erreur dans POST /api/cra (route):", error);
    return NextResponse.json(
      {
        message: "Requête invalide: le corps doit être un JSON valide.",
        error: error.message,
      },
      { status: 400 }
    );
  }
}
