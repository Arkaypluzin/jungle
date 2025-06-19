// app/api/cra_activities/model.js

// Importe le module de connexion à la base de données.
import { db } from "../../../lib/db";

/**
 * Récupère toutes les activités de CRA de la base de données.
 * @returns {Promise<Array>} Une promesse qui résout en un tableau d'activités de CRA.
 */
export async function getAllCraActivities() {
  try {
    // Supposons que 'cra_id' n'existe plus si vous l'avez dropé.
    // Si d'autres colonnes ont été ajoutées ou renommées, ajustez ici.
    const [rows] = await db.execute(
      "SELECT id, description_activite, temps_passe, date_activite, type_activite FROM cra_activities"
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
 * Crée une nouvelle activité de CRA dans la base de données.
 * @param {Object} activityData Les données de l'activité à créer.
 * @returns {Promise<Object>} Une promesse qui résout en la nouvelle activité créée (avec son ID).
 */
export async function createCraActivity(activityData) {
  // Déstructure toutes les données envoyées, même si cra_id n'est pas inséré
  const {
    cra_id, // cra_id est présent dans activityData mais ne sera PAS inséré directement
    description_activite,
    temps_passe,
    date_activite,
    type_activite,
  } = activityData;
  try {
    const [result] = await db.execute(
      // CORRECTION CLÉ ICI : Supprime cra_id de la liste des colonnes
      // et supprime le '?' correspondant de la liste des valeurs.
      // Assurez-vous que les colonnes listées ici correspondent EXACTEMENT à votre table actuelle.
      "INSERT INTO cra_activities (description_activite, temps_passe, date_activite, type_activite) VALUES (?, ?, ?, ?)",
      [description_activite, temps_passe, date_activite, type_activite]
    );
    return {
      id: result.insertId,
      // Supposons que cra_id est toujours pertinent pour l'objet retourné,
      // même s'il n'est pas inséré dans la table cra_activities si la colonne n'existe plus.
      // Vous pourriez vouloir récupérer le cra_id depuis une autre source si c'est le cas.
      cra_id, // Renvoyez-le si c'est utile pour le frontend, même s'il n'est plus en DB
      description_activite,
      temps_passe,
      date_activite,
      type_activite,
    };
  } catch (error) {
    console.error(
      "Erreur lors de la création de l'activité de CRA (modèle):",
      error
    );
    throw error;
  }
}

/**
 * Récupère une activité de CRA par son ID.
 * @param {number} id L'ID de l'activité à récupérer.
 * @returns {Promise<Object|null>} Une promesse qui résout en l'objet activité ou null si non trouvée.
 */
export async function getCraActivityById(id) {
  try {
    // Assurez-vous que la sélection correspond à vos colonnes actuelles
    const [rows] = await db.execute(
      "SELECT id, description_activite, temps_passe, date_activite, type_activite FROM cra_activities WHERE id = ?",
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération de l'activité de CRA par l'ID ${id}:`,
      error
    );
    throw error;
  }
}

/**
 * Met à jour une activité de CRA existante dans la base de données.
 * @param {number} id L'ID de l'activité à mettre à jour.
 * @param {Object} updateData Les données à mettre à jour.
 * @returns {Promise<boolean>} Une promesse qui résout en true si la mise à jour est réussie, false sinon.
 */
export async function updateCraActivity(id, updateData) {
  const fields = Object.keys(updateData)
    .map((key) => `${key} = ?`)
    .join(", ");
  const values = Object.values(updateData);

  if (fields.length === 0) {
    return false;
  }

  try {
    const [result] = await db.execute(
      `UPDATE cra_activities SET ${fields} WHERE id = ?`,
      [...values, id]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error(
      `Erreur lors de la mise à jour de l'activité de CRA par l'ID ${id}:`,
      error
    );
    throw error;
  }
}

/**
 * Supprime une activité de CRA de la base de données.
 * @param {number} id L'ID de l'activité à supprimer.
 * @returns {Promise<boolean>} Une promesse qui résout en true si la suppression est réussie, false sinon.
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
      `Erreur lors de la suppression de l'activité de CRA par l'ID ${id}:`,
      error
    );
    throw error;
  }
}
