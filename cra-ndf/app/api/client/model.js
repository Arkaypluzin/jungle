// app/api/client/model.js

// Importe le module de connexion à la base de données.
// CORRECTION ICI : Utilise l'import nommé { db } car db.js n'a pas d'export default.
import { db } from "../../../lib/db"; // Le chemin est correct si 'lib' est à la racine.

/**
 * Récupère tous les clients de la base de données.
 * @returns {Promise<Array>} Une promesse qui résout en un tableau de clients.
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
 * Crée un nouveau client dans la base de données.
 * @param {Object} clientData Les données du client à créer (nom_client, adresse, contact_email, telephone).
 * @returns {Promise<Object>} Une promesse qui résout en le nouveau client créé (avec son ID).
 */
export async function createClient(clientData) {
  const { nom_client, adresse, contact_email, telephone } = clientData;
  try {
    const [result] = await db.execute(
      "INSERT INTO client (nom_client, adresse, contact_email, telephone) VALUES (?, ?, ?, ?)",
      [nom_client, adresse, contact_email, telephone]
    );
    return { id: result.insertId, ...clientData };
  } catch (error) {
    console.error("Erreur lors de la création du client:", error);
    throw error;
  }
}

/**
 * Récupère un client par son ID.
 * @param {number} id L'ID du client à récupérer.
 * @returns {Promise<Object|null>} Une promesse qui résout en l'objet client ou null si non trouvé.
 */
export async function getClientById(id) {
  try {
    const [rows] = await db.execute(
      "SELECT id, nom_client, adresse, contact_email, telephone FROM client WHERE id = ?",
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération du client par l'ID ${id}:`,
      error
    );
    throw error;
  }
}

/**
 * Met à jour un client existant dans la base de données.
 * @param {number} id L'ID du client à mettre à jour.
 * @param {Object} updateData Les données à mettre à jour (ex: { nom_client: 'Nouveau Nom' }).
 * @returns {Promise<boolean>} Une promesse qui résout en true si la mise à jour est réussie, false sinon.
 */
export async function updateClient(id, updateData) {
  const fields = Object.keys(updateData)
    .map((key) => `${key} = ?`)
    .join(", ");
  const values = Object.values(updateData);

  if (fields.length === 0) {
    return false;
  }

  try {
    const [result] = await db.execute(
      `UPDATE client SET ${fields} WHERE id = ?`,
      [...values, id]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error(
      `Erreur lors de la mise à jour du client par l'ID ${id}:`,
      error
    );
    throw error;
  }
}

/**
 * Supprime un client de la base de données.
 * @param {number} id L'ID du client à supprimer.
 * @returns {Promise<boolean>} Une promesse qui résout en true si la suppression est réussie, false sinon.
 */
export async function deleteClient(id) {
  try {
    const [result] = await db.execute("DELETE FROM client WHERE id = ?", [id]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error(
      `Erreur lors de la suppression du client par l'ID ${id}:`,
      error
    );
    throw error;
  }
}
