// Importe le module mysql2 avec le support des promesses pour des requêtes asynchrones
const mysql = require("mysql2/promise");
// Importe le module uuid pour générer des identifiants uniques
const { v4: uuidv4 } = require("uuid");
// Charge les variables d'environnement à partir du fichier .env
require("dotenv").config();

// Crée un pool de connexions à la base de données en utilisant les variables d'environnement
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

/**
 * Crée un nouveau Compte Rendu d'Activité (CRA) avec ses détails.
 * @param {object} craData - Les données du CRA.
 * @param {number} craData.mois - Le mois du CRA.
 * @param {number} craData.annee - L'année du CRA.
 * @param {string} craData.user_id - L'identifiant de l'utilisateur associé au CRA.
 * @param {Array<object>} [craData.details] - Un tableau d'objets détaillant les activités.
 * @returns {Promise<string>} L'identifiant du CRA créé.
 */
async function createCRA({ mois, annee, user_id, details }) {
  // Obtient une connexion du pool
  const connection = await pool.getConnection();
  try {
    // Démarre une transaction pour assurer l'atomicité des opérations
    await connection.beginTransaction();

    // Génère un ID unique pour le CRA
    const craId = uuidv4();
    // Insère les informations de base du CRA dans la table CRA
    await connection.execute(
      `INSERT INTO CRA (id, mois, annee, user_id) VALUES (?, ?, ?, ?)`,
      [craId, mois, annee, user_id]
    );

    // Insère les détails des activités uniquement s'ils sont fournis et non vides
    if (Array.isArray(details) && details.length > 0) {
      for (const detail of details) {
        // Génère un ID unique pour chaque détail
        const detailId = uuidv4();
        const { date_activite, description, duree_heures, projet_id } = detail;
        // Insère le détail de l'activité dans la table CRA_Details
        await connection.execute(
          `INSERT INTO CRA_Details (id, date_activite, description, duree_heures, projet_id, cra_id)
                     VALUES (?, ?, ?, ?, ?, ?)`,
          [detailId, date_activite, description, duree_heures, projet_id, craId]
        );
      }
    }

    // Valide la transaction si toutes les opérations ont réussi
    await connection.commit();
    return craId;
  } catch (error) {
    // Annule la transaction en cas d'erreur
    await connection.rollback();
    // Relance l'erreur pour qu'elle soit gérée par l'appelant
    throw error;
  } finally {
    // Libère la connexion pour la remettre dans le pool, que l'opération ait réussi ou échoué
    connection.release();
  }
}

/**
 * Récupère un CRA par son identifiant, incluant les informations de l'utilisateur et tous ses détails.
 * @param {string} id - L'identifiant du CRA à récupérer.
 * @returns {Promise<object|null>} L'objet CRA avec ses détails, ou null si non trouvé.
 */
async function getCRAById(id) {
  // Récupère les informations principales du CRA et de l'utilisateur associé
  const [craRows] = await pool.execute(
    `SELECT c.id, c.mois, c.annee, c.user_id, u.nom AS user_nom, u.prenom AS user_prenom
         FROM CRA c
         JOIN User u ON c.user_id = u.id
         WHERE c.id = ?`,
    [id]
  );
  // Si aucun CRA n'est trouvé, retourne null
  if (craRows.length === 0) return null;

  // Récupère tous les détails associés à ce CRA
  const [detailsRows] = await pool.execute(
    `SELECT cd.id, cd.date_activite, cd.description, cd.duree_heures, cd.projet_id, p.nom AS projet_nom
         FROM CRA_Details cd
         LEFT JOIN Projet p ON cd.projet_id = p.id
         WHERE cd.cra_id = ?`,
    [id]
  );

  // Combine les informations du CRA et ses détails en un seul objet
  return { ...craRows[0], details: detailsRows };
}

/**
 * Supprime un CRA par son identifiant. La suppression est interdite si le CRA contient des détails.
 * @param {string} id - L'identifiant du CRA à supprimer.
 * @returns {Promise<void>}
 * @throws {Error} Si le CRA contient des détails.
 */
async function deleteCRA(id) {
  // Vérifie si le CRA contient des détails
  const [details] = await pool.execute(
    `SELECT COUNT(*) AS count FROM CRA_Details WHERE cra_id = ?`,
    [id]
  );
  // Si des détails existent, lance une erreur
  if (details[0].count > 0) {
    throw new Error(
      "Impossible de supprimer un CRA contenant des détails. Supprimez d'abord les détails."
    );
  }

  // Sinon, supprime le CRA de la base de données
  await pool.execute(`DELETE FROM CRA WHERE id = ?`, [id]);
}

/**
 * Ajoute un détail d'activité à un CRA existant.
 * @param {string} cra_id - L'identifiant du CRA auquel ajouter le détail.
 * @param {object} detail - L'objet détail de l'activité.
 * @param {string} detail.date_activite - La date de l'activité.
 * @param {string} detail.description - La description de l'activité.
 * @param {number} detail.duree_heures - La durée de l'activité en heures.
 * @param {string} [detail.projet_id] - L'identifiant du projet associé (peut être null).
 * @returns {Promise<string>} L'identifiant du détail d'activité créé.
 */
