// app/api/cra_activities/controller.js
// Importe les modèles
import * as craActivityModel from "./model";
import * as activityTypeModel from "../activity_type/model";
import * as clientModel from "../client/model";
import { NextResponse } from "next/server"; // Importe NextResponse pour les réponses de l'App Router

// Fonction utilitaire pour charger les définitions de types d'activité depuis la DB
async function getLoadedActivityTypeDefinitions() {
  const types = await activityTypeModel.getAllActivityTypes();
  return types.map((type) => ({
    ...type,
    id: type._id ? type._id.toString() : null,
    // Assurez-vous que requires_client et is_overtime sont définis pour tous les types
    requires_client: type.requires_client ?? true, // Par défaut à true si non spécifié
    is_overtime: type.is_overtime ?? false, // Par défaut à false si non spécifié
  }));
}

// Fonction utilitaire pour charger les définitions de clients depuis la DB
async function getLoadedClientDefinitions() {
  const clients = await clientModel.getAllClients();
  return clients.map((client) => ({
    ...client,
    id: client._id ? client._id.toString() : null,
  }));
}

// --- Contrôleur pour GET toutes les activités CRA ---
export async function getAllCraActivitiesController(request) {
  // Prend l'objet Request
  const userId = request.nextUrl.searchParams.get("userId"); // Accède à userId via request.nextUrl.searchParams

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
      id: activity._id ? activity._id.toString() : null, // Assure que _id existe
      date_activite: activity.date_activite,
    }));

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching CRA activities:", error);
    return NextResponse.json(
      {
        message: "Échec de la récupération des activités CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// --- Contrôleur pour GET une activité CRA par ID ---
export async function getCraActivityByIdController(request, id) {
  // Prend l'objet Request et l'ID
  try {
    const craActivity = await craActivityModel.getCraActivityById(id);
    if (craActivity) {
      return NextResponse.json(
        {
          ...craActivity,
          id: craActivity._id ? craActivity._id.toString() : null,
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
    console.error("Error getting CRA activity by ID:", error);
    return NextResponse.json(
      {
        message: "Erreur serveur lors de la récupération de l'activité CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// --- Contrôleur pour créer une activité CRA (POST) ---
export async function createCraActivityController(request) {
  // Prend l'objet Request
  try {
    const activity = await request.json(); // Accède au corps de la requête
    console.log("Received data for new CRA activity in controller:", activity);

    const activityTypeDefinitions = await getLoadedActivityTypeDefinitions();
    const clientDefinitions = await getLoadedClientDefinitions();

    const {
      date_activite,
      client_id,
      type_activite, // L'ID du type d'activité du frontend
      temps_passe,
      description_activite,
      override_non_working_day,
      user_id,
      status = "draft",
      // is_billable et client_name du frontend sont ignorés, car ils seront dérivés
    } = activity;

    // --- Validation côté serveur ---
    if (!user_id) {
      return NextResponse.json(
        { message: "User ID est requis." },
        { status: 400 }
      );
    }
    if (!date_activite) {
      return NextResponse.json(
        { message: "La date d'activité est requise." },
        { status: 400 }
      );
    }
    if (!type_activite) {
      return NextResponse.json(
        { message: "Le type d'activité est requis." },
        { status: 400 }
      );
    }
    if (typeof temps_passe !== "number" || temps_passe <= 0) {
      return NextResponse.json(
        { message: "Le temps passé doit être un nombre positif." },
        { status: 400 }
      );
    }

    const selectedActivityType = activityTypeDefinitions.find(
      (type) => String(type.id) === String(type_activite)
    );
    if (!selectedActivityType) {
      return NextResponse.json(
        { message: "Type d'activité non valide ou inconnu (backend)." },
        { status: 400 }
      );
    }

    let finalClientId = null;
    let finalClientName = null;

    if (selectedActivityType.requires_client) {
      if (!client_id) {
        return NextResponse.json(
          { message: "Le client est requis pour ce type d'activité." },
          { status: 400 }
        );
      }
      const clientObj = clientDefinitions.find(
        (client) => String(client.id) === String(client_id)
      );
      if (!clientObj) {
        return NextResponse.json(
          { message: "Client non trouvé pour l'ID fourni." },
          { status: 400 }
        );
      }
      finalClientId = String(client_id);
      finalClientName = clientObj.nom_client || clientObj.name; // Utilise nom_client ou name du client
    } else {
      // Si le type d'activité ne requiert PAS de client, assurez-vous que les champs client sont null
      if (client_id !== null) {
        console.warn(
          `Client ID (${client_id}) fourni pour une activité ne nécessitant pas de client: ${selectedActivityType.name}. Les champs client_id et client_name seront mis à null.`
        );
      }
    }

    const newCraActivityData = {
      user_id,
      date_activite,
      client_id: finalClientId,
      client_name: finalClientName,
      type_activite: String(type_activite), // Stocke l'ID du type
      type_activite_name: selectedActivityType.name, // Stocke le NOM du type (dérivé)
      temps_passe,
      description_activite,
      is_billable: selectedActivityType.is_billable, // Dérivé de la définition backend
      is_overtime: selectedActivityType.is_overtime, // Dérivé de la définition backend
      override_non_working_day,
      status,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const createdActivity = await craActivityModel.createCraActivity(
      newCraActivityData
    );
    return NextResponse.json(
      { ...createdActivity, id: createdActivity._id.toString() },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating CRA activity:", error);
    return NextResponse.json(
      {
        message: "Échec de la création de l'activité CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// --- Contrôleur pour mettre à jour une activité CRA (PUT) ---
export async function updateCraActivityController(request, id) {
  // Prend l'objet Request et l'ID
  try {
    const updateData = await request.json(); // Accède au corps de la requête
    console.log(
      `Received data for updating CRA activity (ID: ${id}) in controller:`,
      updateData
    );

    const activityTypeDefinitions = await getLoadedActivityTypeDefinitions();
    const clientDefinitions = await getLoadedClientDefinitions();

    const existingActivity = await craActivityModel.getCraActivityById(id);
    if (!existingActivity) {
      return NextResponse.json(
        { message: "Activité CRA non trouvée." },
        { status: 404 }
      );
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "Aucune donnée fournie pour la mise à jour." },
        { status: 400 }
      );
    }

    const {
      temps_passe,
      date_activite,
      type_activite, // L'ID du type d'activité du frontend
      client_id, // L'ID du client du frontend
      description_activite,
      override_non_working_day,
      status,
    } = updateData;

    if (
      temps_passe !== undefined &&
      (typeof temps_passe !== "number" || temps_passe <= 0)
    ) {
      return NextResponse.json(
        { message: "Le temps passé doit être un nombre positif." },
        { status: 400 }
      );
    }
    if (date_activite !== undefined && !date_activite) {
      return NextResponse.json(
        { message: "La date d'activité est requise pour la mise à jour." },
        { status: 400 }
      );
    }
    if (type_activite !== undefined && !type_activite) {
      return NextResponse.json(
        { message: "Le type d'activité est requis pour la mise à jour." },
        { status: 400 }
      );
    }

    const selectedActivityType = type_activite
      ? activityTypeDefinitions.find(
          (type) => String(type.id) === String(type_activite)
        )
      : activityTypeDefinitions.find(
          (type) => String(type.id) === String(existingActivity.type_activite)
        ); // Fallback à l'ID existant

    if (!selectedActivityType) {
      return NextResponse.json(
        {
          message:
            "Type d'activité non valide ou inconnu pour la mise à jour (backend).",
        },
        { status: 400 }
      );
    }

    let finalClientId = existingActivity.client_id;
    let finalClientName = existingActivity.client_name;

    if (selectedActivityType.requires_client) {
      // Si client_id est explicitement fourni dans updateData, utilisez-le. Sinon, gardez l'existant.
      const currentClientId =
        client_id !== undefined ? client_id : existingActivity.client_id;
      if (!currentClientId) {
        return NextResponse.json(
          { message: "Le client est requis pour ce type d'activité." },
          { status: 400 }
        );
      }
      const clientObj = clientDefinitions.find(
        (client) => String(client.id) === String(currentClientId)
      );
      if (!clientObj) {
        return NextResponse.json(
          { message: "Client non trouvé pour l'ID fourni." },
          { status: 400 }
        );
      }
      finalClientId = String(currentClientId);
      finalClientName = clientObj.nom_client || clientObj.name;
    } else {
      // Si le type d'activité ne requiert PAS de client, mettez les champs client à null
      if (client_id !== undefined && client_id !== null) {
        console.warn(
          `Client ID (${client_id}) fourni pour une activité ne nécessitant pas de client: ${selectedActivityType.name}. Les champs client_id et client_name seront mis à null.`
        );
      }
      finalClientId = null;
      finalClientName = null;
    }

    const dataToUpdateModel = {
      description_activite:
        description_activite !== undefined
          ? description_activite
          : existingActivity.description_activite,
      temps_passe:
        temps_passe !== undefined ? temps_passe : existingActivity.temps_passe,
      date_activite:
        date_activite !== undefined
          ? date_activite
          : existingActivity.date_activite,
      type_activite: String(
        type_activite !== undefined
          ? type_activite
          : existingActivity.type_activite
      ), // Stocke l'ID
      type_activite_name: selectedActivityType.name, // Stocke le NOM (dérivé)
      override_non_working_day:
        override_non_working_day !== undefined
          ? override_non_working_day
          : existingActivity.override_non_working_day,
      client_id: finalClientId,
      client_name: finalClientName,
      is_billable: selectedActivityType.is_billable, // Dérivé
      is_overtime: selectedActivityType.is_overtime, // Dérivé
      status: status !== undefined ? status : existingActivity.status,
      updated_at: new Date(),
    };

    const updatedActivity = await craActivityModel.updateCraActivity(
      id,
      dataToUpdateModel
    );
    return NextResponse.json(
      { ...updatedActivity, id: updatedActivity._id.toString() },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating CRA activity:", error);
    return NextResponse.json(
      {
        message: "Erreur lors de la mise à jour de l'activité CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// --- Contrôleur pour supprimer une activité CRA (DELETE) ---
export async function deleteCraActivityController(request, id) {
  // Prend l'objet Request et l'ID
  try {
    const { deleted } = await craActivityModel.deleteCraActivity(id);
    if (deleted) {
      return new Response(null, { status: 204 }); // Retourne une Response vide pour 204 No Content
    } else {
      return NextResponse.json(
        { message: "Activité CRA non trouvée." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error deleting CRA activity:", error);
    return NextResponse.json(
      {
        message: "Erreur serveur lors de la suppression de l'activité CRA.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
