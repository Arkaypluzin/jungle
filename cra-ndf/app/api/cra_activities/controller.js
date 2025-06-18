// controllers/craActivityController.js
import * as craActivityModel from "../models/cra_activity"; // Importe toutes les fonctions du modèle cra_activity
import { NextResponse } from "next/server";

// @desc    Get all CRA activities
// @route   GET /api/cra-activities
// @access  Public
export async function getCraActivities(req, res) {
  try {
    const activities = await craActivityModel.getAllCraActivities();
    return res.status(200).json(activities);
  } catch (error) {
    console.error("Error fetching CRA activities:", error);
    return res.status(500).json({ message: "Server Error" });
  }
}

// @desc    Get a single CRA activity by ID
// @route   GET /api/cra-activities/:id
// @access  Public
export async function getCraActivityById(req, res, id) {
  try {
    const activity = await craActivityModel.getCraActivityById(
      parseInt(id, 10)
    );
    if (!activity) {
      return res.status(404).json({ message: "CRA Activity Not Found" });
    }
    return res.status(200).json(activity);
  } catch (error) {
    console.error(`Error fetching CRA Activity with ID ${id}:`, error);
    return res.status(500).json({ message: "Server Error" });
  }
}

// @desc    Get activities for a specific CRA
// @route   GET /api/cras/:craId/activities
// @access  Public
export async function getActivitiesByCraId(req, res, craId) {
  try {
    const activities = await craActivityModel.getActivitiesByCraId(
      parseInt(craId, 10)
    );
    return res.status(200).json(activities);
  } catch (error) {
    console.error(`Error fetching activities for CRA ID ${craId}:`, error);
    return res.status(500).json({ message: "Server Error" });
  }
}

// @desc    Create an activity for a specific CRA
// @route   POST /api/cra-activities
// @access  Public
export async function createCraActivity(req, res) {
  try {
    const activityData = req.body;
    // Validation des champs
    if (
      !activityData.cra_id ||
      !activityData.description_activite ||
      !activityData.temps_passe ||
      !activityData.date_activite
    ) {
      return res
        .status(400)
        .json({
          message:
            "cra_id, description_activite, temps_passe et date_activite sont requis.",
        });
    }

    const newActivity = await craActivityModel.createCraActivity(activityData);
    return res.status(201).json(newActivity);
  } catch (error) {
    console.error("Error creating CRA activity:", error);
    return res.status(500).json({ message: "Server Error" });
  }
}

// @desc    Update a CRA activity
// @route   PUT /api/cra-activities/:id
// @access  Public
export async function updateCraActivity(req, res, id) {
  try {
    const updateData = req.body;
    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ message: "Aucune donnée fournie pour la mise à jour." });
    }

    const success = await craActivityModel.updateCraActivity(
      parseInt(id, 10),
      updateData
    );
    if (success) {
      return res
        .status(200)
        .json({ message: "Activité de CRA mise à jour avec succès." });
    } else {
      return res
        .status(404)
        .json({
          message:
            "Activité de CRA non trouvée ou aucune modification effectuée.",
        });
    }
  } catch (error) {
    console.error(`Error updating CRA Activity with ID ${id}:`, error);
    return res.status(500).json({ message: "Server Error" });
  }
}

// @desc    Delete a CRA activity
// @route   DELETE /api/cra-activities/:id
// @access  Public
export async function deleteCraActivity(req, res, id) {
  try {
    const success = await craActivityModel.deleteCraActivity(parseInt(id, 10));
    if (success) {
      return res.status(204).send();
    } else {
      return res.status(404).json({ message: "Activité de CRA non trouvée." });
    }
  } catch (error) {
    console.error(`Error deleting CRA Activity with ID ${id}:`, error);
    return res.status(500).json({ message: "Server Error" });
  }
}
