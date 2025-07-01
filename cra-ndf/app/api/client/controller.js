// app/api/client/controller.js
import * as clientModel from "./model"; // Importe les fonctions du modèle local
import { NextResponse } from "next/server";

/**
 * Récupère tous les clients.
 * @returns {NextResponse} Une réponse JSON contenant la liste des clients ou une erreur.
 */
export async function getAllClientsController() {
  try {
    // Correction: Changer clientModel.getAllClient() en clientModel.getAllClients()
    const clients = await clientModel.getAllClients();
    return NextResponse.json(clients, { status: 200 });
  } catch (error) {
    console.error("Erreur dans getAllClientsController:", error);
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
 * Récupère un client par son ID.
 * @param {number} id L'ID du client.
 * @returns {NextResponse} Une réponse JSON contenant le client ou une erreur.
 */
export async function getClientByIdController(id) {
  try {
    const client = await clientModel.getClientById(id);
    if (client) {
      return NextResponse.json(client, { status: 200 });
    } else {
      return NextResponse.json(
        { message: "Client non trouvé." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(
      `Erreur dans getClientByIdController pour l'ID ${id}:`,
      error
    );
    return NextResponse.json(
      { message: "Erreur serveur.", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Crée un nouveau client.
 * @param {Object} clientData Les données du client à créer.
 * @returns {NextResponse} Une réponse JSON confirmant la création ou une erreur.
 */
export async function createClientController(clientData) {
  if (!clientData.nom_client || !clientData.adresse) {
    return NextResponse.json(
      { message: "Nom et adresse du client sont requis." },
      { status: 400 }
    );
  }
  try {
    const newClient = await clientModel.createClient(clientData);
    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    console.error("Erreur dans createClientController:", error);
    return NextResponse.json(
      {
        message: "Erreur lors de la création du client.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Met à jour un client existant.
 * @param {number} id L'ID du client à mettre à jour.
 * @param {Object} updateData Les données à mettre à jour pour le client.
 * @returns {NextResponse} Une réponse JSON de confirmation ou une erreur.
 */
export async function updateClientController(id, updateData) {
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { message: "Aucune donnée fournie pour la mise à jour." },
      { status: 400 }
    );
  }
  try {
    const success = await clientModel.updateClient(id, updateData);
    if (success) {
      return NextResponse.json(
        { message: "Client mis à jour avec succès." },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: "Client non trouvé ou aucune modification effectuée." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(`Erreur dans updateClientController pour l'ID ${id}:`, error);
    return NextResponse.json(
      { message: "Erreur serveur.", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Supprime un client par son ID.
 * @param {number} id L'ID du client à supprimer.
 * @returns {NextResponse} Une réponse JSON de confirmation ou une erreur.
 */
export async function deleteClientController(id) {
  try {
    const success = await clientModel.deleteClient(id);
    if (success) {
      return new NextResponse(null, { status: 204 }); // 204 No Content
    } else {
      return NextResponse.json(
        { message: "Client non trouvé." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(`Erreur dans deleteClientController pour l'ID ${id}:`, error);
    return NextResponse.json(
      { message: "Erreur serveur.", error: error.message },
      { status: 500 }
    );
  }
}
