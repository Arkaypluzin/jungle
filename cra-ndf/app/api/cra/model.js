// app/api/cra/model.js
// Modèle pour interagir avec la table 'CRA' dans la base de données.

import { db } from "../../../lib/db"; // Assurez-vous que ce chemin est correct

/**
 * Récupère tous les CRAs.
 * @returns {Promise<Array>} Une promesse qui résout en un tableau d'objets CRA.
 */
export async function getAllCRAs() {
  try {
    const [rows] = await db.execute(
      "SELECT id, user_id, client_id, date_cra, statut, commentaires FROM CRA"
    );
    return rows;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de tous les CRAs (modèle):",
      error
    );
    throw error;
  }
}

/**
 * Récupère un CRA par son ID.
 * @param {number} id L'ID du CRA.
 * @returns {Promise<Object|null>} Une promesse qui résout en un objet CRA ou null si non trouvé.
 */
export async function getCRAById(id) {
  try {
    const [rows] = await db.execute(
      "SELECT id, user_id, client_id, date_cra, statut, commentaires FROM CRA WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération du CRA avec l'ID ${id} (modèle):`,
      error
    );
    throw error;
  }
}

/**
 * Crée un nouveau CRA.
 * @param {Object} craData Les données du CRA à créer.
 * @returns {Promise<Object>} Une promesse qui résout en le CRA créé (avec son ID généré).
 */
export async function createCRA(craData) {
  const { user_id, client_id, date_cra, statut, commentaires } = craData;
  try {
    // Vérification explicite des valeurs pour éviter 'undefined'
    if (
      user_id === undefined ||
      client_id === undefined ||
      date_cra === undefined
    ) {
      throw new Error(
        "user_id, client_id et date_cra ne peuvent pas être undefined."
      );
    }

    const [result] = await db.execute(
      "INSERT INTO CRA (user_id, client_id, date_cra, statut, commentaires) VALUES (?, ?, ?, ?, ?)",
      [
        user_id,
        client_id,
        date_cra,
        statut || "Brouillon",
        commentaires || null,
      ] // Commentaires peut être null
    );
    return { id: result.insertId, ...craData };
  } catch (error) {
    console.error("Erreur lors de la création du CRA (modèle):", error);
    throw error;
  }
}

/**
 * Met à jour un CRA existant.
 * @param {number} id L'ID du CRA à mettre à jour.
 * @param {Object} updateData Les données à mettre à jour pour le CRA.
 * @returns {Promise<boolean>} Une promesse qui résout en true si le CRA a été mis à jour, false sinon.
 */
export async function updateCRA(id, updateData) {
  const fields = [];
  const values = [];

  if (updateData.user_id !== undefined) {
    fields.push("user_id = ?");
    values.push(updateData.user_id);
  }
  if (updateData.client_id !== undefined) {
    fields.push("client_id = ?");
    values.push(updateData.client_id);
  }
  if (updateData.date_cra !== undefined) {
    fields.push("date_cra = ?");
    values.push(updateData.date_cra);
  }
  if (updateData.statut !== undefined) {
    fields.push("statut = ?");
    values.push(updateData.statut);
  }
  if (updateData.commentaires !== undefined) {
    fields.push("commentaires = ?");
    values.push(updateData.commentaires);
  }

  if (fields.length === 0) {
    return false;
  }

  values.push(id);

  try {
    const [result] = await db.execute(
      `UPDATE CRA SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error(
      `Erreur lors de la mise à jour du CRA avec l'ID ${id} (modèle):`,
      error
    );
    throw error;
  }
}

/**
 * Supprime un CRA par son ID.
 * @param {number} id L'ID du CRA à supprimer.
 * @returns {Promise<boolean>} Une promesse qui résout en true si le CRA a été supprimé, false sinon.
 */
export async function deleteCRA(id) {
  try {
    const [result] = await db.execute("DELETE FROM CRA WHERE id = ?", [id]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error(
      `Erreur lors de la suppression du CRA avec l'ID ${id} (modèle):`,
      error
    );
    throw error;
  }
}
