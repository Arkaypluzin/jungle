// app/dashboard/cra/page.js
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import CraBoard from "../../components/CraBoard";
import UnifiedManager from "../../components/UnifiedManager";
import ToastMessage from "../../components/ToastMessage";
import SentCraHistory from "../../components/SentCraHistory";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";

export default function CRAPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("Chargement...");
  const [activeTab, setActiveTab] = useState("craManager");

  const [craActivities, setCraActivities] = useState([]);
  const [clientDefinitions, setClientDefinitions] = useState([]);
  const [activityTypeDefinitions, setActivityTypeDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [toastMessage, setToastMessage] = useState({
    message: "",
    type: "info",
    isVisible: false,
  });

  const showMessage = useCallback((message, type = "success") => {
    setToastMessage({ message, type, isVisible: true });
    setTimeout(() => {
      setToastMessage((prev) => ({ ...prev, isVisible: false }));
    }, 5000);
  }, []);

  const hideMessage = useCallback(() => {
    setToastMessage((prev) => ({ ...prev, isVisible: false }));
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      setCurrentUserId(session.user.id);
      setCurrentUserName(
        session.user.name || session.user.email || "Utilisateur"
      );
    } else if (status === "unauthenticated") {
      setCurrentUserId("unauthenticated");
      setCurrentUserName("Non connecté");
    }
  }, [session, status]);

  const fetchAndParse = useCallback(async (url, resourceName) => {
    const res = await fetch(url);
    if (!res.ok) {
      let errorInfo = `Erreur HTTP ${res.status}: ${res.statusText}`;
      let rawText = "Non disponible (erreur réseau ou réponse vide)";
      try {
        rawText = await res.text();
        try {
          const errorData = JSON.parse(rawText);
          errorInfo += ` - Message API: ${
            errorData.message || JSON.stringify(errorData)
          }`;
        } catch (jsonParseError) {
          errorInfo += ` - Réponse non-JSON ou invalide (début): "${rawText.substring(
            0,
            200
          )}..."`;
        }
      } catch (textError) {}
      throw new Error(`Échec du chargement des ${resourceName}: ${errorInfo}`);
    }
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const rawText = await res.text();
      throw new Error(
        `Réponse inattendue pour ${resourceName}: Le contenu n'est pas du JSON. Début de la réponse: "${rawText.substring(
          0,
          100
        )}..."`
      );
    }
    const jsonData = await res.json();
    return jsonData;
  }, []);

  const fetchData = useCallback(async () => {
    if (!currentUserId || currentUserId === "unauthenticated") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const clientsData = await fetchAndParse("/api/client", "clients");
      setClientDefinitions(clientsData);
      console.log("Clients chargés (frontend):", clientsData); // Debug log

      const activityTypesData = await fetchAndParse(
        "/api/activity_type",
        "types d'activité"
      );
      setActivityTypeDefinitions(activityTypesData);
      console.log("Types d'activité chargés (frontend):", activityTypesData); // Debug log

      const craActivitiesData = await fetchAndParse(
        `/api/cra_activities?userId=${currentUserId}`,
        "activités CRA"
      );
      const parsedCraActivities = craActivitiesData.map((activity) => ({
        ...activity,
        date_activite:
          activity.date_activite instanceof Date
            ? activity.date_activite
            : parseISO(activity.date_activite),
      }));
      setCraActivities(parsedCraActivities);
      console.log("Activités CRA chargées (frontend):", parsedCraActivities);
    } catch (err) {
      console.error("Erreur lors du chargement des données:", err);
      setError(`Erreur de chargement: ${err.message}`);
      showMessage(`Erreur de chargement: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [currentUserId, showMessage, fetchAndParse]);

  useEffect(() => {
    if (
      status === "authenticated" &&
      currentUserId &&
      currentUserId !== "unauthenticated"
    ) {
      fetchData();
    }
  }, [fetchData, currentUserId, status]);

  const handleAddClient = useCallback(
    async (clientData) => {
      try {
        const response = await fetch("/api/client", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientData),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Échec de l'ajout du client");
        }
        const newClient = await response.json();
        setClientDefinitions((prevClients) => [...prevClients, newClient]);
        showMessage("Client ajouté avec succès !", "success");
      } catch (error) {
        showMessage(`Erreur d'ajout de client: ${error.message}`, "error");
      }
    },
    [showMessage]
  );

  const handleUpdateClient = useCallback(
    async (id, clientData) => {
      try {
        const response = await fetch(`/api/client/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientData),
        });
        if (!response.ok) {
          if (response.status === 204) {
          } else {
            const errorData = await response.json();
            throw new Error(
              errorData.message || "Échec de la mise à jour du client"
            );
          }
        }
        setClientDefinitions((prevClients) =>
          prevClients.map((client) =>
            client.id === id ? { ...client, ...clientData } : client
          )
        );
        showMessage("Client mis à jour avec succès !", "success");
      } catch (error) {
        showMessage(`Erreur de mise à jour client: ${error.message}`, "error");
      }
    },
    [showMessage]
  );

  const handleDeleteClient = useCallback(
    async (id) => {
      try {
        const response = await fetch(`/api/client/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          if (response.status === 204) {
          } else {
            const errorData = await response.json();
            throw new Error(
              errorData.message || "Échec de la suppression du client"
            );
          }
        }
        setClientDefinitions((prevClients) =>
          prevClients.filter((client) => client.id !== id)
        );
        showMessage("Client supprimé avec succès !", "success");
      } catch (error) {
        showMessage(`Erreur de suppression client: ${error.message}`, "error");
      }
    },
    [showMessage]
  );

  const handleAddActivityType = useCallback(
    async (activityTypeData) => {
      try {
        const response = await fetch("/api/activity_type", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activityTypeData),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Échec de l'ajout du type d'activité"
          );
        }
        const newType = await response.json();
        setActivityTypeDefinitions((prev) => [...prev, newType]);
        showMessage("Type d'activité ajouté avec succès !", "success");
      } catch (error) {
        showMessage(
          `Erreur d'ajout de type d'activité: ${error.message}`,
          "error"
        );
      }
    },
    [showMessage]
  );

  const handleUpdateActivityType = useCallback(
    async (id, updateData) => {
      try {
        const response = await fetch(`/api/activity_type/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Échec de la modification du type d'activité"
          );
        }
        const updatedType = await response.json();
        setActivityTypeDefinitions((prev) =>
          prev.map((type) => (type.id === id ? updatedType : type))
        );
        showMessage("Type d'activité modifié avec succès !", "success");
      } catch (error) {
        showMessage(`Erreur de modification: ${error.message}`, "error");
      }
    },
    [showMessage]
  );

  const handleDeleteActivityType = useCallback(
    async (id) => {
      try {
        const response = await fetch(`/api/activity_type/${id}`, {
          method: "DELETE",
        });
        if (!response.ok && response.status !== 204) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Échec de la suppression du type d'activité"
          );
        }
        setActivityTypeDefinitions((prev) =>
          prev.filter((type) => type.id !== id)
        );
        showMessage("Type d'activité supprimé avec succès !", "success");
      } catch (error) {
        showMessage(`Erreur de suppression: ${error.message}`, "error");
      }
    },
    [showMessage]
  );

  const handleAddCraActivity = useCallback(
    async (activityData) => {
      console.log(
        "handleAddCraActivity appelée avec raw activityData:",
        activityData
      ); // Debug log

      if (!currentUserId || currentUserId === "unauthenticated") {
        showMessage(
          "Veuillez vous connecter pour ajouter des activités.",
          "error"
        );
        return;
      }

      const dateToFormat = parseISO(activityData.date_activite);
      if (!isValid(dateToFormat)) {
        showMessage("Erreur : Date d'activité invalide.", "error");
        return;
      }
      const formattedDate = format(dateToFormat, "yyyy-MM-dd");

      const newActivityTime = parseFloat(activityData.temps_passe) || 0;

      // Find the activity type by name
      const selectedActivityType = activityTypeDefinitions.find(
        (type) => type.name === activityData.type_activite
      );

      if (!selectedActivityType) {
        showMessage(
          "Type d'activité sélectionné non valide ou manquant. Veuillez sélectionner un type existant.",
          "error"
        );
        console.error(
          "Type d'activité introuvable (frontend):",
          activityData.type_activite,
          "Définitions disponibles (frontend):",
          activityTypeDefinitions
        );
        return;
      }

      const isOvertime = selectedActivityType.is_overtime;
      const isBillable = selectedActivityType.is_billable;
      const requiresClient = selectedActivityType.requires_client;

      // Log clientDefinitions to see if it's populated
      console.log(
        "Client Definitions in handleAddCraActivity:",
        clientDefinitions
      ); // Debug log

      // Find the client name if client_id is provided
      const selectedClient = activityData.client_id
        ? clientDefinitions.find(
            (client) => client.id === parseInt(activityData.client_id)
          )
        : null;
      const clientNameForPayload = selectedClient ? selectedClient.name : null;

      console.log("ActivityData client_id from modal:", activityData.client_id); // Debug log
      console.log("Derived clientNameForPayload:", clientNameForPayload); // Debug log

      // VALIDATION LOGIC FOR CLIENT (frontend)
      if (
        requiresClient &&
        (!activityData.client_id || !clientNameForPayload)
      ) {
        showMessage(
          "Le client est requis pour ce type d'activité. Veuillez sélectionner un client.",
          "error"
        );
        return;
      }

      const totalTimeForDayExcludingOvertime = craActivities
        .filter(
          (activity) =>
            activity.user_id === currentUserId &&
            format(activity.date_activite, "yyyy-MM-dd") === formattedDate &&
            !activityTypeDefinitions.find(
              (type) => type.name === activity.type_activite
            )?.is_overtime
        )
        .reduce(
          (sum, activity) => sum + (parseFloat(activity.temps_passe) || 0),
          0
        );

      if (
        !isOvertime &&
        totalTimeForDayExcludingOvertime + newActivityTime > 1
      ) {
        showMessage(
          `Le temps total pour le ${format(dateToFormat, "dd MMMM", {
            locale: fr,
          })} dépassera 1 jour (${(
            totalTimeForDayExcludingOvertime + newActivityTime
          ).toFixed(
            2
          )}j). Maximum autorisé pour les activités régulières : 1 jour.`,
          "error"
        );
        return;
      }

      try {
        const payload = {
          description_activite: activityData.description_activite,
          temps_passe: newActivityTime,
          date_activite: formattedDate,
          type_activite: activityData.type_activite, // The name of the activity type
          override_non_working_day: activityData.override_non_working_day,
          user_id: currentUserId,
          client_id: activityData.client_id
            ? parseInt(activityData.client_id)
            : null,
          is_billable: isBillable, // Derived from activity type
          client_name: clientNameForPayload, // The derived client name
          status: activityData.status || "draft",
        };

        console.log("Payload sent to API:", payload); // Debug log

        const response = await fetch("/api/cra_activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Erreur lors de la création de l'activité CRA."
          );
        }

        const newCraActivity = await response.json();
        newCraActivity.date_activite = parseISO(newCraActivity.date_activite);

        setCraActivities((prevActivities) => {
          const updatedActivities = [...prevActivities, newCraActivity];
          console.log(
            "Nouvelle activité ajoutée à l'état local:",
            newCraActivity
          );
          console.log("Nouvel état des activités CRA:", updatedActivities);
          return updatedActivities;
        });

        showMessage("Activité CRA ajoutée avec succès !", "success");
      } catch (error) {
        showMessage(`Erreur d'ajout d'activité CRA: ${error.message}`, "error");
        console.error("Détail de l'erreur d'ajout:", error);
      }
    },
    [
      showMessage,
      currentUserId,
      craActivities,
      clientDefinitions,
      activityTypeDefinitions,
    ]
  );

  const handleUpdateCraActivity = useCallback(
    async (id, updateData) => {
      try {
        if (updateData.date_activite instanceof Date) {
          updateData.date_activite = format(
            updateData.date_activite,
            "yyyy-MM-dd"
          );
        }

        if (typeof updateData.type_activite !== "string") {
          const typeDef = activityTypeDefinitions.find(
            (t) => t.id === updateData.type_activite
          );
          if (typeDef) {
            updateData.type_activite = typeDef.name;
          }
        }

        let derivedClientName = null;
        if (updateData.client_id) {
          const clientDef = clientDefinitions.find(
            (c) => c.id === parseInt(updateData.client_id)
          );
          if (clientDef) {
            derivedClientName = clientDef.name;
          }
        }
        updateData.client_name = derivedClientName;

        updateData.temps_passe = parseFloat(updateData.temps_passe);

        console.log("Updating CRA Activity:", id, updateData);
        const response = await fetch(`/api/cra_activities/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message ||
              "Erreur lors de la mise à jour de l'activité CRA."
          );
        }

        const updatedActivity =
          response.status === 200 ? await response.json() : null;

        setCraActivities((prevActivities) =>
          prevActivities.map((activity) => {
            if (activity.id === id) {
              return {
                ...activity,
                ...updateData,
                date_activite: parseISO(updateData.date_activite),
                ...(updatedActivity
                  ? {
                      is_billable: updatedActivity.is_billable,
                      is_overtime: updatedActivity.is_overtime,
                    }
                  : {}),
              };
            }
            return activity;
          })
        );
        showMessage("Activité CRA mise à jour avec succès !", "success");
      } catch (error) {
        showMessage(
          `Erreur de mise à jour d'activité CRA: ${error.message}`,
          "error"
        );
        console.error("Détail de l'erreur de mise à jour:", error);
      }
    },
    [showMessage, clientDefinitions, activityTypeDefinitions]
  );

  const handleDeleteCraActivity = useCallback(
    async (id) => {
      try {
        console.log("Deleting CRA Activity:", id);
        const response = await fetch(`/api/cra_activities/${id}`, {
          method: "DELETE",
        });

        if (!response.ok && response.status !== 204) {
          const errorData = await response.json();
          throw new Error(
            errorData.message ||
              "Erreur lors de la suppression de l'activité CRA."
          );
        }

        setCraActivities((prevActivities) =>
          prevActivities.filter((activity) => activity.id !== id)
        );
        showMessage("Activité CRA supprimée avec succès !", "success");
      } catch (error) {
        showMessage(
          `Erreur de suppression d'activité CRA: ${error.message}`,
          "error"
        );
        console.error("Détail de l'erreur de suppression:", error);
      }
    },
    [showMessage]
  );

  if (status === "loading" || !currentUserId) {
    return (
      <div className="flex justify-center items-center h-screen text-xl text-gray-700">
        Chargement de la session utilisateur...
      </div>
    );
  }

  if (currentUserId === "unauthenticated") {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-xl text-red-600">
        <p>Accès non autorisé. Veuillez vous connecter.</p>
        <Link
          href="/api/auth/signin"
          className="mt-4 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl text-gray-700">
        Chargement des données...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-xl text-red-600">
        Erreur: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="mb-4 flex justify-between items-center">
        <div className="text-gray-700 text-lg font-semibold">
          Bienvenue, {currentUserName}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => router.push("/dashboard/admin")}
            className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg shadow-md hover:bg-gray-300 transition duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Retour au Tableau de Bord Admin
          </button>
        </div>
      </div>

      <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-8">
        Gestionnaire CRA
      </h1>

      <div className="flex justify-center mb-6">
        <button
          onClick={() => setActiveTab("craManager")}
          className={`px-6 py-3 rounded-t-lg font-semibold transition duration-300 ${
            activeTab === "craManager"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Mon CRA
        </button>
        <button
          onClick={() => setActiveTab("sentCraHistory")}
          className={`ml-2 px-6 py-3 rounded-t-lg font-semibold transition duration-300 ${
            activeTab === "sentCraHistory"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Historique des CRAs envoyés
        </button>
      </div>

      {activeTab === "craManager" && (
        <CraBoard
          craActivities={craActivities}
          activityTypeDefinitions={activityTypeDefinitions}
          clientDefinitions={clientDefinitions}
          onAddCraActivity={handleAddCraActivity}
          onUpdateCraActivity={handleUpdateCraActivity}
          onDeleteCraActivity={handleDeleteCraActivity}
          showMessage={showMessage}
          onFinalizeMonth={() =>
            showMessage("Fonctionnalité de finalisation à implémenter", "info")
          }
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      )}

      {activeTab === "sentCraHistory" && (
        <SentCraHistory
          craActivities={craActivities}
          clientDefinitions={clientDefinitions}
          activityTypeDefinitions={activityTypeDefinitions}
          onAddCraActivity={handleAddCraActivity}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          showMessage={showMessage}
          onUpdateCraStatus={() =>
            showMessage(
              "Fonctionnalité de mise à jour de statut à implémenter",
              "info"
            )
          }
        />
      )}

      <UnifiedManager
        clientDefinitions={clientDefinitions}
        onAddClient={handleAddClient}
        onUpdateClient={handleUpdateClient}
        onDeleteClient={handleDeleteClient}
        activityTypeDefinitions={activityTypeDefinitions}
        onAddActivityType={handleAddActivityType}
        onUpdateActivityType={handleUpdateActivityType}
        onDeleteActivityType={handleDeleteActivityType}
        showMessage={showMessage}
      />

      <ToastMessage
        message={toastMessage.message}
        type={toastMessage.type}
        isVisible={toastMessage.isVisible}
        onClose={hideMessage}
      />
    </div>
  );
}
