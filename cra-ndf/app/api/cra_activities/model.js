// models/cra_activity.js
// Modèle pour interagir avec la table 'cra_activities' dans la base de données.

import { db } from "../lib/db"; // Importe l'instance de la connexion à la DB

/**
 * Récupère toutes les activités de CRA.
 * @returns {Promise<Array>} Une promesse qui résout en un tableau d'objets activité.
 */
export async function getAllCraActivities() {
  try {
    const [rows] = await db.execute(
      "SELECT id, cra_id, description_activite, temps_passe, date_activite, type_activite FROM cra_activities"
    );
    return rows;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de toutes les activités de CRA:",
      error
    );
    throw error;
  }
}

/**
 * Récupère une activité de CRA par son ID.
 * @param {number} id L'ID de l'activité de CRA.
 * @returns {Promise<Object|null>} Une promesse qui résout en un objet activité ou null si non trouvé.
 */
export async function getCraActivityById(id) {
  try {
    const [rows] = await db.execute(
      "SELECT id, cra_id, description_activite, temps_passe, date_activite, type_activite FROM cra_activities WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération de l'activité de CRA avec l'ID ${id}:`,
      error
    );
    throw error;
  }
}

/**
 * Récupère toutes les activités pour un CRA donné.
 * @param {number} craId L'ID du CRA parent.
 * @returns {Promise<Array>} Une promesse qui résout en un tableau d'objets activité.
 */
export async function getActivitiesByCraId(craId) {
  try {
    const [rows] = await db.execute(
      "SELECT id, cra_id, description_activite, temps_passe, date_activite, type_activite FROM cra_activities WHERE cra_id = ?",
      [craId]
    );
    return rows;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération des activités pour le CRA ID ${craId}:`,
      error
    );
    throw error;
  }
}

/**
 * Crée une nouvelle activité de CRA.
 * @param {Object} activityData Les données de l'activité à créer (cra_id, description_activite, temps_passe, date_activite, type_activite).
 * @returns {Promise<Object>} Une promesse qui résout en l'activité créée.
 */
export async function createCraActivity(activityData) {
  const {
    cra_id,
    description_activite,
    temps_passe,
    date_activite,
    type_activite,
  } = activityData;
  try {
    const [result] = await db.execute(
      "INSERT INTO cra_activities (cra_id, description_activite, temps_passe, date_activite, type_activite) VALUES (?, ?, ?, ?, ?)",
      [cra_id, description_activite, temps_passe, date_activite, type_activite]
    );
    return { id: result.insertId, ...activityData };
  } catch (error) {
    console.error("Erreur lors de la création de l'activité de CRA:", error);
    throw error;
  }
}

/**
 * Met à jour une activité de CRA existante.
 * @param {number} id L'ID de l'activité de CRA à mettre à jour.
 * @param {Object} updateData Les données à mettre à jour pour l'activité.
 * @returns {Promise<boolean>} Une promesse qui résout en true si l'activité a été mise à jour, false sinon.
 */
export async function updateCraActivity(id, updateData) {
  const fields = [];
  const values = [];

  if (updateData.description_activite !== undefined) {
    fields.push("description_activite = ?");
    values.push(updateData.description_activite);
  }
  if (updateData.temps_passe !== undefined) {
    fields.push("temps_passe = ?");
    values.push(updateData.temps_passe);
  }
  if (updateData.date_activite !== undefined) {
    fields.push("date_activite = ?");
    values.push(updateData.date_activite);
  }
  if (updateData.type_activite !== undefined) {
    fields.push("type_activite = ?");
    values.push(updateData.type_activite);
  }

  if (fields.length === 0) {
    return false;
  }

  values.push(id);

  try {
    const [result] = await db.execute(
      `UPDATE cra_activities SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error(
      `Erreur lors de la mise à jour de l'activité de CRA avec l'ID ${id}:`,
      error
    );
    throw error;
  }
}

/**
 * Supprime une activité de CRA par son ID.
 * @param {number} id L'ID de l'activité de CRA à supprimer.
 * @returns {Promise<boolean>} Une promesse qui résout en true si l'activité a été supprimée, false sinon.
 */
export async function deleteCraActivity(id) {
  try {
    const [result] = await db.execute(
      "DELETE FROM cra_activities WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error(
      `Erreur lors de la suppression de l'activité de CRA avec l'ID ${id}:`,
      error
    );
    throw error;
  }
}
