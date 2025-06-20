// app/api/cra_details/controller.js
import * as craDetailModel from "./model";
import { NextResponse } from "next/server";

export async function getCraDetailsController() {
  try {
    const details = await craDetailModel.getAllCraDetails();
    return NextResponse.json(details);
  } catch (error) {
    console.error("Erreur dans getCraDetailsController:", error);
    return NextResponse.json(
      { message: "Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function getCraDetailByIdController(id) {
  try {
    const detail = await craDetailModel.getCraDetailById(id);
    if (detail) {
      return NextResponse.json(detail);
    } else {
      return NextResponse.json(
        { message: "Détail de CRA non trouvé." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(
      `Erreur dans getCraDetailByIdController pour l'ID ${id}:`,
      error
    );
    return NextResponse.json(
      { message: "Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function getDetailsByCraIdController(craId) {
  try {
    const details = await craDetailModel.getDetailsByCraId(craId);
    return NextResponse.json(details);
  } catch (error) {
    console.error(
      `Erreur dans getDetailsByCraIdController pour CRA ID ${craId}:`,
      error
    );
    return NextResponse.json(
      { message: "Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function createCraDetailController(detailData) {
  // Correction: Suppression des validations spécifiques à 'montant' et 'statut_depense'
  if (
    !detailData.cra_id ||
    !detailData.type_detail ||
    !detailData.date_detail
  ) {
    return NextResponse.json(
      { message: "cra_id, type_detail et date_detail sont requis." },
      { status: 400 }
    );
  }
  // Suppression de la validation pour montant
  // if (detailData.type_detail === "Dépense" && (detailData.montant === undefined || isNaN(detailData.montant) || parseFloat(detailData.montant) <= 0)) {
  //   return NextResponse.json({ message: 'Le montant est requis et doit être un nombre positif pour le type de détail "Dépense".' }, { status: 400 });
  // }
  try {
    const newDetail = await craDetailModel.createCraDetail(detailData);
    return NextResponse.json(newDetail, { status: 201 });
  } catch (error) {
    console.error("Erreur dans createCraDetailController:", error);
    let errorMessage = "Erreur lors de la création du détail de CRA.";
    if (error.code === "ER_NO_REFERENCED_ROW_2" || error.errno === 1452) {
      errorMessage = "Erreur: Le CRA parent spécifié (cra_id) n'existe pas.";
    }
    return NextResponse.json(
      { message: errorMessage, error: error.message },
      { status: 500 }
    );
  }
}

export async function updateCraDetailController(id, updateData) {
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { message: "Aucune donnée fournie pour la mise à jour." },
      { status: 400 }
    );
  }
  // Correction: Suppression des validations spécifiques à 'montant' et 'statut_depense'
  // if (updateData.montant !== undefined && (isNaN(updateData.montant) || parseFloat(updateData.montant) <= 0)) {
  //     return NextResponse.json({ message: "Le montant doit être un nombre positif." }, { status: 400 });
  // }
  if (
    updateData.date_detail !== undefined &&
    updateData.date_detail.trim() === ""
  ) {
    return NextResponse.json(
      { message: "La date de détail ne peut pas être vide." },
      { status: 400 }
    );
  }
  try {
    const success = await craDetailModel.updateCraDetail(id, updateData);
    if (success) {
      return NextResponse.json(
        { message: "Détail de CRA mis à jour avec succès." },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          message: "Détail de CRA non trouvé ou aucune modification effectuée.",
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(
      `Erreur dans updateCraDetailController pour l'ID ${id}:`,
      error
    );
    let errorMessage = "Erreur lors de la mise à jour du détail de CRA.";
    if (error.code === "ER_NO_REFERENCED_ROW_2" || error.errno === 1452) {
      errorMessage = "Erreur: Le CRA parent spécifié (cra_id) n'existe pas.";
    }
    return NextResponse.json(
      { message: errorMessage, error: error.message },
      { status: 500 }
    );
  }
}

export async function deleteCraDetailController(id) {
  try {
    const success = await craDetailModel.deleteCraDetail(id);
    if (success) {
      return NextResponse.json(
        { message: "Détail de CRA supprimé avec succès." },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: "Détail de CRA non trouvé." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(
      `Erreur dans deleteCraDetailController pour l'ID ${id}:`,
      error
    );
    return NextResponse.json(
      { message: "Server Error", error: error.message },
      { status: 500 }
    );
  }
}
