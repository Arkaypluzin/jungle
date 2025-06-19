// controllers/craDetailController.js
// Ce contrôleur gère les requêtes HTTP liées aux opérations sur les détails de CRA (notes de frais).

import * as craDetailModel from "../model/cra_detail";
import { NextResponse } from "next/server"; // Nécessaire pour les réponses Next.js

/**
 * Récupère tous les détails de CRA.
 * GET /api/cra-details
 */
export async function getCraDetails(req, res) {
  try {
    const details = await craDetailModel.getAllCraDetails();
    return res.status(200).json(details);
  } catch (error) {
    console.error("Erreur dans getCraDetails:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des détails de CRA",
      error: error.message,
    });
  }
}

/**
 * Récupère un détail dxe CRA par son ID.
 * GET /api/cra-details/:id
 * @param {Object} req - L'objet Request de Next.js
 * @param {Object} res - L'objet de réponse simulé (mockRes)
 * @param {string} id - L'ID du détail
 */
export async function getCraDetailById(req, res, id) {
  try {
    const detail = await craDetailModel.getCraDetailById(parseInt(id, 10));
    if (detail) {
      return res.status(200).json(detail);
    } else {
      return res.status(404).json({ message: "Détail de CRA non trouvé" });
    }
  } catch (error) {
    console.error(`Erreur dans getCraDetailById pour l'ID ${id}:`, error);
    return res.status(500).json({
      message: "Erreur lors de la récupération du détail de CRA",
      error: error.message,
    });
  }
}

/**
 * Récupère tous les détails pour un CRA spécifique.
 * GET /api/cras/:craId/details
 * @param {Object} req - L'objet Request de Next.js
 * @param {Object} res - L'objet de réponse simulé (mockRes)
 * @param {string} craId - L'ID du CRA parent
 */
export async function getDetailsByCraId(req, res, craId) {
  try {
    const details = await craDetailModel.getDetailsByCraId(parseInt(craId, 10));
    return res.status(200).json(details);
  } catch (error) {
    console.error(`Erreur dans getDetailsByCraId pour CRA ID ${craId}:`, error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des détails pour ce CRA",
      error: error.message,
    });
  }
}

/**
 * Crée un nouveau détail de CRA (note de frais).
 * POST /api/cra-details
 * @param {Object} req - L'objet Request de Next.js (contenant req.body)
 * @param {Object} res - L'objet de réponse simulé (mockRes)
 */
export async function createCraDetail(req, res) {
  const detailData = req.body;
  if (
    !detailData.cra_id ||
    !detailData.type_detail ||
    !detailData.date_detail
  ) {
    return res
      .status(400)
      .json({ message: "cra_id, type_detail et date_detail sont requis." });
  }
  // Validation spécifique pour le montant si type_detail est 'Dépense'
  if (
    detailData.type_detail === "Dépense" &&
    detailData.montant === undefined
  ) {
    return res.status(400).json({
      message: 'Le montant est requis pour le type de détail "Dépense".',
    });
  }

  try {
    const newDetail = await craDetailModel.createCraDetail(detailData);
    return res.status(201).json(newDetail);
  } catch (error) {
    console.error("Erreur dans createCraDetail:", error);
    return res.status(500).json({
      message: "Erreur lors de la création du détail de CRA",
      error: error.message,
    });
  }
}

/**
 * Met à jour un détail de CRA (note de frais) existant.
 * PUT /api/cra-details/:id
 * @param {Object} req - L'objet Request de Next.js (contenant req.body)
 * @param {Object} res - L'objet de réponse simulé (mockRes)
 * @param {string} id - L'ID du détail
 */
export async function updateCraDetail(req, res, id) {
  const updateData = req.body;
  if (Object.keys(updateData).length === 0) {
    return res
      .status(400)
      .json({ message: "Aucune donnée fournie pour la mise à jour." });
  }

  try {
    const success = await craDetailModel.updateCraDetail(
      parseInt(id, 10),
      updateData
    );
    if (success) {
      return res
        .status(200)
        .json({ message: "Détail de CRA mis à jour avec succès." });
    } else {
      return res.status(404).json({
        message: "Détail de CRA non trouvé ou aucune modification effectuée.",
      });
    }
  } catch (error) {
    console.error(`Erreur dans updateCraDetail pour l'ID ${id}:`, error);
    return res.status(500).json({
      message: "Erreur lors de la mise à jour du détail de CRA",
      error: error.message,
    });
  }
}

/**
 * Supprime un détail de CRA (note de frais) par son ID.
 * DELETE /api/cra-details/:id
 * @param {Object} req - L'objet Request de Next.js
 * @param {Object} res - L'objet de réponse simulé (mockRes)
 * @param {string} id - L'ID du détail
 */
export async function deleteCraDetail(req, res, id) {
  try {
    const success = await craDetailModel.deleteCraDetail(parseInt(id, 10));
    if (success) {
      return res.status(204).send();
    } else {
      return res.status(404).json({ message: "Détail de CRA non trouvé." });
    }
  } catch (error) {
    console.error(
      `Erreur lors de la suppression du détail de CRA avec l'ID ${id}:`,
      error
    );
    return res.status(500).json({ message: "Server Error" });
  }
}
