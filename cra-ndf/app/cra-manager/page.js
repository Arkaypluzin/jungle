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

// Placeholder pour le nouveau composant des CRAs reçus
const ReceivedCraList = ({ currentUserId, showMessage }) => {
  // Ici, vous implémenteriez la logique pour récupérer et afficher les CRAs reçus
  // (ceux qui ont été "envoyés" par d'autres utilisateurs ou qui sont en attente de validation par l'admin)
  return (
    <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        CRAs Reçus (Panel Admin)
      </h2>
      <p className="text-gray-600">
        Cette section affichera la liste des CRAs soumis par les utilisateurs
        pour validation. La logique de récupération et d'affichage sera
        implémentée ici.
      </p>
      {/* Exemple de contenu pour débogage */}
      <p className="mt-4 text-sm text-gray-500">
        Utilisateur actuel ID: {currentUserId}
      </p>
      <p className="text-sm text-gray-500">
        (Fonctionnalité à développer pour afficher les CRAs en attente de
        validation)
      </p>
    </div>
  );
};

export default function CRAPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("Chargement...");
  // Ajout du nouvel onglet 'receivedCras'
  const [activeTab, setActiveTab] = useState("craManager"); // 'craManager', 'sentCraHistory', 'gestion', 'receivedCras'

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

      const activityTypesData = await fetchAndParse(
        "/api/activity_type",
        "types d'activité"
      );
      setActivityTypeDefinitions(activityTypesData);
      console.log(
        "CRAPage: >>> Définitions de types d'activité chargées (fetchData):",
        JSON.stringify(activityTypesData, null, 2)
      );

      const craActivitiesData = await fetchAndParse(
        `/api/cra_activities?userId=${currentUserId}`,
        "activités CRA"
      );
      setCraActivities(craActivitiesData);
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

  const handleAddActivityType = useCallback(
    async (typeData) => {
      try {
        const response = await fetch("/api/activity_type", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(typeData),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Échec de l'ajout du type d'activité"
          );
        }
        const newType = await response.json();
        setActivityTypeDefinitions((prevTypes) => [...prevTypes, newType]);
        showMessage("Type d'activité ajouté avec succès !", "success");
      } catch (error) {
        console.error("Erreur lors de l'ajout du type d'activité:", error);
        showMessage(
          `Erreur d'ajout de type d'activité: ${error.message}`,
          "error"
        );
      }
    },
    [showMessage]
  );

  const handleUpdateActivityType = useCallback(
    async (id, typeData) => {
      try {
        const response = await fetch(`/api/activity_type/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(typeData),
        });
        if (!response.ok) {
          if (response.status === 204) {
            console.log(
              "Type d'activité mis à jour avec succès (204 No Content)."
            );
          } else {
            const errorData = await response.json();
            throw new Error(
              errorData.message || "Échec de la mise à jour du type d'activité"
            );
          }
        }
        setActivityTypeDefinitions((prevTypes) =>
          prevTypes.map((type) =>
            type.id === id ? { ...type, ...typeData } : type
          )
        );
        showMessage("Type d'activité mis à jour avec succès !", "success");
      } catch (error) {
        console.error(
          "Erreur lors de la mise à jour du type d'activité:",
          error
        );
        showMessage(
          `Erreur de mise à jour de type d'activité: ${error.message}`,
          "error"
        );
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
        if (!response.ok) {
          if (response.status === 204) {
            console.log(
              "Type d'activité supprimé avec succès (204 No Content)."
            );
          } else {
            const errorData = await response.json();
            throw new Error(
              errorData.message || "Échec de la suppression du type d'activité"
            );
          }
        }
        setActivityTypeDefinitions((prevTypes) =>
          prevTypes.filter((type) => type.id !== id)
        );
        showMessage("Type d'activité supprimé avec succès !", "success");
      } catch (error) {
        console.error(
          "Erreur lors de la suppression du type d'activité:",
          error
        );
        showMessage(
          `Erreur de suppression de type d'activité: ${error.message}`,
          "error"
        );
      }
    },
    [showMessage]
  );

  const handleAddCraActivity = useCallback(
    async (activityData) => {
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

      const activityTypeId = String(activityData.type_activite);
      console.log(
        "CRAPage: handleAddCraActivity - ID de type d'activité reçu (string):",
        activityTypeId
      );
      console.log(
        "CRAPage: handleAddCraActivity - Définitions de types d'activité disponibles:",
        JSON.stringify(activityTypeDefinitions, null, 2)
      );

      const selectedActivityTypeDef = activityTypeDefinitions.find(
        (def) => String(def.id) === activityTypeId
      );

      let isOvertime = false; // Dérivé du type d'activité

      if (selectedActivityTypeDef) {
        isOvertime = selectedActivityTypeDef.is_overtime; // Utilise la propriété is_overtime du backend
      } else {
        console.error(
          "Type d'activité introuvable (frontend):",
          activityTypeId,
          "Définitions disponibles (frontend):",
          activityTypeDefinitions
        );
        showMessage("Type d'activité non valide ou inconnu.", "error");
        return;
      }

      // Validation "1 jour maximum"
      const totalTimeForDayExcludingOvertime = craActivities
        .filter(
          (activity) =>
            activity.user_id === currentUserId &&
            activity.date_activite === formattedDate &&
            activity.is_overtime !== true // Utilise la propriété is_overtime de l'activité existante
        )
        .reduce(
          (sum, activity) => sum + (parseFloat(activity.temps_passe) || 0),
          0
        );

      if (
        !isOvertime && // Si la nouvelle activité n'est PAS une heure supplémentaire
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

      let clientName = null;
      if (activityData.client_id && clientDefinitions.length > 0) {
        const clientObj = clientDefinitions.find(
          (c) => String(c.id) === String(activityData.client_id)
        );
        if (clientObj) {
          clientName = clientObj.nom_client || clientObj.name; // Utilise nom_client ou name
        }
      }

      try {
        const payload = {
          description_activite: activityData.description_activite,
          temps_passe: newActivityTime,
          date_activite: formattedDate,
          type_activite: activityTypeId, // ID du type
          // type_activite_name, is_billable, is_overtime, client_name seront dérivés par le backend
          override_non_working_day: activityData.override_non_working_day,
          user_id: currentUserId,
          client_id:
            activityData.client_id === ""
              ? null
              : String(activityData.client_id),
          status: activityData.status || "draft",
        };

        console.log(
          "CRAPage: Payload envoyé à l'API (POST /api/cra_activities):",
          JSON.stringify(payload, null, 2)
        );

        const response = await fetch("/api/cra_activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        console.log(
          "CRAPage: Réponse API brute (POST /api/cra_activities):",
          responseText
        );

        if (!response.ok) {
          let errorData = {};
          try {
            errorData = JSON.parse(responseText);
          } catch (e) {
            console.error(
              "CRAPage: Impossible de parser la réponse d'erreur comme JSON:",
              e
            );
          }
          throw new Error(
            errorData.message ||
              `Erreur serveur: ${response.statusText}` ||
              "Erreur lors de la création de l'activité CRA."
          );
        }
        const newCraActivity = JSON.parse(responseText);
        setCraActivities((prevActivities) => [
          ...prevActivities,
          newCraActivity,
        ]);
        showMessage("Activité CRA ajoutée avec succès !", "success");
      } catch (error) {
        console.error(
          "CRAPage: Erreur lors de l'ajout de l'activité CRA:",
          error
        );
        showMessage(`Erreur d'ajout d'activité CRA: ${error.message}`, "error");
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
    async (id, activityData) => {
      if (!currentUserId || currentUserId === "unauthenticated") {
        showMessage(
          "Veuillez vous connecter pour modifier des activités.",
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

      const updatedActivityTime = parseFloat(activityData.temps_passe) || 0;
      const activityTypeId = String(activityData.type_activite);
      const selectedActivityTypeDef = activityTypeDefinitions.find(
        (def) => String(def.id) === activityTypeId
      );

      let isOvertime = false; // Dérivé du type d'activité

      if (selectedActivityTypeDef) {
        isOvertime = selectedActivityTypeDef.is_overtime; // Utilise la propriété is_overtime du backend
      } else {
        console.error(
          "Type d'activité introuvable (frontend) lors de la mise à jour:",
          activityTypeId,
          "Définitions disponibles (frontend):",
          activityTypeDefinitions
        );
        showMessage(
          "Type d'activité non valide ou inconnu lors de la mise à jour.",
          "error"
        );
        return;
      }

      // Validation "1 jour maximum" pour la mise à jour
      const totalTimeForDayExcludingCurrentAndOvertime = craActivities
        .filter(
          (activity) =>
            activity.user_id === currentUserId &&
            activity.date_activite === formattedDate &&
            activity.id !== id && // Exclut l'activité en cours de modification
            activity.is_overtime !== true // Utilise la propriété is_overtime de l'activité existante
        )
        .reduce(
          (sum, activity) => sum + (parseFloat(activity.temps_passe) || 0),
          0
        );

      if (
        !isOvertime && // Si la nouvelle activité n'est PAS une heure supplémentaire
        totalTimeForDayExcludingCurrentAndOvertime + updatedActivityTime > 1
      ) {
        showMessage(
          `Le temps total pour le ${format(dateToFormat, "dd MMMM", {
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

      let clientName = null;
      if (activityData.client_id && clientDefinitions.length > 0) {
        const clientObj = clientDefinitions.find(
          (c) => String(c.id) === String(activityData.client_id)
        );
        if (clientObj) {
          clientName = clientObj.nom_client || clientObj.name;
        }
      }

      try {
        const payload = {
          id,
          description_activite: activityData.description_activite,
          temps_passe: updatedActivityTime,
          date_activite: formattedDate,
          type_activite: activityTypeId,
          // type_activite_name, is_billable, is_overtime, client_name seront dérivés par le backend
          override_non_working_day: activityData.override_non_working_day,
          user_id: currentUserId,
          client_id:
            activityData.client_id === ""
              ? null
              : String(activityData.client_id),
          status: activityData.status || "draft",
        };

        console.log(
          "CRAPage: Payload envoyé à l'API pour la mise à jour:",
          JSON.stringify(payload, null, 2)
        );

        const response = await fetch(
          `/api/cra_activities?id=${id}`, // Passe l'ID dans l'URL pour la route PUT
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        const responseText = await response.text();
        console.log(
          "CRAPage: Réponse API brute pour la mise à jour:",
          responseText
        );

        if (!response.ok) {
          let errorData = {};
          try {
            errorData = JSON.parse(responseText);
          } catch (e) {
            console.error(
              "CRAPage: Impossible de parser la réponse d'erreur comme JSON:",
              e
            );
          }
          throw new Error(
            errorData.message ||
              `Erreur serveur: ${response.statusText}` ||
              "Erreur lors de la modification de l'activité CRA."
          );
        }
        fetchData(); // Re-fetch all activities to update state
        showMessage("Activité CRA mise à jour avec succès !", "success");
      } catch (error) {
        console.error(
          "CRAPage: Erreur lors de la mise à jour de l'activité CRA:",
          error
        );
        showMessage(
          `Erreur de mise à jour d'activité CRA: ${error.message}`,
          "error"
        );
      }
    },
    [
      showMessage,
      currentUserId,
      craActivities,
      clientDefinitions,
      activityTypeDefinitions,
      fetchData,
    ]
  );

  const handleDeleteCraActivity = useCallback(
    async (id) => {
      if (!currentUserId || currentUserId === "unauthenticated") {
        showMessage(
          "Veuillez vous connecter pour supprimer des activités.",
          "error"
        );
        return;
      }
      try {
        const response = await fetch(`/api/cra_activities?id=${id}`, {
          // Passe l'ID dans l'URL
          method: "DELETE",
        });

        if (response.status === 204) {
          console.log("Activité CRA supprimée avec succès (204 No Content).");
        } else if (!response.ok) {
          let errorData = {};
          try {
            errorData = await response.json();
          } catch (e) {
            console.error(
              "CRAPage: Impossible de parser la réponse d'erreur comme JSON (DELETE):",
              e
            );
          }
          throw new Error(
            errorData.message ||
              `Erreur serveur: ${response.statusText}` ||
              "Échec de la suppression de l'activité CRA."
          );
        }
        fetchData(); // Re-fetch all activities to update state
        showMessage("Activité CRA supprimée avec succès !", "success");
      } catch (error) {
        console.error(
          "Erreur lors de la suppression de l'activité CRA:",
          error
        );
        showMessage(
          `Erreur de suppression d'activité CRA: ${error.message}`,
          "error"
        );
      }
    },
    [showMessage, currentUserId, fetchData]
  );

  const handleFinalizeMonth = useCallback(
    async (userId, year, month) => {
      try {
        // Simule l'appel API pour la finalisation
        console.log(
          `Finalisation du mois ${month}/${year} pour l'utilisateur ${userId}`
        );
        // Ici, vous feriez un appel à votre API backend pour finaliser le mois
        // Exemple:
        // const response = await fetch('/api/cra_finalize_month', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ userId, year, month }),
        // });
        // if (!response.ok) {
        //   const errorData = await response.json();
        //   throw new Error(errorData.message || 'Échec de la finalisation du mois.');
        // }
        // const result = await response.json();
        // console.log('Finalisation réussie:', result);

        showMessage("Mois finalisé avec succès (simulé) !", "success");
        fetchData(); // Re-fetch activities to update their status on the board
      } catch (error) {
        console.error("Erreur lors de la finalisation du mois:", error);
        showMessage(`Échec de la finalisation: ${error.message}`, "error");
      }
    },
    [showMessage, fetchData]
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
        <button
          onClick={() => setActiveTab("gestion")}
          className={`ml-2 px-6 py-3 rounded-t-lg font-semibold transition duration-300 ${
            activeTab === "gestion"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Gestion
        </button>
        {/* Nouveau bouton pour les CRAs reçus */}
        <button
          onClick={() => setActiveTab("receivedCras")}
          className={`ml-2 px-6 py-3 rounded-t-lg font-semibold transition duration-300 ${
            activeTab === "receivedCras"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          CRAs Reçus
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
          onFinalizeMonth={handleFinalizeMonth}
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
          onUpdateCraStatus={() => {}}
        />
      )}

      {activeTab === "gestion" && (
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
      )}

      {activeTab === "receivedCras" && (
        <ReceivedCraList
          currentUserId={currentUserId}
          showMessage={showMessage}
          // Vous passerez ici les props nécessaires pour la gestion des CRAs reçus
          // Ex: craActivities (filtrées pour les CRAs à valider), onUpdateCraStatus, etc.
        />
      )}

      <ToastMessage
        message={toastMessage.message}
        type={toastMessage.type}
        isVisible={toastMessage.isVisible}
        onClose={hideMessage}
      />
    </div>
  );
}
