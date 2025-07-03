// app/api/cra_activities/controller.js
import { NextResponse } from "next/server";

// Importez votre client Prisma ici ou la logique d'accès à la base de données
// import prisma from '../../lib/prisma'; // Exemple si vous utilisez Prisma

// Simuler une base de données d'activités CRA (à remplacer par votre DB réelle)
// Initialisez-la vide ou avec des données de test si vous n'avez pas de DB connectée
let craActivitiesDB = [];

// Simuler des définitions de types d'activité (à remplacer par votre DB réelle)
// *** TRÈS IMPORTANT : Les noms ici DOIVENT correspondre aux valeurs des options dans ActivityModal.js ***
const activityTypeDefinitions = [
  {
    id: 1,
    name: "Développement",
    libelle: "Développement",
    is_billable: true,
    is_overtime: false,
    requires_client: true,
  },
  {
    id: 2,
    name: "Réunion client",
    libelle: "Réunion client",
    is_billable: true,
    is_overtime: false,
    requires_client: true,
  },
  {
    id: 3,
    name: "Formation interne",
    libelle: "Formation interne",
    is_billable: false,
    is_overtime: false,
    requires_client: false,
  },
  {
    id: 4,
    name: "Absence",
    libelle: "Absence",
    is_billable: false,
    is_overtime: false,
    requires_client: false,
  },
  {
    id: 5,
    name: "Heures supplémentaires",
    libelle: "Heures supplémentaires",
    is_billable: true,
    is_overtime: true,
    requires_client: true,
  },
  // AJOUTÉE : La définition du type 'testing' pour correspondre à ce que le frontend envoie
  {
    id: 6,
    name: "testing",
    libelle: "Activité de test",
    is_billable: false,
    is_overtime: false,
    requires_client: false,
  },
];

// Simuler des définitions de clients (à remplacer par votre DB réelle)
// Assurez-vous que cette liste est cohérente avec votre base de données réelle
const clientDefinitions = [
  { id: 101, name: "Client A", nom_client: "Client A" },
  { id: 102, name: "Client B", nom_client: "Client B" },
  { id: 103, name: "Client C", nom_client: "Client C" },
];

export async function getAllCraActivitiesController(request) {
  const { searchParams } = new URL(request.url); // Accéder directement à request.url
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { message: "User ID is required" },
      { status: 400 }
    );
  }

  try {
    // Dans une vraie application, vous feriez une requête à votre base de données
    // const activities = await prisma.craActivity.findMany({ where: { user_id: userId } });

    // Pour la simulation:
    const activities = craActivitiesDB.filter(
      (activity) => String(activity.user_id) === String(userId)
    );

    return NextResponse.json(activities, { status: 200 });
  } catch (error) {
    console.error("Error fetching CRA activities:", error);
    return NextResponse.json(
      { message: "Failed to fetch CRA activities", error: error.message },
      { status: 500 }
    );
  }
}

