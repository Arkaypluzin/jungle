// app/api/cra_details/model.js
// Modèle pour interagir avec la table 'cra_details' (notes de frais) dans la base de données.

import { db } from "../../../lib/db"; // Importe l'instance de la connexion à la DB

/**
 * Récupère tous les détails de CRA (notes de frais).
 * @returns {Promise<Array>} Une promesse qui résout en un tableau d'objets détail.
 */
export async function getAllCraDetails() {
  try {
    // Correction: Suppression de 'montant' et 'statut_depense' des colonnes sélectionnées
    const [rows] = await db.execute(
      "SELECT id, cra_id, type_detail, description, date_detail FROM cra_details"
    );
    return rows;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de tous les détails de CRA (modèle):",
      error
    );
    throw error; // Propager l'erreur pour que le contrôleur la gère avec un 500
  }
}

/**
 * Récupère un détail de CRA (note de frais) par son ID.
 * @param {number} id L'ID du détail.
 * @returns {Promise<Object|null>} Une promesse qui résout en un objet détail ou null si non trouvé.
 */
export async function getCraDetailById(id) {
  try {
    // Correction: Suppression de 'montant' et 'statut_depense' des colonnes sélectionnées
    const [rows] = await db.execute(
      "SELECT id, cra_id, type_detail, description, date_detail FROM cra_details WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération du détail de CRA avec l'ID ${id} (modèle):`,
      error
    );
    throw error;
  }
}

/**
 * Récupère tous les détails (notes de frais) pour un CRA donné.
 * @param {number} craId L'ID du CRA parent.
 * @returns {Promise<Array>} Une promesse qui résout en un tableau d'objets détail.
 */
export async function getDetailsByCraId(craId) {
  try {
    // Correction: Suppression de 'montant' et 'statut_depense' des colonnes sélectionnées
    const [rows] = await db.execute(
      "SELECT id, cra_id, type_detail, description, date_detail FROM cra_details WHERE cra_id = ?",
      [craId]
    );
    return rows;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération des détails pour le CRA ID ${craId} (modèle):`,
      error
    );
    throw error;
  }
}

/**
 * Crée un nouveau détail de CRA (note de frais).
 * @param {Object} detailData Les données du détail à créer (cra_id, type_detail, description, date_detail).
 * @returns {Promise<Object>} Une promesse qui résout en le détail créé.
 */
export async function createCraDetail(detailData) {
  // Correction: Suppression de 'montant' et 'statut_depense' de la déstructuration
  const { cra_id, type_detail, description, date_detail } = detailData;
  try {
    // Correction: Suppression de 'montant' et 'statut_depense' de la clause INSERT
    const [result] = await db.execute(
      "INSERT INTO cra_details (cra_id, type_detail, description, date_detail) VALUES (?, ?, ?, ?)",
      [cra_id, type_detail, description, date_detail]
    );
    return { id: result.insertId, ...detailData };
  } catch (error) {
    console.error(
      "Erreur lors de la création du détail de CRA (modèle):",
      error
    );
    throw error;
  }
}

/**
 * Met à jour un détail de CRA (note de frais) existant.
 * @param {number} id L'ID du détail à mettre à jour.
 * @param {Object} updateData Les données à mettre à jour pour le détail.
 * @returns {Promise<boolean>} Une promesse qui résout en true si le détail a été mis à jour, false sinon.
 */
export async function updateCraDetail(id, updateData) {
  const fields = [];
  const values = [];

  if (updateData.type_detail !== undefined) {
    fields.push("type_detail = ?");
    values.push(updateData.type_detail);
  }
  // Correction: Suppression de la logique de mise à jour pour 'montant'
  // if (updateData.montant !== undefined) {
  //   fields.push("montant = ?");
  //   values.push(updateData.montant);
  // }
  if (updateData.description !== undefined) {
    fields.push("description = ?");
    values.push(updateData.description);
  }
  if (updateData.date_detail !== undefined) {
    fields.push("date_detail = ?");
    values.push(updateData.date_detail);
  }
  // Correction: Suppression de la logique de mise à jour pour 'statut_depense'
  // if (updateData.statut_depense !== undefined) {
  //   fields.push("statut_depense = ?");
  //   values.push(updateData.statut_depense);
  // }

  if (fields.length === 0) {
    return false;
  }

  values.push(id);

  try {
    const [result] = await db.execute(
      `UPDATE cra_details SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error(
      `Erreur lors de la mise à jour du détail de CRA avec l'ID ${id} (modèle):`,
      error
    );
    throw error;
  }
}

/**
 * Supprime un détail de CRA (note de frais) par son ID.
 * @param {number} id L'ID du détail à supprimer.
 * @returns {Promise<boolean>} Une promesse qui résout en true si le détail a été supprimé, false sinon.
 */
export async function deleteCraDetail(id) {
  try {
    const [result] = await db.execute("DELETE FROM cra_details WHERE id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error(
      `Erreur lors de la suppression du détail de CRA avec l'ID ${id} (modèle):`,
      error
    );
    throw error;
  }
}
