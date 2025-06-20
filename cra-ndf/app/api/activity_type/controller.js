// app/api/activity_type/controller.js
import * as activityTypeModel from "./model";
import { NextResponse } from "next/server";

export async function getAllActivityTypesController() {
  try {
    const activityTypes = await activityTypeModel.getAllActivityTypes();
    return NextResponse.json(activityTypes);
  } catch (error) {
    console.error("Erreur dans getAllActivityTypesController:", error);
    return NextResponse.json(
      {
        message: "Erreur lors de la récupération des types d'activité.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function getActivityTypeByIdController(id) {
  try {
    const activityType = await activityTypeModel.getActivityTypeById(id);
    if (activityType) {
      return NextResponse.json(activityType);
    } else {
      return NextResponse.json(
        { message: "Type d'activité non trouvé." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(
      `Erreur dans getActivityTypeByIdController pour l'ID ${id}:`,
      error
    );
    return NextResponse.json(
      { message: "Erreur serveur.", error: error.message },
      { status: 500 }
    );
  }
}

export async function createActivityTypeController(activityTypeData) {
  if (!activityTypeData.name || activityTypeData.name.trim() === "") {
    return NextResponse.json(
      { message: "Le nom du type d'activité est requis." },
      { status: 400 }
    );
  }
  try {
    const newActivityType = await activityTypeModel.createActivityType(
      activityTypeData
    );
    return NextResponse.json(newActivityType, { status: 201 });
  } catch (error) {
    console.error("Erreur dans createActivityTypeController:", error);
    // Gérer spécifiquement l'erreur de doublon si applicable (par exemple, UNIQUE constraint)
    return NextResponse.json(
      {
        message: "Erreur lors de la création du type d'activité.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function updateActivityTypeController(id, updateData) {
  if (
    Object.keys(updateData).length === 0 ||
    !updateData.name ||
    updateData.name.trim() === ""
  ) {
    return NextResponse.json(
      { message: "Le nom du type d'activité est requis pour la mise à jour." },
      { status: 400 }
    );
  }
  try {
    const success = await activityTypeModel.updateActivityType(id, updateData);
    if (success) {
      return NextResponse.json(
        { message: "Type d'activité mis à jour avec succès." },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          message:
            "Type d'activité non trouvé ou aucune modification effectuée.",
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(
      `Erreur dans updateActivityTypeController pour l'ID ${id}:`,
      error
    );
    return NextResponse.json(
      { message: "Erreur serveur.", error: error.message },
      { status: 500 }
    );
  }
}

export async function deleteActivityTypeController(id) {
  try {
    const success = await activityTypeModel.deleteActivityType(id);
    if (success) {
      return new NextResponse(null, { status: 204 }); // 204 No Content
    } else {
      return NextResponse.json(
        { message: "Type d'activité non trouvé." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(
      `Erreur dans deleteActivityTypeController pour l'ID ${id}:`,
      error
    );
    return NextResponse.json(
      { message: "Erreur serveur.", error: error.message },
      { status: 500 }
    );
  }
}
