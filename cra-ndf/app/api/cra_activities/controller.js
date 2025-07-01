import * as craActivityModel from "./model";
import { NextResponse } from "next/server";

export async function getAllCraActivitiesController() {
  try {
    const craActivities = await craActivityModel.getAllCraActivities();
    return NextResponse.json(craActivities);
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur lors de la récupération des activités CRA.", error: error.message },
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
      return NextResponse.json({ message: "Activité CRA non trouvée." }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur serveur.", error: error.message },
      { status: 500 }
    );
  }
}

export async function createCraActivityController(activity) {
  const { temps_passe, date_activite, type_activite, client_name } = activity;
  if (temps_passe === undefined || !date_activite || !type_activite) {
    return NextResponse.json(
      { message: "Le temps passé, la date et le type d'activité sont requis." },
      { status: 400 }
    );
  }
  if (!type_activite.includes("Absence") && !client_name) {
    return NextResponse.json(
      { message: "Le nom du client est requis pour ce type d'activité (sauf pour les absences)." },
      { status: 400 }
    );
  }
  if (type_activite.includes("Absence") && client_name !== null) {
    return NextResponse.json(
      { message: "Le client ne doit pas être défini pour les types d'activité 'Absence'." },
      { status: 400 }
    );
  }
  try {
    const newActivity = await craActivityModel.createCraActivity(activity);
    return NextResponse.json(newActivity, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur lors de la création de l'activité CRA.", error: error.message },
      { status: 500 }
    );
  }
}

export async function updateCraActivityController(id, updateData) {
  const { temps_passe, date_activite, type_activite, client_name } = updateData;
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { message: "Aucune donnée fournie pour la mise à jour." },
      { status: 400 }
    );
  }
  if (temps_passe === undefined || date_activite === undefined || type_activite === undefined) {
    return NextResponse.json(
      { message: "Le temps passé, la date et le type d'activité sont requis pour la mise à jour." },
      { status: 400 }
    );
  }
  if (!type_activite.includes("Absence") && !client_name) {
    return NextResponse.json(
      { message: "Le nom du client est requis pour ce type d'activité (sauf pour les absences)." },
      { status: 400 }
    );
  }
  if (type_activite.includes("Absence") && client_name !== null) {
    return NextResponse.json(
      { message: "Le client ne doit pas être défini pour les types d'activité 'Absence'." },
      { status: 400 }
    );
  }
  try {
    const updated = await craActivityModel.updateCraActivity(id, updateData);
    if (updated) {
      return NextResponse.json({ message: "Activité CRA mise à jour avec succès." }, { status: 200 });
    } else {
      return NextResponse.json(
        { message: "Activité CRA non trouvée ou aucune modification effectuée." },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur lors de la mise à jour de l'activité CRA.", error: error.message },
      { status: 500 }
    );
  }
}

export async function deleteCraActivityController(id) {
  try {
    const { deleted } = await craActivityModel.deleteCraActivity(id);
    if (deleted) {
      return new NextResponse(null, { status: 204 });
    } else {
      return NextResponse.json(
        { message: "Activité CRA non trouvée." },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur serveur.", error: error.message },
      { status: 500 }
    );
  }
}