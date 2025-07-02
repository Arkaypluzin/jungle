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
  }, []);

  const hideMessage = useCallback(() => {
    setToastMessage((prev) => ({ ...prev, isVisible: false }));
  }, []);

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

      const craActivitiesData = await fetchAndParse(
        `/api/cra_activities?userId=${currentUserId}`,
        "activités CRA"
      );
      setCraActivities(craActivitiesData);

      const activityTypesData = await fetchAndParse(
        "/api/activity_type",
        "types d'activité"
      );
      setActivityTypeDefinitions(activityTypesData);
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
        console.error("Erreur lors de l'ajout du client:", error);
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
            console.log("Client mis à jour avec succès (204 No Content).");
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
        console.error("Erreur lors de la mise à jour du client:", error);
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
            console.log("Client supprimé avec succès (204 No Content).");
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
        console.error("Erreur lors de la suppression du client:", error);
        showMessage(`Erreur de suppression client: ${error.message}`, "error");
      }
    },
    [showMessage]
  );

  // FONCTIONS CORRIGÉES CI-DESSOUS POUR AJOUTER `client_name`
  const handleAddCraActivity = useCallback(
    async (activityData) => {
      if (!currentUserId || currentUserId === "unauthenticated") {
        showMessage(
          "Veuillez vous connecter pour ajouter des activités.",
          "error"
        );
        return;
      }

      const dateToFormat = parseISO(activityData.date);
      if (!isValid(dateToFormat)) {
        showMessage("Erreur : Date d'activité invalide.", "error");
        return;
      }
      const formattedDate = format(dateToFormat, "yyyy-MM-dd");

      const newActivityTime = parseFloat(activityData.tempsPasse) || 0;
      const isOvertime = activityData.typeActivite === "Heure supplémentaire";
      const isBillable = activityData.isBillable;

      const totalTimeForDayExcludingOvertime = craActivities
        .filter(
          (activity) =>
            activity.user_id === currentUserId &&
            activity.date_activite === formattedDate &&
            activity.type_activite !== "Heure supplémentaire"
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
          `Le temps total pour le ${format(dateToFormat, "dd MMMM yyyy", {
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

      // Ajout du nom du client
      let clientName = null;
      if (activityData.clientId && clientDefinitions.length > 0) {
        const clientObj = clientDefinitions.find(
          (c) => String(c.id) === String(activityData.clientId)
        );
        if (clientObj) {
          clientName = clientObj.nom_client;
        }
      }

      try {
        const payload = {
          description_activite: activityData.descriptionActivite,
          temps_passe: newActivityTime,
          date_activite: formattedDate,
          type_activite: activityData.typeActivite,
          override_non_working_day: activityData.overrideNonWorkingDay,
          user_id: currentUserId,
          client_id:
            activityData.clientId === ""
              ? null
              : parseInt(activityData.clientId),
          is_billable: isBillable,
          client_name: clientName,
        };

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
        setCraActivities((prevActivities) => [
          ...prevActivities,
          newCraActivity,
        ]);
        showMessage("Activité CRA ajoutée avec succès !", "success");
      } catch (error) {
        console.error("Erreur lors de l'ajout de l'activité CRA:", error);
        showMessage(`Erreur d'ajout d'activité CRA: ${error.message}`, "error");
      }
    },
    [showMessage, currentUserId, craActivities, clientDefinitions]
  );

  const handleUpdateCraActivity = useCallback(
    async (id, activityData) => {
      if (!currentUserId || currentUserId === "unauthenticated") {
        showMessage(
          "Veuillez vous connecter pour modifier des activités.",
          "error"
        );
        return;
      }

      const dateToFormat = parseISO(activityData.date);
      if (!isValid(dateToFormat)) {
        showMessage("Erreur : Date d'activité invalide.", "error");
        return;
      }
      const formattedDate = format(dateToFormat, "yyyy-MM-dd");

      const updatedActivityTime = parseFloat(activityData.tempsPasse) || 0;
      const isOvertime = activityData.typeActivite === "Heure supplémentaire";
      const isBillable = activityData.isBillable;

      const totalTimeForDayExcludingCurrentAndOvertime = craActivities
        .filter(
          (activity) =>
            activity.user_id === currentUserId &&
            activity.date_activite === formattedDate &&
            activity.id !== id &&
            activity.type_activite !== "Heure supplémentaire"
        )
        .reduce(
          (sum, activity) => sum + (parseFloat(activity.temps_passe) || 0),
          0
        );

      if (
        !isOvertime &&
        totalTimeForDayExcludingCurrentAndOvertime + updatedActivityTime > 1
      ) {
        showMessage(
          `Le temps total pour le ${format(dateToFormat, "dd MMMM yyyy", {
            locale: fr,
          })} dépassera 1 jour (${(
            totalTimeForDayExcludingCurrentAndOvertime + updatedActivityTime
          ).toFixed(
            2
          )}j). Maximum autorisé pour les activités régulières : 1 jour.`,
          "error"
        );
        return;
      }

      // Ajout du nom du client pour la modification aussi
      let clientName = null;
      if (activityData.clientId && clientDefinitions.length > 0) {
        const clientObj = clientDefinitions.find(
          (c) => String(c.id) === String(activityData.clientId)
        );
        if (clientObj) {
          clientName = clientObj.nom_client;
        }
      }

      try {
        const payload = {
          id,
          description_activite: activityData.descriptionActivite,
          temps_passe: updatedActivityTime,
          date_activite: formattedDate,
          type_activite: activityData.typeActivite,
          override_non_working_day: activityData.overrideNonWorkingDay,
          user_id: currentUserId,
          client_id:
            activityData.clientId === ""
              ? null
              : parseInt(activityData.clientId),
          is_billable: isBillable,
          client_name: clientName,
        };

        const response = await fetch(
          `/api/cra_activities?action=update-activity`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message ||
              "Erreur lors de la modification de l'activité CRA."
          );
        }
        fetchData();
        showMessage("Activité CRA mise à jour avec succès !", "success");
      } catch (error) {
        console.error(
          "Erreur lors de la mise à jour de l'activité CRA:",
          error
        );
        showMessage(
          `Erreur de mise à jour d'activité CRA: ${error.message}`,
          "error"
        );
      }
    },
    [showMessage, currentUserId, craActivities, clientDefinitions, fetchData]
  );

  // ... le reste de ton code (handlers activity types, clients, etc. inchangés) ...

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
      {/* ... en-tête, navigation, etc ... */}

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

      {/* Navigation par onglets */}
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

      {/* Contenu conditionnel des onglets */}
      {activeTab === "craManager" && (
        <CraBoard
          craActivities={craActivities}
          activityTypeDefinitions={activityTypeDefinitions}
          clientDefinitions={clientDefinitions}
          onAddCraActivity={handleAddCraActivity}
          onUpdateCraActivity={handleUpdateCraActivity}
          onDeleteCraActivity={() => {}} // ... complète ou récupère ta logique
          showMessage={showMessage}
          onFinalizeMonth={() => {}} // ... idem si besoin
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      )}

      {activeTab === "sentCraHistory" && (
        <SentCraHistory
          craActivities={craActivities}
          clientDefinitions={clientDefinitions}
          activityTypeDefinitions={activityTypeDefinitions}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          showMessage={showMessage}
          onUpdateCraStatus={() => {}} // ... idem si besoin
        />
      )}

      <UnifiedManager
        clientDefinitions={clientDefinitions}
        onAddClient={handleAddClient}
        onUpdateClient={handleUpdateClient}
        onDeleteClient={handleDeleteClient}
        activityTypeDefinitions={activityTypeDefinitions}
        onAddActivityType={() => {}}
        onUpdateActivityType={() => {}}
        onDeleteActivityType={() => {}}
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
