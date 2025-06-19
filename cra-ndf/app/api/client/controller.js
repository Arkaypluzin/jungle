// app/api/client/controller.js

// Importe le modèle client pour interagir avec la base de données.
// Le chemin './model' suppose que model.js est dans le même dossier que ce contrôleur.
import * as clientModel from "./model";
// Importe NextResponse de Next.js pour gérer les réponses HTTP.
import { NextResponse } from "next/server";

/**
 * Récupère tous les clients.
 * @returns {NextResponse} Une réponse JSON contenant la liste des clients ou une erreur.
 */
export async function getClients() {
  try {
    const clients = await clientModel.getAllClients();
    return NextResponse.json(clients, { status: 200 });
  } catch (error) {
    console.error("Erreur dans getClients:", error);
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
 * Crée un nouveau client.
 * @param {Object} clientData Les données du nouveau client.
 * @returns {NextResponse} Une réponse JSON confirmant la création ou une erreur.
 */
export async function createClient(clientData) {
  // Validation améliorée pour s'assurer que les champs sont présents et non vides.
  if (
    !clientData ||
    !clientData.nom_client ||
    clientData.nom_client.trim() === "" ||
    !clientData.adresse ||
    clientData.adresse.trim() === "" ||
    !clientData.contact_email ||
    clientData.contact_email.trim() === ""
  ) {
    // Ajout de la validation pour contact_email
    return NextResponse.json(
      {
        message:
          "Les champs 'nom_client', 'adresse' et 'contact_email' sont requis.",
      },
      { status: 400 }
    );
  }
  try {
    const newClient = await clientModel.createClient(clientData);
    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    console.error("Erreur dans createClient:", error);
    if (error.code === "ER_DUP_ENTRY" || error.errno === 1062) {
      // Gérer les doublons (par ex. pour email)
      return NextResponse.json(
        {
          message: "Un client avec ces informations existe déjà.",
          error: error.message,
        },
        { status: 409 }
      );
    }
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
 * Récupère un client par son ID.
 * @param {number} id L'ID du client à récupérer.
 * @returns {NextResponse} Une réponse JSON contenant le client ou une erreur.
 */
export async function getClientById(id) {
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
    console.error(`Erreur dans getClientById pour l'ID ${id}:`, error);
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
 * Met à jour un client existant.
 * @param {number} id L'ID du client à mettre à jour.
 * @param {Object} updateData Les données à mettre à jour pour le client.
 * @returns {NextResponse} Une réponse JSON de confirmation ou une erreur.
 */
export async function updateClient(id, updateData) {
  // Vérification robuste de updateData.
  if (
    !updateData ||
    typeof updateData !== "object" ||
    Object.keys(updateData).length === 0
  ) {
    return NextResponse.json(
      { message: "Aucune donnée valide fournie pour la mise à jour." },
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
    console.error(`Erreur dans updateClient pour l'ID ${id}:`, error);
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
 * Supprime un client par son ID.
 * @param {number} id L'ID du client à supprimer.
 * @returns {NextResponse} Une réponse JSON de confirmation ou une erreur.
 */
export async function deleteClient(id) {
  try {
    const success = await clientModel.deleteClient(id);
    if (success) {
      return NextResponse.json(
        { message: "Client supprimé avec succès." },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: "Client non trouvé." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(`Erreur dans deleteClient pour l'ID ${id}:`, error);
    return NextResponse.json(
      {
        message: "Erreur lors de la suppression du client.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
