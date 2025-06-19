// controllers/craController.js
import * as craModel from "../model/cra"; // Importe toutes les fonctions du modèle cra
import { NextResponse } from "next/server";

// @desc    Get all CRAs
// @route   GET /api/cras
// @access  Public
export async function getCRAs(req, res) {
  try {
    const cras = await craModel.getAllCRAs();
    return res.status(200).json(cras);
  } catch (error) {
    console.error("Error fetching CRAs:", error);
    return res.status(500).json({ message: "Server Error" });
  }
}

// @desc    Get single CRA
// @route   GET /api/cras/:id
// @access  Public
export async function getCRAById(req, res, id) {
  try {
    const cra = await craModel.getCRAById(parseInt(id, 10));
    if (!cra) {
      return res.status(404).json({ message: "CRA Not Found" });
    }
    return res.status(200).json(cra);
  } catch (error) {
    console.error(`Error fetching CRA with ID ${id}:`, error);
    return res.status(500).json({ message: "Server Error" });
  }
}

// @desc    Create a CRA
// @route   POST /api/cras
// @access  Public
export async function createCRA(req, res) {
  try {
    const craData = req.body;
    // Validation des champs
    if (!craData.user_id || !craData.client_id || !craData.date_cra) {
      return res
        .status(400)
        .json({ message: "user_id, client_id et date_cra sont requis." });
    }

    const newCRA = await craModel.createCRA(craData);
    return res.status(201).json(newCRA);
  } catch (error) {
    console.error("Error creating CRA:", error);
    return res.status(500).json({ message: "Server Error" });
  }
}

// @desc    Update a CRA
// @route   PUT /api/cras/:id
// @access  Public
export async function updateCRA(req, res, id) {
  try {
    const updateData = req.body;
    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ message: "Aucune donnée fournie pour la mise à jour." });
    }

    const success = await craModel.updateCRA(parseInt(id, 10), updateData);
    if (success) {
      return res.status(200).json({ message: "CRA mis à jour avec succès." });
    } else {
      return res
        .status(404)
        .json({ message: "CRA non trouvé ou aucune modification effectuée." });
    }
  } catch (error) {
    console.error(`Error updating CRA with ID ${id}:`, error);
    return res.status(500).json({ message: "Server Error" });
  }
}

// @desc    Delete a CRA
// @route   DELETE /api/cras/:id
// @access  Public
export async function deleteCRA(req, res, id) {
  try {
    const success = await craModel.deleteCRA(parseInt(id, 10));
    if (success) {
      return res.status(204).send();
    } else {
      return res.status(404).json({ message: "CRA non trouvé." });
    }
  } catch (error) {
    console.error(`Error deleting CRA with ID ${id}:`, error);
    return res.status(500).json({ message: "Server Error" });
  }
}
