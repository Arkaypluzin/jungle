// app/api/activity_type/model.js
// Modèle pour interagir avec la table 'activity_type' dans la base de données.

import { db } from "../../../lib/db"; // Assurez-vous que ce chemin est correct

/**
 * Récupère tous les types d'activité.
 * @returns {Promise<Array>} Une promesse qui résout en un tableau d'objets type d'activité.
 */
export async function getAllActivityTypes() {
  try {
    const [rows] = await db.execute("SELECT id, name FROM activity_type");
    return rows;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de tous les types d'activité (modèle):",
      error
    );
    throw error;
  }
}

/**
 * Récupère un type d'activité par son ID.
 * @param {number} id L'ID du type d'activité.
 * @returns {Promise<Object|null>} Une promesse qui résout en un objet type d'activité ou null si non trouvé.
 */
export async function getActivityTypeById(id) {
  try {
    const [rows] = await db.execute(
      "SELECT id, name FROM activity_type WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération du type d'activité avec l'ID ${id} (modèle):`,
      error
    );
    throw error;
  }
}

/**
 * Crée un nouveau type d'activité.
 * @param {Object} activityTypeData Les données du type d'activité à créer (name).
 * @returns {Promise<Object>} Une promesse qui résout en le type d'activité créé.
 */
export async function createActivityType(activityTypeData) {
  const { name } = activityTypeData;
  try {
    const [result] = await db.execute(
      "INSERT INTO activity_type (name) VALUES (?)",
      [name]
    );
    return { id: result.insertId, ...activityTypeData };
  } catch (error) {
    console.error(
      "Erreur lors de la création du type d'activité (modèle):",
      error
    );
    throw error;
  }
}

/**
 * Met à jour un type d'activité existant.
 * @param {number} id L'ID du type d'activité à mettre à jour.
 * @param {Object} updateData Les données à mettre à jour pour le type d'activité.
 * @returns {Promise<boolean>} Une promesse qui résout en true si le type d'activité a été mis à jour, false sinon.
 */
export async function updateActivityType(id, updateData) {
  const fields = [];
  const values = [];

  if (updateData.name !== undefined) {
    fields.push("name = ?");
    values.push(updateData.name);
  }

  if (fields.length === 0) {
    return false;
  }

  values.push(id);

  try {
    const [result] = await db.execute(
      `UPDATE activity_type SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error(
      `Erreur lors de la mise à jour du type d'activité avec l'ID ${id} (modèle):`,
      error
    );
    throw error;
  }
}

/**
 * Supprime un type d'activité par son ID.
 * @param {number} id L'ID du type d'activité à supprimer.
 * @returns {Promise<boolean>} Une promesse qui résout en true si le type d'activité a été supprimé, false sinon.
 */
export async function deleteActivityType(id) {
  try {
    const [result] = await db.execute(
      "DELETE FROM activity_type WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error(
      `Erreur lors de la suppression du type d'activité avec l'ID ${id} (modèle):`,
      error
    );
    throw error;
  }
}
