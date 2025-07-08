// app/api/activity_type/controller.js
import * as activityTypeModel from "./model";
import { NextResponse } from "next/server";

export async function getAllActivityTypesController() {
  try {
    const activityTypes = await activityTypeModel.getAllActivityTypes();
    const result = activityTypes.map((type) => ({
      ...type,
      id: type._id?.toString(),
    }));
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Controller: Erreur dans getAllActivityTypesController:",
      error
    );
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
    console.log(
      "Controller: Réception de la requête pour getActivityTypeByIdController avec ID:",
      id
    );
    const activityType = await activityTypeModel.getActivityTypeById(id);
    if (activityType) {
      return NextResponse.json({
        ...activityType,
        id: activityType._id?.toString(),
      });
    } else {
      console.warn("Controller: Type d'activité non trouvé pour l'ID:", id);
      return NextResponse.json(
        { message: "Type d'activité non trouvé." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(
      "Controller: Erreur dans getActivityTypeByIdController pour ID:",
      id,
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
    console.log(
      "Controller: Tentative de création d'un type d'activité avec données:",
      activityTypeData
    );
    const newActivityType = await activityTypeModel.createActivityType(
      activityTypeData
    );
    return NextResponse.json(newActivityType, { status: 201 });
  } catch (error) {
    console.error(
      "Controller: Erreur dans createActivityTypeController:",
      error
    );
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
  console.log(
    "Controller: Réception de la requête pour updateActivityTypeController avec ID:",
    id,
    "et données:",
    updateData
  );
  if (!updateData.name || updateData.name.trim() === "") {
    return NextResponse.json(
      { message: "Le nom du type d'activité est requis pour la mise à jour." },
      { status: 400 }
    );
  }
  try {
    const updated = await activityTypeModel.updateActivityType(id, updateData);
    if (updated) {
      console.log(
        "Controller: Type d'activité mis à jour avec succès. ID:",
        updated._id?.toString()
      );
      return NextResponse.json(
        {
          ...updated,
          id: updated._id?.toString(),
        },
        { status: 200 }
      );
    } else {
      console.warn(
        "Controller: Type d'activité non trouvé pour la mise à jour. ID:",
        id
      );
      return NextResponse.json(
        { message: "Type d'activité non trouvé." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(
      "Controller: Erreur dans updateActivityTypeController pour ID:",
      id,
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
    console.log(
      "Controller: Réception de la requête pour deleteActivityTypeController avec ID:",
      id
    );
    const { deleted } = await activityTypeModel.deleteActivityType(id);
    if (deleted) {
      console.log("Controller: Type d'activité supprimé avec succès. ID:", id);
      return new NextResponse(null, { status: 204 });
    } else {
      console.warn(
        "Controller: Type d'activité non trouvé pour la suppression. ID:",
        id
      );
      return NextResponse.json(
        { message: "Type d'activité non trouvé." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(
      "Controller: Erreur dans deleteActivityTypeController pour ID:",
      id,
      error
    );
    return NextResponse.json(
      { message: "Erreur serveur.", error: error.message },
      { status: 500 }
    );
  }
}
