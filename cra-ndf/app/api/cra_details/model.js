// models/cra_detail.js
// Modèle pour interagir avec la table 'cra_details' (notes de frais) dans la base de données.

import { db } from "../lib/db"; // Importe l'instance de la connexion à la DB

/**
 * Récupère tous les détails de CRA (notes de frais).
 * @returns {Promise<Array>} Une promesse qui résout en un tableau d'objets détail.
 */
export async function getAllCraDetails() {
  try {
    const [rows] = await db.execute(
      "SELECT id, cra_id, type_detail, montant, description, date_detail, statut_depense FROM cra_details"
    );
    return rows;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de tous les détails de CRA:",
      error
    );
    throw error;
  }
}

/**
 * Récupère un détail de CRA (note de frais) par son ID.
 * @param {number} id L'ID du détail.
 * @returns {Promise<Object|null>} Une promesse qui résout en un objet détail ou null si non trouvé.
 */
export async function getCraDetailById(id) {
  try {
    const [rows] = await db.execute(
      "SELECT id, cra_id, type_detail, montant, description, date_detail, statut_depense FROM cra_details WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération du détail de CRA avec l'ID ${id}:`,
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
    const [rows] = await db.execute(
      "SELECT id, cra_id, type_detail, montant, description, date_detail, statut_depense FROM cra_details WHERE cra_id = ?",
      [craId]
    );
    return rows;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération des détails pour le CRA ID ${craId}:`,
      error
    );
    throw error;
  }
}

/**
 * Crée un nouveau détail de CRA (note de frais).
 * @param {Object} detailData Les données du détail à créer (cra_id, type_detail, montant, description, date_detail, statut_depense).
 * @returns {Promise<Object>} Une promesse qui résout en le détail créé.
 */
export async function createCraDetail(detailData) {
  const {
    cra_id,
    type_detail,
    montant,
    description,
    date_detail,
    statut_depense,
  } = detailData;
  try {
    const [result] = await db.execute(
      "INSERT INTO cra_details (cra_id, type_detail, montant, description, date_detail, statut_depense) VALUES (?, ?, ?, ?, ?, ?)",
      [
        cra_id,
        type_detail,
        montant,
        description,
        date_detail,
        statut_depense || "En attente",
      ]
    );
    return { id: result.insertId, ...detailData };
  } catch (error) {
    console.error("Erreur lors de la création du détail de CRA:", error);
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
  if (updateData.montant !== undefined) {
    fields.push("montant = ?");
    values.push(updateData.montant);
  }
  if (updateData.description !== undefined) {
    fields.push("description = ?");
    values.push(updateData.description);
  }
  if (updateData.date_detail !== undefined) {
    fields.push("date_detail = ?");
    values.push(updateData.date_detail);
  }
  if (updateData.statut_depense !== undefined) {
    fields.push("statut_depense = ?");
    values.push(updateData.statut_depense);
  }

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
      `Erreur lors de la mise à jour du détail de CRA avec l'ID ${id}:`,
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
      `Erreur lors de la suppression du détail de CRA avec l'ID ${id}:`,
      error
    );
    throw error;
  }
}
