// app/api/client/route.js

import { NextResponse } from "next/server";
// CORRECTION ICI : Le contrôleur est dans le même dossier
import { getClients, createClient } from "./controller";

/**
 * Gère les requêtes GET pour récupérer tous les clients.
 * @param {Request} request L'objet de requête.
 * @returns {NextResponse} Une réponse JSON contenant la liste des clients ou une erreur.
 */
export async function GET(request) {
  try {
    return await getClients();
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
 * @param {Request} request L'objet de requête.
 * @returns {NextResponse} Une réponse JSON confirmant la création ou une erreur.
 */
export async function POST(request) {
  try {
    const clientData = await request.json();
    return await createClient(clientData);
  } catch (error) {
    console.error("Erreur dans la route POST /api/client:", error);
    return NextResponse.json(
      {
        message: "Erreur lors de la création du client.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