async function addDetailToCRA(cra_id, detail) {
  // Génère un ID unique pour le nouveau détail
  const detailId = uuidv4();
  const { date_activite, description, duree_heures, projet_id } = detail;

  // Insère le nouveau détail dans la table CRA_Details
  await pool.execute(
    `INSERT INTO CRA_Details (id, date_activite, description, duree_heures, projet_id, cra_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
    [detailId, date_activite, description, duree_heures, projet_id, cra_id]
  );
  return detailId;
}

/**
 * Supprime un détail d'activité spécifique.
 * @param {string} id - L'identifiant du détail d'activité à supprimer.
 * @returns {Promise<void>}
 */
async function deleteDetailCRA(id) {
  // Supprime le détail de l'activité de la table CRA_Details
  await pool.execute(`DELETE FROM CRA_Details WHERE id = ?`, [id]);
}

/**
 * Récupère tous les CRA de la base de données, avec les informations de l'utilisateur associé.
 * Ne récupère pas les détails de chaque CRA.
 * @returns {Promise<Array<object>>} Un tableau de tous les CRA.
 */
async function getAllCRAs() {
  // Récupère tous les CRA et les informations de l'utilisateur associé
  const [rows] = await pool.execute(
    `SELECT
            c.id, c.mois, c.annee, c.user_id,
            u.nom AS user_nom, u.prenom AS user_prenom
         FROM CRA c
         JOIN User u ON c.user_id = u.id`
  );
  return rows;
}

/**
 * Récupère tous les CRA associés à un utilisateur spécifique.
 * @param {string} userId - L'identifiant de l'utilisateur.
 * @returns {Promise<Array<object>>} Un tableau des CRA de l'utilisateur.
 */
async function getCRAsByUserId(userId) {
  // Récupère les CRA et les informations de l'utilisateur pour un ID utilisateur donné
  const [rows] = await pool.query(
    `SELECT c.id, c.mois, c.annee, u.prenom AS user_prenom, u.nom AS user_nom
         FROM CRA c
         JOIN User u ON c.user_id = u.id
         WHERE c.user_id = ?`,
    [userId]
  );
  return rows;
}

/**
 * Met à jour un détail d'activité existant.
 * @param {string} id - L'identifiant du détail à mettre à jour.
 * @param {object} updateData - Les nouvelles données du détail.
 * @param {string} updateData.date_activite - La nouvelle date de l'activité.
 * @param {string} updateData.description - La nouvelle description de l'activité.
 * @param {number} updateData.duree_heures - La nouvelle durée de l'activité en heures.
 * @param {string} [updateData.projet_id] - Le nouvel identifiant du projet (peut être null).
 * @returns {Promise<object>} Le résultat de l'opération de mise à jour.
 */
async function updateDetailCRA(
  id,
  { date_activite, description, duree_heures, projet_id }
) {
  // Met à jour les champs d'un détail de CRA spécifique
  const [result] = await pool.execute(
    `UPDATE CRA_Details
         SET date_activite = ?, description = ?, duree_heures = ?, projet_id = ?
         WHERE id = ?`,
    [date_activite, description, duree_heures, projet_id, id]
  );
  return result;
}

// --- Fonctions de gestion des Clients ---

/**
 * Crée un nouveau client.
 * @param {object} clientData - Les données du client.
 * @param {string} clientData.name - Le nom du client.
 * @param {string} [clientData.email] - L'adresse email du client (facultatif).
 * @param {string} clientData.user_id - L'identifiant de l'utilisateur qui gère ce client.
 * @returns {Promise<string>} L'identifiant du client créé.
 */
async function createClient({ name, email, user_id }) {
  const clientId = uuidv4();
  await pool.execute(
    `INSERT INTO Client (id, name, email, user_id) VALUES (?, ?, ?, ?)`,
    [clientId, name, email, user_id]
  );
  return clientId;
}

/**
 * Récupère un client par son identifiant.
 * @param {string} id - L'identifiant du client à récupérer.
 * @returns {Promise<object|null>} L'objet client, ou null si non trouvé.
 */
async function getClientById(id) {
  const [rows] = await pool.execute(
    `SELECT c.id, c.name, c.email, c.user_id, u.nom AS user_nom, u.prenom AS user_prenom
         FROM Client c
         JOIN User u ON c.user_id = u.id
         WHERE c.id = ?`,
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Récupère tous les clients associés à un utilisateur spécifique.
 * @param {string} userId - L'identifiant de l'utilisateur.
 * @returns {Promise<Array<object>>} Un tableau des clients de l'utilisateur.
 */
async function getClientsByUserId(userId) {
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.email, c.user_id
         FROM Client c
         WHERE c.user_id = ?`,
    [userId]
  );
  return rows;
}

/**
 * Met à jour les informations d'un client existant.
 * @param {string} id - L'identifiant du client à mettre à jour.
 * @param {object} updateData - Les nouvelles données du client.
 * @param {string} [updateData.name] - Le nouveau nom du client.
 * @param {string} [updateData.email] - La nouvelle adresse email du client.
 * @returns {Promise<object>} Le résultat de l'opération de mise à jour.
 */
async function updateClient(id, { name, email }) {
  const [result] = await pool.execute(
    `UPDATE Client SET name = ?, email = ? WHERE id = ?`,
    [name, email, id]
  );
  return result;
}

/**
 * Supprime un client par son identifiant.
 * @param {string} id - L'identifiant du client à supprimer.
 * @returns {Promise<void>}
 */
async function deleteClient(id) {
  await pool.execute(`DELETE FROM Client WHERE id = ?`, [id]);
}

// Exporte toutes les fonctions pour qu'elles puissent être utilisées par d'autres modules
module.exports = {
  createCRA,
  getCRAById,
  deleteCRA,
  addDetailToCRA,
  deleteDetailCRA,
  getAllCRAs,
  getCRAsByUserId,
  updateDetailCRA,
  createClient,
  getClientById,
  getClientsByUserId,
  updateClient,
  deleteClient,
};
