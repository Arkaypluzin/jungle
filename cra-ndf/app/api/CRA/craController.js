// Importe le module de la base de données qui contient les fonctions de logique métier.
// Assurez-vous que le chemin est correct pour votre fichier de modèles/db.
const db = require("../models/db"); // Remplacez par le chemin réel de votre fichier db.js ou index.js

// --- Fonctions pour les Notes de Frais (conservées de l'exemple initial si nécessaire, sinon à supprimer) ---
// Note: Ces fonctions sont incluses ici pour illustrer la structure combinée.
// Si vous les avez déjà dans un fichier 'noteDeFraisController', vous pouvez les omettre ici.

/**
 * @function createNoteDeFrais
 * @description Crée une note de frais avec détails.
 */
async function createNoteDeFrais(req, res) {
  try {
    const { mois, annee, user_id, details } = req.body;

    if (
      !mois ||
      !annee ||
      !user_id ||
      !Array.isArray(details) ||
      details.length === 0
    ) {
      return res
        .status(400)
        .json({
          error: "Mois, année, user_id et au moins un détail sont requis",
        });
    }

    const noteId = await db.createNoteDeFrais({
      mois,
      annee,
      user_id,
      details,
    });
    res.status(201).json({ message: "Note de frais créée", noteId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Erreur serveur" });
  }
}

/**
 * @function getNoteDeFraisById
 * @description Récupère une note de frais avec détails par ID.
 */
async function getNoteDeFraisById(req, res) {
  try {
    const note = await db.getNoteDeFraisById(req.params.id);
    if (!note)
      return res.status(404).json({ error: "Note de frais non trouvée" });
    res.json(note);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * @function deleteNoteDeFrais
 * @description Supprime une note de frais (si vide).
 */
async function deleteNoteDeFrais(req, res) {
  try {
    await db.deleteNoteDeFrais(req.params.id);
    res.json({ message: "Note de frais supprimée" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * @function getAllNotesDeFrais
 * @description Récupère toutes les notes de frais.
 */
async function getAllNotesDeFrais(req, res) {
  try {
    const notes = await db.getAllNotesDeFrais();
    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * @function getNotesDeFraisByUserId
 * @description Récupère les notes de frais d'un utilisateur spécifique.
 */
async function getNotesDeFraisByUserId(req, res) {
  try {
    const userId = req.params.userId;
    const notes = await db.getNotesDeFraisByUserId(userId);
    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * @function updateDetail
 * @description Modifie un détail de note de frais.
 */
async function updateDetail(req, res) {
  try {
    const detailId = req.params.detailId;
    const { date_des_frais, description, nature, tva, montant } = req.body;

    if (
      !date_des_frais ||
      !description ||
      !nature ||
      tva === undefined ||
      montant === undefined
    ) {
      return res.status(400).json({ error: "Tous les champs sont requis" });
    }

    const result = await db.updateDetail(detailId, {
      date_des_frais,
      description,
      nature,
      tva,
      montant,
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Détail non trouvé" });
    }

    res.json({ message: "Détail mis à jour" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * @function deleteDetail
 * @description Supprime un détail de note de frais.
 */
async function deleteDetail(req, res) {
  try {
    const detailId = req.params.detailId;
    await db.deleteDetail(detailId);
    res.json({ message: "Détail supprimé" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * @function addDetail
 * @description Ajoute un détail à une note de frais existante.
 */
async function addDetail(req, res) {
  try {
    const noteId = req.params.id;
    const { date_des_frais, description, nature, tva, montant } = req.body;

    if (
      !date_des_frais ||
      !description ||
      !nature ||
      tva === undefined ||
      montant === undefined
    ) {
      return res.status(400).json({ error: "Tous les champs sont requis" });
    }

    const detailId = await db.addDetailToNote(noteId, {
      date_des_frais,
      description,
      nature,
      tva,
      montant,
    });

    res.status(201).json({ message: "Détail ajouté", detailId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

// --- Fonctions pour les CRAs (Comptes Rendus d'Activité) ---

/**
 * @function createCRA
 * @description Crée un nouveau Compte Rendu d'Activité (CRA) avec ses détails initiaux.
 */
async function createCRA(req, res) {
  try {
    const { mois, annee, user_id, details } = req.body;

    if (!mois || !annee || !user_id) {
      return res
        .status(400)
        .json({ error: "Mois, année et user_id sont requis pour le CRA." });
    }
    if (details && !Array.isArray(details)) {
      return res
        .status(400)
        .json({ error: "Les détails doivent être un tableau." });
    }

    const craId = await db.createCRA({ mois, annee, user_id, details });
    res.status(201).json({ message: "CRA créé avec succès", craId });
  } catch (error) {
    console.error("Erreur lors de la création du CRA:", error);
    res.status(500).json({ error: error.message || "Erreur serveur interne" });
  }
}

/**
 * @function getCRAById
 * @description Récupère un Compte Rendu d'Activité (CRA) par son ID, y compris tous ses détails associés.
 */
async function getCRAById(req, res) {
  try {
    const cra = await db.getCRAById(req.params.id);
    if (!cra) {
      return res.status(404).json({ error: "CRA non trouvé." });
    }
    res.json(cra);
  } catch (error) {
    console.error("Erreur lors de la récupération du CRA:", error);
    res.status(500).json({ error: error.message || "Erreur serveur interne" });
  }
}

/**
 * @function deleteCRA
 * @description Supprime un Compte Rendu d'Activité (CRA) par son ID.
 */
async function deleteCRA(req, res) {
  try {
    await db.deleteCRA(req.params.id);
    res.json({ message: "CRA supprimé avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression du CRA:", error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * @function getAllCRAs
 * @description Récupère tous les Comptes Rendus d'Activité (CRAs) de la base de données.
 */
async function getAllCRAs(req, res) {
  try {
    const cras = await db.getAllCRAs();
    res.json(cras);
  } catch (error) {
    console.error("Erreur lors de la récupération de tous les CRAs:", error);
    res.status(500).json({ error: error.message || "Erreur serveur interne" });
  }
}

/**
 * @function getCRAsByUserId
 * @description Récupère tous les Comptes Rendus d'Activité (CRAs) associés à un utilisateur spécifique.
 */
async function getCRAsByUserId(req, res) {
  try {
    const userId = req.params.userId;
    const cras = await db.getCRAsByUserId(userId);
    res.json(cras);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des CRAs par utilisateur:",
      error
    );
    res.status(500).json({ error: error.message || "Erreur serveur interne" });
  }
}

/**
 * @function addDetailToCRA
 * @description Ajoute un nouveau détail d'activité à un CRA existant.
 */
async function addDetailToCRA(req, res) {
  try {
    const craId = req.params.id;
    const { date_activite, description, duree_heures, projet_id } = req.body;

    if (!date_activite || !description || duree_heures === undefined) {
      return res
        .status(400)
        .json({
          error: "Date, description et durée sont requis pour le détail.",
        });
    }

    const detailId = await db.addDetailToCRA(craId, {
      date_activite,
      description,
      duree_heures,
      projet_id,
    });
    res
      .status(201)
      .json({ message: "Détail ajouté au CRA avec succès", detailId });
  } catch (error) {
    console.error("Erreur lors de l'ajout du détail au CRA:", error);
    res.status(500).json({ error: error.message || "Erreur serveur interne" });
  }
}

/**
 * @function updateDetailCRA
 * @description Met à jour un détail d'activité spécifique d'un CRA.
 */
async function updateDetailCRA(req, res) {
  try {
    const detailId = req.params.detailId;
    const { date_activite, description, duree_heures, projet_id } = req.body;

    if (
      !date_activite &&
      !description &&
      duree_heures === undefined &&
      projet_id === undefined
    ) {
      return res
        .status(400)
        .json({
          error:
            "Au moins un champ (date_activite, description, duree_heures, projet_id) est requis pour la mise à jour.",
        });
    }

    const result = await db.updateDetailCRA(detailId, {
      date_activite,
      description,
      duree_heures,
      projet_id,
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Détail de CRA non trouvé." });
    }

    res.json({ message: "Détail de CRA mis à jour avec succès." });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du détail du CRA:", error);
    res.status(500).json({ error: error.message || "Erreur serveur interne" });
  }
}

/**
 * @function deleteDetailCRA
 * @description Supprime un détail d'activité spécifique.
 */
async function deleteDetailCRA(req, res) {
  try {
    await db.deleteDetailCRA(req.params.detailId);
    res.json({ message: "Détail de CRA supprimé avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression du détail du CRA:", error);
    res.status(500).json({ error: error.message || "Erreur serveur interne" });
  }
}

// --- Fonctions pour les Clients ---

/**
 * @function createClient
 * @description Crée un nouveau client.
 */
async function createClient(req, res) {
  try {
    const { name, email, user_id } = req.body;

    if (!name || !user_id) {
      return res
        .status(400)
        .json({ error: "Le nom du client et user_id sont requis." });
    }

    const clientId = await db.createClient({ name, email, user_id });
    res.status(201).json({ message: "Client créé avec succès", clientId });
  } catch (error) {
    console.error("Erreur lors de la création du client:", error);
    res.status(500).json({ error: error.message || "Erreur serveur interne" });
  }
}

/**
 * @function getClientById
 * @description Récupère un client par son ID.
 */
async function getClientById(req, res) {
  try {
    const client = await db.getClientById(req.params.id);
    if (!client) {
      return res.status(404).json({ error: "Client non trouvé." });
    }
    res.json(client);
  } catch (error) {
    console.error("Erreur lors de la récupération du client:", error);
    res.status(500).json({ error: error.message || "Erreur serveur interne" });
  }
}

/**
 * @function getClientsByUserId
 * @description Récupère tous les clients associés à un utilisateur spécifique.
 */
async function getClientsByUserId(req, res) {
  try {
    const userId = req.params.userId;
    const clients = await db.getClientsByUserId(userId);
    res.json(clients);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des clients par utilisateur:",
      error
    );
    res.status(500).json({ error: error.message || "Erreur serveur interne" });
  }
}

/**
 * @function updateClient
 * @description Met à jour les informations d'un client existant.
 */
async function updateClient(req, res) {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    if (!name && !email) {
      return res
        .status(400)
        .json({
          error:
            "Au moins un champ (name ou email) est requis pour la mise à jour du client.",
        });
    }

    const result = await db.updateClient(id, { name, email });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Client non trouvé." });
    }

    res.json({ message: "Client mis à jour avec succès." });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du client:", error);
    res.status(500).json({ error: error.message || "Erreur serveur interne" });
  }
}

/**
 * @function deleteClient
 * @description Supprime un client par son ID.
 */
async function deleteClient(req, res) {
  try {
    await db.deleteClient(req.params.id);
    res.json({ message: "Client supprimé avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression du client:", error);
    res.status(500).json({ error: error.message || "Erreur serveur interne" });
  }
}

// Export de toutes les fonctions du contrôleur
module.exports = {
  createNoteDeFrais,
  getNoteDeFraisById,
  deleteNoteDeFrais,
  getAllNotesDeFrais,
  getNotesDeFraisByUserId,
  updateDetail,
  deleteDetail,
  addDetail,
  createCRA,
  getCRAById,
  deleteCRA,
  getAllCRAs,
  getCRAsByUserId,
  addDetailToCRA,
  updateDetailCRA,
  deleteDetailCRA,
  createClient,
  getClientById,
  getClientsByUserId,
  updateClient,
  deleteClient,
};