export async function getCraActivityByIdController(id) {
  try {
    // Dans une vraie application: const craActivity = await prisma.craActivity.findUnique({ where: { id: parseInt(id) } });
    const craActivity = craActivitiesDB.find(
      (activity) => String(activity.id) === String(id)
    );
    if (craActivity) {
      return NextResponse.json(craActivity);
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

export async function createCraActivityController(activity) {
  try {
    console.log("Received data for new CRA activity in controller:", activity); // Debug log

    const {
      date_activite,
      client_id, // L'ID du client (peut être null)
      type_activite, // Le nom/libellé du type d'activité (maintenant envoyé par le frontend)
      temps_passe,
      description_activite,
      override_non_working_day,
      user_id,
      status = "draft", // Par défaut à 'draft' si non fourni
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

    // Trouver le type d'activité en fonction du NOM (type_activite)
    const selectedActivityType = activityTypeDefinitions.find(
      (type) => type.name === type_activite
    );
    console.log("Type d'activité reçu du frontend:", type_activite); // Debug log
    console.log(
      "Définitions de types d'activité (backend):",
      activityTypeDefinitions
    ); // Debug log
    console.log("Type d'activité sélectionné (backend):", selectedActivityType); // Debug log

    if (!selectedActivityType) {
      return NextResponse.json(
        { message: "Type d'activité non valide ou inconnu." },
        { status: 400 }
      );
    }

    // Trouver le nom du client basé sur l'ID (client_id)
    const clientNameForDB = client_id
      ? clientDefinitions.find((client) => client.id === parseInt(client_id))
          ?.name || null
      : null;

    // Validation conditionnelle du client
    if (selectedActivityType.requires_client) {
      if (!client_id || !clientNameForDB) {
        return NextResponse.json(
          {
            message:
              "Le client est requis pour ce type d'activité (sauf pour les absences).",
          },
          { status: 400 }
        );
      }
    } else {
      // Si le type d'activité ne requiert PAS de client, assurez-vous que client_id/client_name sont null pour la DB
      if (client_id !== null || clientNameForDB !== null) {
        console.warn(
          `Client (ID: ${client_id}, Name: ${clientNameForDB}) provided for non-client requiring activity: ${type_activite}. Setting client_id and client_name to null in payload.`
        );
      }
    }

    // Construire le nouvel objet d'activité avec un ID unique
    const newCraActivity = {
      id: Date.now(), // ID unique simple pour la simulation
      user_id,
      date_activite,
      client_id: selectedActivityType.requires_client
        ? parseInt(client_id) || null
        : null,
      client_name: selectedActivityType.requires_client
        ? clientNameForDB || null
        : null,
      type_activite, // Le nom du type (ex: "Développement")
      temps_passe,
      description_activite,
      is_billable: selectedActivityType.is_billable, // Déduit du type d'activité
      is_overtime: selectedActivityType.is_overtime, // Déduit du type d'activité
      override_non_working_day,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Dans une vraie application, vous inséreriez ceci dans votre base de données
    // const createdActivity = await prisma.craActivity.create({ data: newCraActivity });

    // Pour la simulation:
    craActivitiesDB.push(newCraActivity);

    return NextResponse.json(newCraActivity, { status: 201 });
  } catch (error) {
    console.error("Error creating CRA activity:", error);
    return NextResponse.json(
      { message: "Failed to create CRA activity", error: error.message },
      { status: 500 }
    );
  }
}

export async function updateCraActivityController(id, updateData) {
  try {
    console.log(
      `Received data for updating CRA activity (ID: ${id}) in controller:`,
      updateData
    ); // Debug log

    const {
      temps_passe,
      date_activite,
      type_activite, // This will be the name from frontend
      client_id, // This will be the ID from frontend
      description_activite,
      override_non_working_day,
      status,
      // user_id should not be updated via PUT, it's typically fixed
    } = updateData;

    // Fetch current activity to merge or validate against
    const existingActivityIndex = craActivitiesDB.findIndex(
      (activity) => String(activity.id) === String(id)
    );
    if (existingActivityIndex === -1) {
      return NextResponse.json(
        { message: "Activité CRA non trouvée." },
        { status: 404 }
      );
    }
    let existingActivity = craActivitiesDB[existingActivityIndex];

    // Basic validation
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "Aucune donnée fournie pour la mise à jour." },
        { status: 400 }
      );
    }
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
      // Basic check, better would be isValidDate
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

    // Find the activity type based on the name from updateData
    const selectedActivityType = type_activite
      ? activityTypeDefinitions.find((type) => type.name === type_activite)
      : activityTypeDefinitions.find(
          (type) => type.name === existingActivity.type_activite
        ); // Fallback to existing type

    if (!selectedActivityType) {
      return NextResponse.json(
        {
          message: "Type d'activité non valide ou inconnu pour la mise à jour.",
        },
        { status: 400 }
      );
    }

    // Derive client_name for database if client_id is provided in updateData
    const clientNameForDB =
      client_id !== undefined && client_id !== null
        ? clientDefinitions.find((client) => client.id === parseInt(client_id))
            ?.name || null
        : existingActivity.client_name; // Keep existing client_name if client_id not provided

    // Client validation for update
    if (selectedActivityType.requires_client) {
      // If client is required and either client_id or derived clientName is missing/null
      if (
        (client_id === undefined || client_id === null) &&
        !existingActivity.client_id
      ) {
        return NextResponse.json(
          {
            message:
              "Le client est requis pour ce type d'activité (sauf pour les absences).",
          },
          { status: 400 }
        );
      }
      if (client_id !== undefined && client_id !== null && !clientNameForDB) {
        return NextResponse.json(
          { message: "Client non trouvé pour l'ID fourni." },
          { status: 400 }
        );
      }
    } else {
      // If client is NOT required, ensure client fields are null in the final update
      if (
        (client_id !== undefined && client_id !== null) ||
        (clientNameForDB !== undefined && clientNameForDB !== null)
      ) {
        console.warn(
          `Client provided for non-client requiring activity: ${type_activite}. Nullifying client fields.`
        );
        updateData.client_id = null;
        updateData.client_name = null;
      } else {
        updateData.client_id = null; // Explicitly set to null if already null/undefined and not required
        updateData.client_name = null;
      }
    }

    // Construct the updated activity object
    const updatedActivity = {
      ...existingActivity, // Start with existing data
      ...updateData, // Apply incoming updates
      // Re-evaluate is_billable and is_overtime based on the (potentially new) type
      is_billable: selectedActivityType.is_billable,
      is_overtime: selectedActivityType.is_overtime,
      // Ensure client fields are correctly set based on validation
      client_id: selectedActivityType.requires_client
        ? parseInt(
            client_id !== undefined ? client_id : existingActivity.client_id
          ) || null
        : null,
      client_name: selectedActivityType.requires_client
        ? clientNameForDB !== undefined
          ? clientNameForDB
          : existingActivity.client_name || null
        : null,
      updated_at: new Date().toISOString(),
    };

    // In a real application: await prisma.craActivity.update({ where: { id: parseInt(id) }, data: updatedActivity });
    craActivitiesDB[existingActivityIndex] = updatedActivity;

    return NextResponse.json(updatedActivity, { status: 200 });
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

export async function deleteCraActivityController(id) {
  try {
    // Dans une vraie application: const result = await prisma.craActivity.delete({ where: { id: parseInt(id) } });
    const initialLength = craActivitiesDB.length;
    craActivitiesDB = craActivitiesDB.filter(
      (activity) => String(activity.id) !== String(id)
    );
    const deleted = craActivitiesDB.length < initialLength;

    if (deleted) {
      return new NextResponse(null, { status: 204 });
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
