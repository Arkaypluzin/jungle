// app/api/cra_activities/controller.js
import * as craActivityModel from "./model";
import * as clientModel from "../client/model";
import * as activityTypeModel from "../activity_type/model";
import { NextResponse } from "next/server";

export async function getAllCraActivitiesController(request) {
  const userId = request.nextUrl.searchParams.get("userId");
  console.log("API CRA: Requête GET pour userId:", userId);

  if (!userId) {
    return NextResponse.json(
      { message: "User ID est requis." },
      { status: 400 }
    );
  }

  try {
    const activities = await craActivityModel.getAllCraActivities();
    const filteredActivities = activities.filter(
      (activity) => String(activity.user_id) === String(userId)
    );

    const result = filteredActivities.map((activity) => ({
      ...activity,
      id: activity._id.toString(),
      client_id: activity.client_id ? activity.client_id.toString() : null,
      type_activite: activity.type_activite
        ? activity.type_activite.toString()
        : null,
      user_id: activity.user_id ? activity.user_id.toString() : null,
    }));
    console.log(
      "API CRA: Activités filtrées et formatées pour le frontend:",
      result.length,
      "documents."
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("API CRA: Erreur dans getAllCraActivitiesController:", error);
    return NextResponse.json(
      {
        message: "Échec de la récupération des activités CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function createCraActivityController(request) {
  try {
    const data = await request.json();

    console.log(
      "API CRA: Données reçues pour la création d'activité:",
      JSON.stringify(data, null, 2)
    );

    if (
      !data.date_activite ||
      !data.temps_passe ||
      !data.type_activite ||
      !data.user_id
    ) {
      console.error(
        "API CRA: Champs d'activité requis manquants (date, temps, type, user_id)."
      );
      return NextResponse.json(
        {
          message:
            "Champs d'activité requis manquants (date, temps, type, user_id).",
        },
        { status: 400 }
      );
    }

    const activityType = await activityTypeModel.getActivityTypeById(
      data.type_activite
    );
    if (!activityType) {
      console.error(
        `API CRA: Type d'activité non trouvé pour l'ID: ${data.type_activite}`
      );
      return NextResponse.json(
        { message: "Type d'activité non trouvé." },
        { status: 400 }
      );
    }
    console.log(
      `API CRA: Type d'activité trouvé: ${activityType.name}, requires_client: ${activityType.requires_client}`
    );
    console.log(
      `API CRA: Valeur de client_id reçue dans data: '${data.client_id}'`
    ); // Log la valeur exacte

    if (activityType.requires_client) {
      console.log("API CRA: Ce type d'activité REQUIERT un client.");
      if (!data.client_id) {
        // Vérifie si client_id est null ou vide
        console.error(
          "API CRA: Un client est requis pour ce type d'activité mais n'a pas été fourni."
        );
        return NextResponse.json(
          { message: "Un client est requis pour ce type d'activité." },
          { status: 400 }
        );
      }
      const client = await clientModel.getClientById(data.client_id);
      if (!client) {
        console.error(
          `API CRA: Client non trouvé pour l'ID fourni: ${data.client_id}`
        );
        return NextResponse.json(
          { message: "Client non trouvé pour l'ID fourni." },
          { status: 400 }
        );
      }
      console.log(`API CRA: Client trouvé pour l'ID: ${data.client_id}`);
    } else {
      console.log(
        "API CRA: Ce type d'activité NE REQUIERT PAS de client. Définition de client_id à null."
      );
      data.client_id = null; // S'assurer que client_id est null si non requis
    }

    const newCraActivity = await craActivityModel.createCraActivity(data);

    return NextResponse.json(
      {
        ...newCraActivity,
        id: newCraActivity._id.toString(),
        client_id: newCraActivity.client_id
          ? newCraActivity.client_id.toString()
          : null,
        type_activite: newCraActivity.type_activite
          ? newCraActivity.type_activite.toString()
          : null,
        user_id: newCraActivity.user_id
          ? newCraActivity.user_id.toString()
          : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "API CRA: Erreur lors de la création de l'activité CRA:",
      error
    );
    console.error("API CRA: Message d'erreur détaillé:", error.message); // Log le message d'erreur détaillé
    return NextResponse.json(
      {
        message: "Échec de la création de l'activité CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function updateCraActivityController(request, id) {
  try {
    const data = await request.json();
    console.log(
      "API CRA: Données reçues pour la mise à jour d'activité:",
      JSON.stringify(data, null, 2)
    );

    if (
      !data.date_activite ||
      !data.temps_passe ||
      !data.type_activite ||
      !data.user_id
    ) {
      console.error(
        "API CRA: Champs d'activité requis manquants pour la mise à jour."
      );
      return NextResponse.json(
        {
          message:
            "Champs d'activité requis manquants (date, temps, type, user_id) pour la mise à jour.",
        },
        { status: 400 }
      );
    }

    const activityType = await activityTypeModel.getActivityTypeById(
      data.type_activite
    );
    if (!activityType) {
      console.error(
        `API CRA: Type d'activité non trouvé pour l'ID: ${data.type_activite} lors de la mise à jour.`
      );
      return NextResponse.json(
        { message: "Type d'activité non trouvé." },
        { status: 400 }
      );
    }

    if (activityType.requires_client) {
      if (!data.client_id) {
        console.error(
          "API CRA: Un client est requis pour ce type d'activité mais n'a pas été fourni lors de la mise à jour."
        );
        return NextResponse.json(
          { message: "Un client est requis pour ce type d'activité." },
          { status: 400 }
        );
      }
      const client = await clientModel.getClientById(data.client_id);
      if (!client) {
        console.error(
          `API CRA: Client non trouvé pour l'ID fourni: ${data.client_id} lors de la mise à jour.`
        );
        return NextResponse.json(
          { message: "Client non trouvé pour l'ID fourni." },
          { status: 400 }
        );
      }
    } else {
      data.client_id = null;
    }

    const updatedCraActivity = await craActivityModel.updateCraActivity(
      id,
      data
    );
    if (updatedCraActivity) {
      return NextResponse.json(
        {
          ...updatedCraActivity,
          id: updatedCraActivity._id.toString(),
          client_id: updatedCraActivity.client_id
            ? updatedCraActivity.client_id.toString()
            : null,
          type_activite: updatedCraActivity.type_activite
            ? updatedCraActivity.type_activite.toString()
            : null,
          user_id: updatedCraActivity.user_id
            ? updatedCraActivity.user_id.toString()
            : null,
        },
        { status: 200 }
      );
    } else {
      console.warn(
        `API CRA: Activité CRA non trouvée pour la mise à jour avec l'ID: ${id}`
      );
      return NextResponse.json(
        { message: "Activité CRA non trouvée." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(
      "API CRA: Erreur lors de la mise à jour de l'activité CRA:",
      error
    );
    return NextResponse.json(
      {
        message: "Échec de la mise à jour de l'activité CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function deleteCraActivityController(request, id) {
  try {
    const { deleted } = await craActivityModel.deleteCraActivity(id);
    if (deleted) {
      console.log(`API CRA: Activité CRA supprimée avec succès: ${id}`);
      return new Response(null, { status: 204 });
    } else {
      console.warn(
        `API CRA: Activité CRA non trouvée pour la suppression avec l'ID: ${id}`
      );
      return NextResponse.json(
        { message: "Activité CRA non trouvée pour la suppression." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(
      `API CRA: Erreur lors de la suppression de l'activité CRA avec l'ID ${id}:`,
      error
    );
    return NextResponse.json(
      {
        message: "Échec de la suppression de l'activité CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function getCraActivitiesByDateRangeController(
  startDate,
  endDate
) {
  try {
    const activities = await craActivityModel.getCraActivitiesByDateRange(
      startDate,
      endDate
    );
    const formattedActivities = activities.map((activity) => ({
      ...activity,
      id: activity._id.toString(),
      client_id: activity.client_id ? activity.client_id.toString() : null,
      type_activite: activity.type_activite
        ? activity.type_activite.toString()
        : null,
      user_id: activity.user_id ? activity.user_id.toString() : null,
    }));
    console.log(
      `API CRA: Récupération de ${formattedActivities.length} activités CRA pour la plage.`
    );
    return NextResponse.json(formattedActivities, { status: 200 });
  } catch (error) {
    console.error(
      "API CRA: Erreur dans getCraActivitiesByDateRangeController:",
      error
    );
    return NextResponse.json(
      {
        message:
          "Échec de la récupération des activités CRA par plage de dates.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function getCraActivityByIdController(request, id) {
  try {
    const activity = await craActivityModel.getCraActivityById(id);
    if (activity) {
      return NextResponse.json(
        {
          ...activity,
          id: activity._id.toString(),
          client_id: activity.client_id ? activity.client_id.toString() : null,
          type_activite: activity.type_activite
            ? activity.type_activite.toString()
            : null,
          user_id: activity.user_id ? activity.user_id.toString() : null,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: "Activité CRA non trouvée." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("API CRA: Erreur dans getCraActivityByIdController:", error);
    return NextResponse.json(
      {
        message: "Erreur serveur lors de la récupération de l'activité CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
