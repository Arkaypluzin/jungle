// app/api/client/[id]/route.js
// Gère les requêtes API pour un client spécifique par ID (GET, PUT, DELETE).

import { NextResponse } from "next/server";
import {
  getClientById,
  updateClient,
  deleteClient,
} from "../../../../controllers/clientController"; // Assurez-vous que le chemin est correct !

// Gère les requêtes GET pour récupérer un client par son ID
export async function GET(request, { params }) {
  const { id } = params; // Extrait l'ID du client des paramètres de l'URL
  return getClientById(id); // Appelle la fonction du contrôleur et retourne sa réponse
}

// Gère les requêtes PUT pour mettre à jour un client par son ID
export async function PUT(request, { params }) {
  const { id } = params; // Extrait l'ID du client des paramètres de l'URL
  const body = await request.json(); // Récupère le corps JSON de la requête (les données à mettre à jour)
  return updateClient(id, body); // Appelle la fonction du contrôleur avec l'ID et les données, et retourne sa réponse
}

// Gère les requêtes DELETE pour supprimer un client par son ID
export async function DELETE(request, { params }) {
  const { id } = params; // Extrait l'ID du client des paramètres de l'URL
  return deleteClient(id); // Appelle la fonction du contrôleur et retourne sa réponse
}
