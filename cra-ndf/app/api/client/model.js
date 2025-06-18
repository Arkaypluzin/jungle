// models/client.js
// Modèle pour interagir avec la table 'client' dans la base de données.

import { db } from "../lib/db"; // Importe l'instance de la connexion à la DB

/**
 * Récupère tous les clients.
 * @returns {Promise<Array>} Une promesse qui résout en un tableau d'objets client.
 */
export async function getAllClients() {
  try {
    const [rows] = await db.execute(
      "SELECT id, nom_client, adresse, contact_email, telephone FROM client"
    );
    return rows;
  } catch (error) {
    console.error("Erreur lors de la récupération de tous les clients:", error);
    throw error;
  }
}

/**
 * Récupère un client par son ID.
 * @param {number} id L'ID du client.
 * @returns {Promise<Object|null>} Une promesse qui résout en un objet client ou null si non trouvé.
 */
export async function getClientById(id) {
  try {
    const [rows] = await db.execute(
      "SELECT id, nom_client, adresse, contact_email, telephone FROM client WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération du client avec l'ID ${id}:`,
      error
    );
    throw error;
  }
}

/**
 * Crée un nouveau client.
 * @param {Object} clientData Les données du client à créer (nom_client, adresse, contact_email, telephone).
 * @returns {Promise<Object>} Une promesse qui résout en le client créé (avec son ID généré).
 */
export async function createClient(clientData) {
  const { nom_client, adresse, contact_email, telephone } = clientData;
  try {
    const [result] = await db.execute(
      "INSERT INTO client (nom_client, adresse, contact_email, telephone) VALUES (?, ?, ?, ?)",
      [nom_client, adresse, contact_email, telephone]
    );
    // Retourne l'objet client créé avec l'ID généré
    return { id: result.insertId, ...clientData };
  } catch (error) {
    console.error("Erreur lors de la création du client:", error);
    throw error;
  }
}

/**
 * Met à jour un client existant.
 * @param {number} id L'ID du client à mettre à jour.
 * @param {Object} updateData Les données à mettre à jour pour le client.
 * @returns {Promise<boolean>} Une promesse qui résout en true si le client a été mis à jour, false sinon.
 */
export async function updateClient(id, updateData) {
  const fields = [];
  const values = [];

  if (updateData.nom_client !== undefined) {
    fields.push("nom_client = ?");
    values.push(updateData.nom_client);
  }
  if (updateData.adresse !== undefined) {
    fields.push("adresse = ?");
    values.push(updateData.adresse);
  }
  if (updateData.contact_email !== undefined) {
    fields.push("contact_email = ?");
    values.push(updateData.contact_email);
  }
  if (updateData.telephone !== undefined) {
    fields.push("telephone = ?");
    values.push(updateData.telephone);
  }

  if (fields.length === 0) {
    return false;
  }

  values.push(id);

  try {
    const [result] = await db.execute(
      `UPDATE client SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error(
      `Erreur lors de la mise à jour du client avec l'ID ${id}:`,
      error
    );
    throw error;
  }
}

/**
 * Supprime un client par son ID.
 * @param {number} id L'ID du client à supprimer.
 * @returns {Promise<boolean>} Une promesse qui résout en true si le client a été supprimé, false sinon.
 */
export async function deleteClient(id) {
  try {
    const [result] = await db.execute("DELETE FROM client WHERE id = ?", [id]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error(
      `Erreur lors de la suppression du client avec l'ID ${id}:`,
      error
    );
    throw error;
  }
}
