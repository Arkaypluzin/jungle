// app/api/client/[id]/route.js

import { NextResponse } from "next/server";
// CORRECTION ICI : Le contrôleur est dans le dossier parent (client/)
import * as clientController from "../controller";

/**
 * Gère les requêtes GET pour récupérer un client par son ID.
 * @param {Request} request L'objet de requête.
 * @param {Object} context L'objet de contexte contenant les paramètres dynamiques.
 * @param {Object} context.params Les paramètres dynamiques de la route (par exemple, { id: '123' }).
 * @returns {NextResponse} Une réponse JSON contenant le client ou une erreur.
 */
export async function GET(request, { params }) {
  const { id } = params; // Accès direct à l'ID
  try {
    return await clientController.getClientById(parseInt(id, 10));
  } catch (error) {
    console.error(
      `Erreur lors de la récupération du client avec l'ID ${id}:`,
      error
    );
    return NextResponse.json(
      {
        message: "Erreur lors de la récupération du client.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Gère les requêtes PUT pour mettre à jour un client par son ID.
 * @param {Request} request L'objet de requête.
 * @param {Object} context L'objet de contexte contenant les paramètres dynamiques.
 * @param {Object} context.params Les paramètres dynamiques de la route.
 * @param {string} context.params.id L'ID du client.
 * @returns {NextResponse} Une réponse JSON ou une erreur.
 */
export async function PUT(request, { params }) {
  const { id } = params; // Accès direct à l'ID
  try {
    const body = await request.json(); // Lire le corps de la requête
    return await clientController.updateClient(parseInt(id, 10), body);
  } catch (error) {
    console.error(
      `Erreur lors de la mise à jour du client avec l'ID ${id}:`,
      error
    );
    return NextResponse.json(
      {
        message: "Erreur lors de la mise à jour du client.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Gère les requêtes DELETE pour supprimer un client par son ID.
 * @param {Request} request L'objet de requête.
 * @param {Object} context L'objet de contexte contenant les paramètres dynamiques.
 * @param {Object} context.params Les paramètres dynamiques de la route.
 * @param {string} context.params.id L'ID du client.
 * @returns {NextResponse} Une réponse JSON ou une erreur.
 */
export async function DELETE(request, { params }) {
  const { id } = params; // Accès direct à l'ID
  try {
    return await clientController.deleteClient(parseInt(id, 10));
  } catch (error) {
    console.error(
      `Erreur lors de la suppression du client avec l'ID ${id}:`,
      error
    );
    return NextResponse.json(
      {
        message: "Erreur lors de la suppression du client.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
