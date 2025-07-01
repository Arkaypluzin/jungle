import * as craActivityModel from "./model";
import { NextResponse } from "next/server";

export async function getAllCraActivitiesController() {
  try {
    const craActivities = await craActivityModel.getAllCraActivities();
    return NextResponse.json(craActivities);
  } catch (error) {
    console.error("Erreur dans getAllCraActivitiesController:", error);
    return NextResponse.json(
      {
        message: "Erreur lors de la récupération des activités CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function getCraActivityByIdController(id) {
  try {
    const craActivity = await craActivityModel.getCraActivityById(id);
    if (craActivity) {
      return NextResponse.json(craActivity);
    } else {
      return NextResponse.json(
        { message: "Activité CRA non trouvée." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(
      `Erreur dans getCraActivityByIdController pour l'ID ${id}:`,
      error
    );
    return NextResponse.json(
      { message: "Erreur serveur.", error: error.message },
      { status: 500 }
    );
  }
}

export async function createCraActivityController(craActivityData) {
  const {
    description_activite,
    temps_passe,
    date_activite,
    type_activite,
    client_name,
    override_non_working_day,
  } = craActivityData;

  if (temps_passe === undefined || !date_activite || !type_activite) {
    return NextResponse.json(
      { message: "Le temps passé, la date et le type d'activité sont requis." },
      { status: 400 }
    );
  }

  if (!type_activite.includes("Absence") && !client_name) {
    return NextResponse.json(
      {
        message:
          "Le nom du client est requis pour ce type d'activité (sauf pour les absences).",
      },
      { status: 400 }
    );
  }

  if (type_activite.includes("Absence") && client_name !== null) {
    return NextResponse.json(
      {
        message:
          "Le client ne doit pas être défini pour les types d'activité 'Absence'.",
      },
      { status: 400 }
    );
  }

  try {
    const newCraActivity = await craActivityModel.createCraActivity({
      description_activite: description_activite || "", // Changed from null to ''
      temps_passe,
      date_activite,
      type_activite,
      client_name: type_activite.includes("Absence") ? null : client_name,
      override_non_working_day: override_non_working_day || false,
    });
    return NextResponse.json(newCraActivity, { status: 201 });
  } catch (error) {
    console.error("Erreur dans createCraActivityController:", error);
    return NextResponse.json(
      {
        message: "Erreur lors de la création de l'activité CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function updateCraActivityController(id, updateData) {
  const {
    description_activite,
    temps_passe,
    date_activite,
    type_activite,
    client_name,
    override_non_working_day,
  } = updateData;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { message: "Aucune donnée fournie pour la mise à jour." },
      { status: 400 }
    );
  }

  if (
    temps_passe === undefined ||
    date_activite === undefined ||
    type_activite === undefined
  ) {
    return NextResponse.json(
      {
        message:
          "Le temps passé, la date et le type d'activité sont requis pour la mise à jour.",
      },
      { status: 400 }
    );
  }

  if (!type_activite.includes("Absence") && !client_name) {
    return NextResponse.json(
      {
        message:
          "Le nom du client est requis pour ce type d'activité (sauf pour les absences).",
      },
      { status: 400 }
    );
  }

  if (type_activite.includes("Absence") && client_name !== null) {
    return NextResponse.json(
      {
        message:
          "Le client ne doit pas être défini pour les types d'activité 'Absence'.",
      },
      { status: 400 }
    );
  }

  try {
    const success = await craActivityModel.updateCraActivity(id, {
      description_activite: description_activite || "", // Changed from null to ''
      temps_passe,
      date_activite,
      type_activite,
      client_name: type_activite.includes("Absence") ? null : client_name,
      override_non_working_day: override_non_working_day,
    });
    if (success) {
      return NextResponse.json(
        { message: "Activité CRA mise à jour avec succès." },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          message: "Activité CRA non trouvée ou aucune modification effectuée.",
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(
      `Erreur dans updateCraActivityController pour l'ID ${id}:`,
      error
    );
    return NextResponse.json(
      {
        message: "Erreur lors de la mise à jour de l'activité CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function deleteCraActivityController(id) {
  try {
    const success = await craActivityModel.deleteCraActivity(id);
    if (success) {
      return new NextResponse(null, { status: 204 });
    } else {
      return NextResponse.json(
        { message: "Activité CRA non trouvée." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(
      `Erreur dans deleteCraActivityController pour l'ID ${id}:`,
      error
    );
    return NextResponse.json(
      { message: "Erreur serveur.", error: error.message },
      { status: 500 }
    );
  }
}
