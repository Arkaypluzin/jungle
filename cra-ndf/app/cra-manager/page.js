// app/cra-manager/page.js
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import CraBoard from "@/components/CraBoard";
import UnifiedManager from "@/components/UnifiedManager";
import ReceivedCras from "@/components/ReceivedCras";
import CraHistory from "@/components/CraHistory";
import OverviewBoard from "@/components/OverviewBoard"; // NOUVEAU : Import du composant OverviewBoard
import { startOfMonth, endOfMonth, format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import ConfirmationModal from "@/components/ConfirmationModal";

// Composant ToastMessage simplifié et inclus directement
const ToastMessage = ({ message, type, isVisible, onClose }) => {
  if (!isVisible) return null;

  const bgColor =
    {
      success: "bg-green-500",
      error: "bg-red-500",
      info: "bg-blue-500",
      warning: "bg-yellow-500",
    }[type] || "bg-gray-500";

  return (
    <div
      className={`fixed bottom-4 right-4 p-4 rounded-lg text-white shadow-lg ${bgColor} z-50`}
    >
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 font-bold">
        &times;
      </button>
    </div>
  );
};

export default function CRAPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [toastMessage, setToastMessage] = useState({
    message: "",
    type: "info",
    isVisible: false,
  });

  const showMessage = useCallback((message, type = "success") => {
    setToastMessage({ message, type, isVisible: true });
    setTimeout(() => {
      setToastMessage((prev) => ({ ...prev, isVisible: false }));
    }, 5000); // Masquer après 5 secondes
  }, []);

  const hideMessage = useCallback(() => {
    setToastMessage((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const [activeTab, setActiveTab] = useState("craManager");
  const [craActivities, setCraActivities] = useState([]); // Activités de l'utilisateur courant
  const [clientDefinitions, setClientDefinitions] = useState([]);
  const [activityTypeDefinitions, setActivityTypeDefinitions] = useState([]);
  const [loadingAppData, setLoadingAppData] = useState(true);
  const [monthlyReports, setMonthlyReports] = useState([]);

  const [error, setError] = useState(null);

  const [currentDisplayedMonth, setCurrentDisplayedMonth] = useState(
    new Date()
  );

  const currentUserId = status === "authenticated" ? session?.user?.id : null;
  const currentUserName =
    status === "authenticated"
      ? session?.user?.name || "Utilisateur Inconnu"
      : "Chargement...";

  console.log(
    "CRAPage: >>> currentUserName from session (IMPORTANT):",
    currentUserName,
    "Status:",
    status
  );

  const currentUserRole = session?.user?.roles?.[0] || "user";

  const [showDeleteReportConfirmModal, setShowDeleteReportConfirmModal] =
    useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);

  useEffect(() => {
    if (session) {
      console.log(
        "CRAPage: Full session object from useSession():",
        JSON.stringify(session, null, 2)
      );
    }
  }, [session]);

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

  const fetchCraActivitiesForMonth = useCallback(
    async (monthToFetch) => {
      console.log(
        "CRAPage: fetchCraActivitiesForMonth appelée. currentUserId:",
        currentUserId,
        "Mois à récupérer:",
        format(monthToFetch, "yyyy-MM")
      );
      if (!currentUserId) {
        setCraActivities([]);
        return [];
      }
      setError(null);

      try {
        const startDate = format(startOfMonth(monthToFetch), "yyyy-MM-dd");
        const endDate = format(endOfMonth(monthToFetch), "yyyy-MM-dd");

        const activitiesData = await fetchAndParse(
          `/api/cra_activities?userId=${currentUserId}&startDate=${startDate}&endDate=${endDate}`,
          "activités CRA"
        );
        const processedActivities = activitiesData
          .map((activity) => {
            let dateObj = null;
            if (typeof activity.date_activite === "string") {
              dateObj = parseISO(activity.date_activite);
            } else if (activity.date_activite) {
              dateObj = new Date(activity.date_activite);
            }
            return {
              ...activity,
              date_activite: isValid(dateObj) ? dateObj : null,
            };
          })
          .filter((activity) => activity.date_activite !== null);

        console.log(
          "CRAPage: Données d'activités CRA reçues (après API transformation et lookup):",
          JSON.stringify(processedActivities, null, 2)
        );
        setCraActivities(processedActivities);
        console.log(
          "CRAPage: >>> Activités CRA chargées (fetchCraActivitiesForMonth):",
          processedActivities.length,
          "activités. État craActivities mis à jour."
        );
        return processedActivities;
      } catch (err) {
        console.error(
          "CRAPage: Erreur lors du chargement des activités CRA:",
          err
        );
        showMessage(
          `Erreur de chargement des activités CRA: ${err.message}`,
          "error"
        );
        setCraActivities([]);
        throw err;
      }
    },
    [currentUserId, showMessage, fetchAndParse]
  );

  const fetchClients = useCallback(async () => {
    try {
      const clientsData = await fetchAndParse("/api/client", "clients");
      console.log(
        "CRAPage: Données brutes des clients reçues (après API transformation):",
        JSON.stringify(clientsData, null, 2)
      );

      clientsData.slice(0, 5).forEach((client, index) => {
        console.log(
          `CRAPage: Client ${index} ID:`,
          client.id,
          "Nom:",
          client.nom_client
        );
      });

      setClientDefinitions(clientsData);
      console.log(
        "CRAPage: >>> Définitions de clients chargées:",
        clientsData.length,
        "clients. État clientDefinitions mis à jour."
      );
      return clientsData;
    } catch (err) {
      console.error("CRAPage: Erreur lors du chargement des clients:", err);
      showMessage(`Erreur de chargement des clients: ${err.message}`, "error");
      setClientDefinitions([]);
      throw err;
    }
  }, [showMessage, fetchAndParse]);

  const fetchActivityTypes = useCallback(async () => {
    try {
      const activityTypesData = await fetchAndParse(
        "/api/activity_type",
        "types d'activité"
      );
      console.log(
        "CRAPage: Données brutes des types d'activité reçues (après API transformation):",
        JSON.stringify(activityTypesData, null, 2)
      );
      setActivityTypeDefinitions(activityTypesData);
      console.log(
        "CRAPage: >>> Définitions de types d'activité chargées:",
        activityTypesData.length,
        "types. État activityTypeDefinitions mis à jour."
      );
      activityTypesData.slice(0, 5).forEach((type, index) => {
        console.log(
          `CRAPage: Type d'activité ${index} ID:`,
          type.id,
          "Nom:",
          type.name
        );
      });
      return activityTypesData;
    } catch (err) {
      console.error(
        "CRAPage: Erreur lors du chargement des types d'activité:",
        err
      );
      showMessage(
        `Erreur de chargement des types d'activité: ${err.message}`,
        "error"
      );
      setActivityTypeDefinitions([]);
      throw err;
    }
  }, [showMessage, fetchAndParse]);

  const fetchMonthlyReportsForUser = useCallback(async () => {
    if (!currentUserId) {
      setMonthlyReports([]);
      return;
    }
    try {
      const queryParams = new URLSearchParams({ userId: currentUserId });
      const response = await fetch(
        `/api/monthly_cra_reports?${queryParams.toString()}`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Échec de la récupération des rapports mensuels."
        );
      }
      const data = await response.json();
      setMonthlyReports(data.data || []);
    } catch (err) {
      console.error(
        "CRAPage: Erreur lors de la récupération des rapports mensuels de l'utilisateur:",
        err
      );
      showMessage(
        `Erreur lors du chargement de vos rapports mensuels: ${err.message}`,
        "error"
      );
      setMonthlyReports([]);
    }
  }, [currentUserId, showMessage]);

  useEffect(() => {
    console.log(
      "CRAPage: useEffect principal déclenché. Status:",
      status,
      "UserId:",
      currentUserId
    );
    if (status === "loading") {
      setLoadingAppData(true);
      return;
    }

    const loadInitialData = async () => {
      setLoadingAppData(true);
      setError(null);
      try {
        if (status === "authenticated" && currentUserId) {
          await Promise.all([
            fetchClients(),
            fetchActivityTypes(),
            fetchMonthlyReportsForUser(),
          ]);
          // Seulement charger les activités de l'utilisateur si on est sur l'onglet craManager
          if (activeTab === "craManager") {
            await fetchCraActivitiesForMonth(currentDisplayedMonth);
          }
        } else {
          setClientDefinitions([]);
          setActivityTypeDefinitions([]);
          setCraActivities([]);
          setMonthlyReports([]);
        }
      } catch (err) {
        console.error(
          "CRAPage: Erreur lors du chargement initial des données:",
          err
        );
        setError(`Erreur de chargement des données: ${err.message}`);
        showMessage(
          `Erreur de chargement des données: ${err.message}`,
          "error"
        );
      } finally {
        setLoadingAppData(false);
      }
    };

    loadInitialData();
  }, [
    status,
    currentUserId,
    fetchClients,
    fetchActivityTypes,
    fetchCraActivitiesForMonth,
    fetchMonthlyReportsForUser,
    showMessage,
    currentDisplayedMonth,
    activeTab, // Ajout de activeTab comme dépendance
  ]);

  const handleAddCraActivity = useCallback(
    async (activityData) => {
      if (!currentUserId) {
        showMessage(
          "Veuillez vous connecter pour ajouter des activités.",
          "error"
        );
        throw new Error("Utilisateur non authentifié ou ID non disponible.");
      }
      try {
        const payload = {
          ...activityData,
          user_id: currentUserId,
          date_activite: activityData.date_activite
            ? format(activityData.date_activite, "yyyy-MM-dd")
            : null,
        };
        console.log(
          "CRAPage: handleAddCraActivity - Payload envoyé:",
          JSON.stringify(payload, null, 2)
        );
        const response = await fetch("/api/cra_activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(
            "CRAPage: Erreur API lors de la création de l'activité:",
            errorData
          );
          throw new Error(
            errorData.message ||
              `Erreur serveur: ${response.statusText}` ||
              "Erreur lors de la création de l'activité CRA."
          );
        }
        const newActivity = await response.json();
        console.log(
          "CRAPage: Activité CRA créée avec succès (réponse API brute):",
          newActivity
        );
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
        await fetchMonthlyReportsForUser();
        showMessage("Activité ajoutée avec succès !", "success");
        return newActivity;
      } catch (error) {
        console.error(
          "CRAPage: Échec de la création de l'activité CRA:",
          error
        );
        showMessage(
          `Échec de la création de l'activité: ${error.message}`,
          "error"
        );
        throw error;
      }
    },
    [
      showMessage,
      currentUserId,
      fetchCraActivitiesForMonth,
      currentDisplayedMonth,
      fetchMonthlyReportsForUser,
    ]
  );

  const handleUpdateCraActivity = useCallback(
    async (id, activityData) => {
      if (!currentUserId) {
        showMessage(
          "Veuillez vous connecter pour modifier des activités.",
          "error"
        );
        throw new Error("Utilisateur non authentifié ou ID non disponible.");
      }
      try {
        const payload = {
          ...activityData,
          user_id: currentUserId,
          date_activite: activityData.date_activite
            ? format(activityData.date_activite, "yyyy-MM-dd")
            : null,
        };
        console.log(
          "CRAPage: handleUpdateCraActivity - Payload envoyé:",
          JSON.stringify(payload, null, 2)
        );
        const response = await fetch(`/api/cra_activities/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(
            "CRAPage: Erreur API lors de la mise à jour de l'activité:",
            errorData
          );
          throw new Error(
            errorData.message ||
              `Erreur serveur: ${response.statusText}` ||
              "Erreur lors de la mise à jour de l'activité CRA."
          );
        }
        const updatedActivity = await response.json();
        console.log(
          "CRAPage: Activité CRA mise à jour avec succès (réponse API brute):",
          updatedActivity
        );
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
        await fetchMonthlyReportsForUser();
        showMessage("Activité mise à jour avec succès !", "success");
        return updatedActivity;
      } catch (error) {
        console.error(
          "CRAPage: Échec de la mise à jour de l'activité CRA:",
          error
        );
        showMessage(
          `Échec de la mise à jour de l'activité: ${error.message}`,
          "error"
        );
        throw error;
      }
    },
    [
      showMessage,
      currentUserId,
      fetchCraActivitiesForMonth,
      currentDisplayedMonth,
      fetchMonthlyReportsForUser,
    ]
  );

  const handleDeleteActivity = useCallback(
    async (id) => {
      if (!currentUserId) {
        showMessage(
          "Veuillez vous connecter pour supprimer des activités.",
          "error"
        );
        throw new Error("Utilisateur non authentifié ou ID non disponible.");
      }
      try {
        console.log(
          `CRAPage: handleDeleteActivity - Tentative de suppression de l'ID: ${id}`
        );
        const response = await fetch(`/api/cra_activities/${id}`, {
          method: "DELETE",
        });

        // NOUVEAU BLOC DE GESTION DES RÉPONSES
        if (response.ok) {
          // Vérifie tous les statuts 2xx (ex: 200, 204)
          if (response.status === 204) {
            showMessage("Activité supprimée avec succès !", "success");
          } else {
            // Si c'est OK (ex: 200) mais pas 204, essaie de parser JSON (si l'API renvoie un message)
            const responseData = await response.json();
            showMessage(
              responseData.message || "Activité supprimée avec succès !",
              "success"
            );
          }
          await fetchCraActivitiesForMonth(currentDisplayedMonth);
          await fetchMonthlyReportsForUser();
        } else {
          // Gère les réponses non-2xx (erreurs comme 400, 401, 404, 500 etc.)
          const contentType = response.headers.get("content-type");
          let errorData = {};
          if (contentType && contentType.includes("application/json")) {
            try {
              errorData = await response.json();
            } catch (jsonError) {
              // Fallback si le Content-Type est JSON mais le corps est malformé
              errorData.message = await response.text();
            }
          } else {
            // Si le Content-Type n'est pas JSON, utilise le texte brut
            errorData.message = await response.text();
          }
          console.error(
            "CRAPage: Erreur API lors de la suppression de l'activité:",
            errorData
          );
          throw new Error(
            errorData.message ||
              `Erreur serveur: ${response.statusText}` ||
              "Échec de la suppression de l'activité CRA."
          );
        }
      } catch (error) {
        console.error("CRAPage: Erreur lors de la suppression:", error);
        showMessage(`Échec de la suppression: ${error.message}`, "error");
        throw error;
      }
    },
    [
      showMessage,
      currentUserId,
      fetchCraActivitiesForMonth,
      currentDisplayedMonth,
      fetchMonthlyReportsForUser,
    ]
  );
  const handleSendMonthlyReport = useCallback(
    async (reportData) => {
      if (!currentUserId) {
        showMessage(
          "Veuillez vous connecter pour envoyer des rapports.",
          "error"
        );
        throw new Error("Utilisateur non authentifié ou ID non disponible.");
      }
      try {
        console.log(
          "CRAPage: handleSendMonthlyReport - Payload envoyé:",
          JSON.stringify(reportData, null, 2)
        );
        const response = await fetch("/api/monthly_cra_reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reportData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(
            "CRAPage: Erreur API lors de l'envoi du rapport mensuel:",
            errorData
          );
          throw new Error(
            errorData.message ||
              `Erreur serveur: ${response.statusText}` ||
              "Échec de l'envoi du rapport mensuel."
          );
        }

        const result = await response.json();
        console.log("CRAPage: Rapport mensuel envoyé avec succès:", result);

        await fetchCraActivitiesForMonth(currentDisplayedMonth);
        await fetchMonthlyReportsForUser();
        showMessage(
          `Rapport de type "${reportData.report_type}" envoyé avec succès !`,
          "success"
        );
        return result;
      } catch (error) {
        console.error("CRAPage: Échec de l'envoi du rapport mensuel:", error);
        showMessage(`Échec de l'envoi du rapport: ${error.message}`, "error");
        throw error;
      }
    },
    [
      showMessage,
      currentUserId,
      fetchCraActivitiesForMonth,
      currentDisplayedMonth,
      fetchMonthlyReportsForUser,
    ]
  );

  // NOUVELLE FONCTION : Supprimer un rapport mensuel et ses activités associées
  const handleDeleteMonthlyReport = useCallback(
    async (report) => {
      if (!currentUserId) {
        showMessage(
          "Veuillez vous connecter pour supprimer des rapports.",
          "error"
        );
        return;
      }
      if (!report || !report.id) {
        showMessage("Rapport invalide pour la suppression.", "error");
        return;
      }

      try {
        console.log(`CRAPage: Suppression du rapport mensuel ID: ${report.id}`);
        const reportResponse = await fetch(
          `/api/monthly_cra_reports/${report.id}`,
          {
            method: "DELETE",
          }
        );

        if (reportResponse.status === 204) {
          showMessage(
            "Rapport mensuel et activités associées supprimés avec succès !",
            "success"
          );
          await fetchCraActivitiesForMonth(currentDisplayedMonth);
          await fetchMonthlyReportsForUser();
          return;
        } else if (!reportResponse.ok) {
          const contentType = reportResponse.headers.get("content-type");
          let errorData = {};
          if (contentType && contentType.includes("application/json")) {
            errorData = await reportResponse.json();
          } else {
            errorData.message = await reportResponse.text();
          }
          console.error(
            "CRAPage: Erreur API lors de la suppression du rapport mensuel:",
            errorData
          );
          throw new Error(
            errorData.message ||
              `Erreur serveur: ${reportResponse.statusText}` ||
              "Échec de la suppression du rapport mensuel."
          );
        }
        showMessage(
          "Opération de suppression terminée avec succès (statut non 204) !",
          "success"
        );
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
        await fetchMonthlyReportsForUser();
      } catch (error) {
        console.error(
          "CRAPage: Échec complet de la suppression du rapport mensuel:",
          error
        );
        showMessage(
          `Échec de la suppression du rapport: ${error.message}`,
          "error"
        );
      } finally {
        setShowDeleteReportConfirmModal(false);
        setReportToDelete(null);
      }
    },
    [
      currentUserId,
      showMessage,
      fetchCraActivitiesForMonth,
      currentDisplayedMonth,
      fetchMonthlyReportsForUser,
    ]
  );

  const handleAddClient = useCallback(
    async (clientData) => {
      try {
        console.log(
          "CRAPage: handleAddClient - Données à envoyer (avant fetch):",
          JSON.stringify(clientData, null, 2)
        );
        const res = await fetch("/api/client", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientData),
        });

        console.log(
          `CRAPage: handleAddClient - Réponse API statut: ${res.status}`
        );
        if (!res.ok) {
          const errorData = await res.json();
          console.error("CRAPage: handleAddClient - Erreur API:", errorData);
          throw new Error(
            errorData.message || `Erreur serveur: ${res.statusText}`
          );
        }
        showMessage("Client ajouté avec succès !", "success");
        await fetchClients();
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
      } catch (error) {
        console.error("CRAPage: Erreur lors de l'ajout du client:", error);
        showMessage(`Échec de l'ajout du client: ${error.message}`, "error");
      }
    },
    [
      fetchClients,
      showMessage,
      fetchCraActivitiesForMonth,
      currentDisplayedMonth,
    ]
  );

  const handleUpdateClient = useCallback(
    async (id, clientData) => {
      console.log(
        `CRAPage: handleUpdateClient - ID reçu: ${id}, Données:`,
        clientData
      );
      if (!id) {
        showMessage(
          "Erreur: ID du client manquant pour la mise à jour.",
          "error"
        );
        console.error(
          "CRAPage: ID du client est undefined lors de la mise à jour."
        );
        return;
      }
      try {
        const res = await fetch(`/api/client/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientData),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.message || `Erreur serveur: ${res.statusText}`
          );
        }
        showMessage("Client mis à jour avec succès !", "success");
        await fetchClients();
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
      } catch (error) {
        console.error(
          "CRAPage: Erreur lors de la mise à jour du client:",
          error
        );
        showMessage(
          `Échec de la mise à jour du client: ${error.message}`,
          "error"
        );
      }
    },
    [
      fetchClients,
      fetchCraActivitiesForMonth,
      showMessage,
      currentDisplayedMonth,
    ]
  );

  const handleDeleteClient = useCallback(
    async (id) => {
      console.log(`CRAPage: handleDeleteClient - ID reçu: ${id}`);
      if (!id) {
        showMessage(
          "Erreur: ID du client manquant pour la suppression.",
          "error"
        );
        console.error(
          "CRAPage: ID du client est undefined lors de la suppression."
        );
        return;
      }
      try {
        const res = await fetch(`/api/client/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.message || `Erreur serveur: ${res.statusText}`
          );
        }
        showMessage("Client supprimé avec succès !", "success");
        await fetchClients();
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
      } catch (error) {
        console.error("CRAPage: Échec de la suppression du client:", error);
        showMessage(
          `Échec de la suppression du client: ${error.message}`,
          "error"
        );
      }
    },
    [
      fetchClients,
      fetchCraActivitiesForMonth,
      showMessage,
      currentDisplayedMonth,
    ]
  );

  const handleAddActivityType = useCallback(
    async (typeData) => {
      try {
        const res = await fetch("/api/activity_type", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(typeData),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.message || `Erreur serveur: ${res.statusText}`
          );
        }
        showMessage("Type d'activité ajouté avec succès !", "success");
        await fetchActivityTypes();
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
      } catch (error) {
        console.error(
          "CRAPage: Erreur lors de l'ajout du type d'activité:",
          error
        );
        showMessage(
          `Échec de l'ajout du type d'activité: ${error.message}`,
          "error"
        );
      }
    },
    [
      fetchActivityTypes,
      showMessage,
      fetchCraActivitiesForMonth,
      currentDisplayedMonth,
    ]
  );

  const handleUpdateActivityType = useCallback(
    async (id, typeData) => {
      try {
        console.log(
          `CRAPage: handleUpdateActivityType - ID: ${id}, Données:`,
          typeData
        );
        const res = await fetch(`/api/activity_type/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(typeData),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.message || `Erreur serveur: ${res.statusText}`
          );
        }
        showMessage("Type d'activité mis à jour avec succès !", "success");
        await fetchActivityTypes();
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
      } catch (error) {
        console.error(
          "CRAPage: Erreur lors de la mise à jour du type d'activité:",
          error
        );
        showMessage(
          `Échec de la mise à jour du type d'activité: ${error.message}`,
          "error"
        );
      }
    },
    [
      fetchActivityTypes,
      fetchCraActivitiesForMonth,
      showMessage,
      currentDisplayedMonth,
    ]
  );

  const handleDeleteActivityType = useCallback(
    async (id) => {
      try {
        const res = await fetch(`/api/activity_type/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.message || `Erreur serveur: ${res.statusText}`
          );
        }
        showMessage("Type d'activité supprimé avec succès !", "success");
        await fetchActivityTypes();
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
      } catch (error) {
        console.error(
          "CRAPage: Échec de la suppression du type d'activité:",
          error
        );
        showMessage(
          `Échec de la suppression du type d'activité: ${error.message}`,
          "error"
        );
      }
    },
    [
      fetchActivityTypes,
      fetchCraActivitiesForMonth,
      showMessage,
      currentDisplayedMonth,
    ]
  );

  const requestDeleteReportConfirmation = useCallback((report) => {
    setReportToDelete(report);
    setShowDeleteReportConfirmModal(true);
  }, []);

  const cancelDeleteReportConfirmation = useCallback(() => {
    setReportToDelete(null);
    setShowDeleteReportConfirmModal(false);
  }, []);

  const confirmDeleteReportAction = useCallback(() => {
    if (reportToDelete) {
      handleDeleteMonthlyReport(reportToDelete);
    }
  }, [reportToDelete, handleDeleteMonthlyReport]);

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen text-xl text-gray-700">
        Chargement des données de session et de l'application...
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/api/auth/signin");
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <p className="text-xl text-red-600 mb-4">
          Redirection vers la page de connexion...
        </p>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">Erreur: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200 flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Retour
          </button>
        </div>

        <div className="flex justify-center mb-8">
          <button
            onClick={() => setActiveTab("craManager")}
            className={`px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${
              activeTab === "craManager"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Mon CRA
          </button>
          <button
            onClick={() => setActiveTab("sentCraHistory")}
            className={`ml-4 px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${
              activeTab === "sentCraHistory"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Historique des CRAs envoyés
          </button>

          <div className="border-l-2 border-indigo-600 mx-6 h-auto self-stretch"></div>

          <button
            onClick={() => setActiveTab("gestion")}
            className={`px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${
              activeTab === "gestion"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            Gestion
          </button>
          <button
            onClick={() => setActiveTab("receivedCras")}
            className={`ml-4 px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${
              activeTab === "receivedCras"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            CRAs Reçus
          </button>
          {/* NOUVEAU BOUTON POUR L'ONGLET "VUE D'ENSEMBLE" */}
          <button
            onClick={() => setActiveTab("overview")}
            className={`ml-4 px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${
              activeTab === "overview"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            Vue d'ensemble
          </button>
        </div>

        {activeTab === "craManager" && (
          <CraBoard
            userId={currentUserId}
            userFirstName={currentUserName}
            activities={craActivities}
            activityTypeDefinitions={activityTypeDefinitions}
            clientDefinitions={clientDefinitions}
            onAddActivity={handleAddCraActivity}
            onUpdateActivity={handleUpdateCraActivity}
            onDeleteActivity={handleDeleteActivity}
            fetchActivitiesForMonth={fetchCraActivitiesForMonth}
            showMessage={showMessage}
            currentMonth={currentDisplayedMonth}
            onMonthChange={setCurrentDisplayedMonth}
            monthlyReports={monthlyReports}
            onSendMonthlyReport={handleSendMonthlyReport}
          />
        )}

        {activeTab === "sentCraHistory" && (
          <CraHistory
            userId={currentUserId}
            userFirstName={currentUserName}
            showMessage={showMessage}
            clientDefinitions={clientDefinitions}
            activityTypeDefinitions={activityTypeDefinitions}
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
          <ReceivedCras
            userId={currentUserId}
            userFirstName={currentUserName}
            userRole={currentUserRole}
            showMessage={showMessage}
            clientDefinitions={clientDefinitions}
            activityTypeDefinitions={activityTypeDefinitions}
            monthlyReports={monthlyReports}
            onDeleteMonthlyReport={requestDeleteReportConfirmation}
          />
        )}

        {/* NOUVEAU : Rendu conditionnel du composant OverviewBoard */}
        {activeTab === "overview" && (
          <OverviewBoard
            activityTypeDefinitions={activityTypeDefinitions}
            clientDefinitions={clientDefinitions}
            showMessage={showMessage}
            userRole={currentUserRole} // Passe le rôle pour la gestion des accès
          />
        )}
      </div>

      <ToastMessage
        message={toastMessage.message}
        type={toastMessage.type}
        isVisible={toastMessage.isVisible}
        onClose={hideMessage}
      />

      {showDeleteReportConfirmModal && reportToDelete && (
        <ConfirmationModal
          isOpen={showDeleteReportConfirmModal}
          onClose={cancelDeleteReportConfirmation}
          onConfirm={confirmDeleteReportAction}
          message={`Êtes-vous sûr de vouloir supprimer le rapport de ${
            reportToDelete.userName
          } pour ${format(
            new Date(reportToDelete.year, reportToDelete.month - 1),
            "MMMM yyyy",
            { locale: fr }
          )} ? Cela supprimera également toutes les activités associées à ce rapport. Cette action est irréversible.`}
        />
      )}
    </div>
  );
}
