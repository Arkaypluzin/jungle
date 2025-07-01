// app/api/cra_activities/model.js
import { db } from "../../../lib/db";

/**
 * Récupère toutes les activités CRA.
 * @returns {Promise<Array>} Une promesse qui résout en un tableau d'objets activité CRA.
 */
export async function getAllCraActivities() {
  try {
    const [rows] = await db.execute(
      "SELECT id, description_activite, temps_passe, date_activite, type_activite, client_name, override_non_working_day FROM cra_activities"
    );
    return rows;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de toutes les activités CRA (modèle):",
      error
    );
    throw error;
  }
}

/**
 * Récupère une activité CRA par son ID.
 * @param {number} id L'ID de l'activité CRA.
 * @returns {Promise<Object|null>} Une promesse qui résout en un objet activité CRA ou null si non trouvé.
 */
export async function getCraActivityById(id) {
  try {
    const [rows] = await db.execute(
      "SELECT id, description_activite, temps_passe, date_activite, type_activite, client_name, override_non_working_day FROM cra_activities WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération de l'activité CRA avec l'ID ${id} (modèle):`,
      error
    );
    throw error;
  }
}

/**
 * Crée une nouvelle activité CRA.
 * @param {Object} craActivityData Les données de l'activité CRA à créer (description_activite, temps_passe, date_activite, type_activite, client_name, override_non_working_day).
 * @returns {Promise<Object>} Une promesse qui résout en l'activité CRA créée.
 */
export async function createCraActivity(craActivityData) {
  const {
    description_activite,
    temps_passe,
    date_activite,
    type_activite,
    client_name,
    override_non_working_day,
  } = craActivityData;
  try {
    const [result] = await db.execute(
      "INSERT INTO cra_activities (description_activite, temps_passe, date_activite, type_activite, client_name, override_non_working_day) VALUES (?, ?, ?, ?, ?, ?)",
      [
        description_activite,
        temps_passe,
        date_activite,
        type_activite,
        client_name,
        override_non_working_day,
      ]
    );
    return { id: result.insertId, ...craActivityData };
  } catch (error) {
    console.error(
      "Erreur lors de la création de l'activité CRA (modèle):",
      error
    );
    throw error;
  }
}

/**
 * Met à jour une activité CRA existante.
 * @param {number} id L'ID de l'activité CRA à mettre à jour.
 * @param {Object} updateData Les données à mettre à jour pour l'activité CRA.
 * @returns {Promise<boolean>} Une promesse qui résout en true si l'activité CRA a été mise à jour, false sinon.
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
  // client_name can be null, so check explicitly for undefined
  if (updateData.client_name !== undefined) {
    fields.push("client_name = ?");
    values.push(updateData.client_name);
  }
  if (updateData.override_non_working_day !== undefined) {
    fields.push("override_non_working_day = ?");
    values.push(updateData.override_non_working_day);
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
      `Erreur lors de la mise à jour de l'activité CRA avec l'ID ${id} (modèle):`,
      error
    );
    throw error;
  }
}

/**
 * Supprime une activité CRA par son ID.
 * @param {number} id L'ID de l'activité CRA à supprimer.
 * @returns {Promise<boolean>} Une promesse qui résout en true si l'activité CRA a été supprimée, false sinon.
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
      `Erreur lors de la suppression de l'activité CRA avec l'ID ${id} (modèle):`,
      error
    );
    throw error;
  }
}
