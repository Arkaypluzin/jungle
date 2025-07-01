import * as craDetailModel from "./model";
import { NextResponse } from "next/server";

export async function getCraDetailsController() {
  try {
    const details = await craDetailModel.getAllCraDetails();
    return NextResponse.json(details);
  } catch (error) {
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
    return NextResponse.json(
      { message: "Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function getDetailsByCraIdController(cra_id) {
  try {
    const details = await craDetailModel.getDetailsByCraId(cra_id);
    return NextResponse.json(details);
  } catch (error) {
    return NextResponse.json(
      { message: "Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function createCraDetailController(detailData) {
  if (!detailData.cra_id || !detailData.type_detail || !detailData.date_detail) {
    return NextResponse.json(
      { message: "cra_id, type_detail et date_detail sont requis." },
      { status: 400 }
    );
  }
  try {
    const newDetail = await craDetailModel.createCraDetail(detailData);
    return NextResponse.json(newDetail, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur lors de la création du détail de CRA.", error: error.message },
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
  try {
    const updated = await craDetailModel.updateCraDetail(id, updateData);
    if (updated) {
      return NextResponse.json({ message: "Détail de CRA mis à jour avec succès." }, { status: 200 });
    } else {
      return NextResponse.json(
        { message: "Détail de CRA non trouvé ou aucune modification effectuée." },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour du détail de CRA.", error: error.message },
      { status: 500 }
    );
  }
}

export async function deleteCraDetailController(id) {
  try {
    const { deleted } = await craDetailModel.deleteCraDetail(id);
    if (deleted) {
      return NextResponse.json({ message: "Détail de CRA supprimé avec succès." }, { status: 200 });
    } else {
      return NextResponse.json(
        { message: "Détail de CRA non trouvé." },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Server Error", error: error.message },
      { status: 500 }
    );
  }
}