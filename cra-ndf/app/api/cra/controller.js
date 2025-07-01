import * as craModel from "./model";
import { NextResponse } from "next/server";

export async function getAllCRAsController() {
  try {
    const cras = await craModel.getAllCRAs();
    return NextResponse.json(cras);
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur lors de la récupération des CRAs.", error: error.message },
      { status: 500 }
    );
  }
}

export async function getCRAByIdController(id) {
  try {
    const cra = await craModel.getCRAById(id);
    if (cra) {
      return NextResponse.json(cra);
    } else {
      return NextResponse.json({ message: "CRA non trouvé." }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur serveur.", error: error.message },
      { status: 500 }
    );
  }
}

export async function createCRAController(craData) {
  if (!craData.user_id || !craData.client_id || !craData.date_cra) {
    return NextResponse.json(
      { message: "user_id, client_id et date_cra sont requis pour créer un CRA." },
      { status: 400 }
    );
  }
  try {
    const newCRA = await craModel.createCRA(craData);
    return NextResponse.json(newCRA, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur lors de la création du CRA.", error: error.message },
      { status: 400 }
    );
  }
}

export async function updateCRAController(id, updateData) {
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { message: "Aucune donnée fournie pour la mise à jour." },
      { status: 400 }
    );
  }
  try {
    const updated = await craModel.updateCRA(id, updateData);
    if (updated) {
      return NextResponse.json({ message: "CRA mis à jour avec succès." }, { status: 200 });
    } else {
      return NextResponse.json({ message: "CRA non trouvé ou aucune modification effectuée." }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour du CRA.", error: error.message },
      { status: 400 }
    );
  }
}

export async function deleteCRAController(id) {
  try {
    const { deleted } = await craModel.deleteCRA(id);
    if (deleted) {
      return new NextResponse(null, { status: 204 });
    } else {
      return NextResponse.json({ message: "CRA non trouvé." }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur serveur.", error: error.message },
      { status: 500 }
    );
  }
}