// controllers/clientController.js
// Ce contrôleur gère les requêtes HTTP liées aux opérations sur les clients.

// Correction: Importe toutes les fonctions du modèle client (fichier models/client.js)
import * as clientModel from "../models/client";
import { NextResponse } from "next/server"; // Nécessaire pour les réponses Next.js

/**
 * Récupère tous les clients.
 * GET /api/clients
 */
export async function getClients(req, res) {
  try {
    const clients = await clientModel.getAllClients();
    return res.status(200).json(clients);
  } catch (error) {
    console.error("Erreur dans getClients:", error);
    return res
      .status(500)
      .json({
        message: "Erreur lors de la récupération des clients",
        error: error.message,
      });
  }
}

/**
 * Récupère un client par son ID.
 * GET /api/clients/:id
 * @param {Object} req - L'objet Request de Next.js
 * @param {Object} res - L'objet de réponse simulé (mockRes)
 * @param {string} id - L'ID du client
 */
export async function getClientById(req, res, id) {
  try {
    const client = await clientModel.getClientById(parseInt(id, 10)); // Convertir l'ID en nombre
    if (client) {
      return res.status(200).json(client);
    } else {
      return res.status(404).json({ message: "Client non trouvé" });
    }
  } catch (error) {
    console.error(`Erreur dans getClientById pour l'ID ${id}:`, error);
    return res
      .status(500)
      .json({
        message: "Erreur lors de la récupération du client",
        error: error.message,
      });
  }
}

/**
 * Crée un nouveau client.
 * POST /api/clients
 * @param {Object} req - L'objet Request de Next.js (contenant req.body)
 * @param {Object} res - L'objet de réponse simulé (mockRes)
 */
export async function createClient(req, res) {
  const clientData = req.body;
  if (!clientData.nom_client) {
    return res.status(400).json({ message: "Le nom du client est requis." });
  }

  try {
    const newClient = await clientModel.createClient(clientData);
    return res.status(201).json(newClient);
  } catch (error) {
    console.error("Erreur dans createClient:", error);
    if (error.code === "ER_DUP_ENTRY") {
      // Pour le cas où contact_email est UNIQUE
      return res
        .status(409)
        .json({
          message: "Un client avec cet email de contact existe déjà.",
          error: error.message,
        });
    }
    return res
      .status(500)
      .json({
        message: "Erreur lors de la création du client",
        error: error.message,
      });
  }
}

/**
 * Met à jour un client existant.
 * PUT /api/clients/:id
 * @param {Object} req - L'objet Request de Next.js (contenant req.body)
 * @param {Object} res - L'objet de réponse simulé (mockRes)
 * @param {string} id - L'ID du client
 */
export async function updateClient(req, res, id) {
  const updateData = req.body;

  if (Object.keys(updateData).length === 0) {
    return res
      .status(400)
      .json({ message: "Aucune donnée fournie pour la mise à jour." });
  }

  try {
    const success = await clientModel.updateClient(
      parseInt(id, 10),
      updateData
    );
    if (success) {
      return res
        .status(200)
        .json({ message: "Client mis à jour avec succès." });
    } else {
      return res
        .status(404)
        .json({
          message: "Client non trouvé ou aucune modification effectuée.",
        });
    }
  } catch (error) {
    console.error(`Erreur dans updateClient pour l'ID ${id}:`, error);
    return res
      .status(500)
      .json({
        message: "Erreur lors de la mise à jour du client",
        error: error.message,
      });
  }
}

/**
 * Supprime un client par son ID.
 * DELETE /api/clients/:id
 * @param {Object} req - L'objet Request de Next.js
 * @param {Object} res - L'objet de réponse simulé (mockRes)
 * @param {string} id - L'ID du client
 */
export async function deleteClient(req, res, id) {
  try {
    const success = await clientModel.deleteClient(parseInt(id, 10));
    if (success) {
      return res.status(204).send();
    } else {
      return res.status(404).json({ message: "Client non trouvé." });
    }
  } catch (error) {
    console.error(`Erreur dans deleteClient pour l'ID ${id}:`, error);
    return res
      .status(500)
      .json({
        message: "Erreur lors de la suppression du client",
        error: error.message,
      });
  }
}
