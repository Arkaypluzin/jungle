// app/api/cra/[id]/route.js
import { NextResponse } from "next/server";
import {
  getCRAByIdController,
  updateCRAController,
  deleteCRAController,
} from "../controller";

/**
 * Gère les requêtes GET pour récupérer un CRA par ID.
 * @param {Request} request L'objet de requête Next.js.
 * @param {Object} context Contient les paramètres dynamiques comme { params: { id } }.
 * @returns {NextResponse} Une réponse JSON.
 */
export async function GET(request, { params }) {
  const { id } = await params; // Correction: Ajouter 'await'
  return await getCRAByIdController(parseInt(id, 10));
}

/**
 * Gère les requêtes PUT pour mettre à jour un CRA par ID.
 * @param {Request} request L'objet de requête Next.js.
 * @param {Object} context Contient les paramètres dynamiques comme { params: { id } }.
 * @returns {NextResponse} Une réponse JSON.
 */
export async function PUT(request, { params }) {
  const { id } = await params; // Correction: Ajouter 'await'
  try {
    const updateData = await request.json();
    return await updateCRAController(parseInt(id, 10), updateData);
  } catch (error) {
    console.error("Erreur dans PUT /api/cra/[id] (route):", error);
    return NextResponse.json(
      {
        message: "Requête invalide: le corps doit être un JSON valide.",
        error: error.message,
      },
      { status: 400 }
    );
  }
}

/**
 * Gère les requêtes DELETE pour supprimer un CRA par ID.
 * @param {Request} request L'objet de requête Next.js.
 * @param {Object} context Contient les paramètres dynamiques comme { params: { id } }.
 * @returns {NextResponse} Une réponse JSON.
 */
export async function DELETE(request, { params }) {
  const { id } = await params; // Correction: Ajouter 'await'
  return await deleteCRAController(parseInt(id, 10));
}
