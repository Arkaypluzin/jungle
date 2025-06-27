// app/api/cra_activities/[id]/route.js
// Gère les requêtes API pour une activité de CRA spécifique par ID (GET, PUT, DELETE).

import { NextResponse } from "next/server";
// IMPORTANT : Le chemin vers controller.js est ajusté.
// Pour atteindre controller.js depuis [id]/route.js, il faut remonter d'un niveau.
import * as craActivityController from "../controller"; // 'controller.js' est dans le dossier parent (cra_activities/)

/**
 * Gère les requêtes GET pour récupérer une activité de CRA par ID.
 * @param {Request} request La requête HTTP entrante.
 * @param {{params: {id: string}}} {params} L'objet contenant les paramètres de l'URL, y compris l'ID de l'activité.
 * @returns {NextResponse} Une réponse JSON contenant l'activité ou une erreur.
 */
export async function GET(request, { params }) {
  const { id } = params;
  return craActivityController.getCraActivityById(id);
}

/**
 * Gère les requêtes PUT pour mettre à jour une activité de CRA par ID.
 * @param {Request} request La requête HTTP entrante.
 * @param {{params: {id: string}}} {params} L'objet contenant les paramètres de l'URL, y compris l'ID de l'activité.
 * @returns {NextResponse} Une réponse JSON indiquant le succès ou l'échec de la mise à jour.
 */
export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    return craActivityController.updateCraActivity(id, body);
  } catch (error) {
    console.error(
      `Erreur lors du parsing du corps de la requête PUT /api/cra_activities/${id}:`,
      error
    );
    return NextResponse.json(
      { message: "Données de requête invalides", error: error.message },
      { status: 400 }
    );
  }
}

/**
 * Gère les requêtes DELETE pour supprimer une activité de CRA par ID.
 * @param {Request} request La requête HTTP entrante.
 * @param {{params: {id: string}}} {params} L'objet contenant les paramètres de l'URL, y compris l'ID de l'activité.
 * @returns {NextResponse} Une réponse vide (204 No Content) ou une erreur.
 */
export async function DELETE(request, { params }) {
  const { id } = params;
  return craActivityController.deleteCraActivity(id);
}
