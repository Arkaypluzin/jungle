// app/api/cra/controller.js
import * as craModel from "./model";
import { NextResponse } from "next/server";

export async function getAllCRAsController() {
  try {
    const cras = await craModel.getAllCRAs();
    return NextResponse.json(cras);
  } catch (error) {
    console.error("Erreur dans getAllCRAsController:", error);
    return NextResponse.json(
      {
        message: "Erreur lors de la récupération des CRAs.",
        error: error.message,
      },
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
    console.error(`Erreur dans getCRAByIdController pour l'ID ${id}:`, error);
    return NextResponse.json(
      { message: "Erreur serveur.", error: error.message },
      { status: 500 }
    );
  }
}

export async function createCRAController(craData) {
  if (!craData.user_id || !craData.client_id || !craData.date_cra) {
    return NextResponse.json(
      {
        message:
          "user_id, client_id et date_cra sont requis pour créer un CRA.",
      },
      { status: 400 }
    );
  }
  try {
    const newCRA = await craModel.createCRA(craData);
    return NextResponse.json(newCRA, { status: 201 });
  } catch (error) {
    console.error("Erreur dans createCRAController:", error);
    let errorMessage = "Erreur lors de la création du CRA.";
    // Vérification des codes d'erreur MySQL pour les clés étrangères
    if (error.code === "ER_NO_REFERENCED_ROW_2" || error.errno === 1452) {
      errorMessage =
        "Clé étrangère invalide: user_id ou client_id n'existe pas.";
    } else if (error.message && error.message.includes("undefined")) {
      errorMessage = "Valeur manquante (undefined) pour un paramètre requis.";
    }
    return NextResponse.json(
      { message: errorMessage, error: error.message },
      { status: 400 }
    ); // Retourne 400 pour les erreurs client-side (données invalides)
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
    const success = await craModel.updateCRA(id, updateData);
    if (success) {
      return NextResponse.json(
        { message: "CRA mis à jour avec succès." },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: "CRA non trouvé ou aucune modification effectuée." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(`Erreur dans updateCRAController pour l'ID ${id}:`, error);
    let errorMessage = "Erreur lors de la mise à jour du CRA.";
    if (error.code === "ER_NO_REFERENCED_ROW_2" || error.errno === 1452) {
      errorMessage =
        "Clé étrangère invalide: user_id ou client_id n'existe pas.";
    }
    return NextResponse.json(
      { message: errorMessage, error: error.message },
      { status: 400 }
    ); // Retourne 400
  }
}

export async function deleteCRAController(id) {
  try {
    const success = await craModel.deleteCRA(id);
    if (success) {
      return new NextResponse(null, { status: 204 }); // 204 No Content
    } else {
      return NextResponse.json({ message: "CRA non trouvé." }, { status: 404 });
    }
  } catch (error) {
    console.error(`Erreur dans deleteCRAController pour l'ID ${id}:`, error);
    return NextResponse.json(
      { message: "Erreur serveur.", error: error.message },
      { status: 500 }
    );
  }
}
