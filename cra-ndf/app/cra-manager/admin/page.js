// app/cra-manager/admin/page.js
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CraBoard from "@/components/cra/Board/CraBoard";
import UnifiedManager from "@/components/cra/Tools/UnifiedManager";
import ReceivedCras from "@/components/cra/Tools/ReceivedCras";
import CraHistory from "@/components/cra/Reports/CraHistory";
import OverviewBoard from "@/components/cra/Tools/OverviewBoard";
import DetailedCraReportModal from "@/components/cra/Reports/DetailedCraReportModal";
import {
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
  isValid,
  eachDayOfInterval,
  getDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import ConfirmationModal from "@/components/cra/Modals/ConfirmationModal";

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

export default function AdminCRAPage() {
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
    }, 5000);
  }, []);

  const hideMessage = useCallback(() => {
    setToastMessage((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const [activeTab, setActiveTab] = useState("overview");
  const [craActivities, setCraActivities] = useState([]);
  const [clientDefinitions, setClientDefinitions] = useState([]);
  const [activityTypeDefinitions, setActivityTypeDefinitions] = useState([]);
  const [loadingAppData, setLoadingAppData] = useState(true);
  const [monthlyReports, setMonthlyReports] = useState([]);

  const [error, setError] = useState(null);

  const [currentDisplayedMonth, setCurrentDisplayedMonth] = useState(
    new Date()
  );

  const [showDetailedReportModal, setShowDetailedReportModal] = useState(false);
  const [detailedReportData, setDetailedReportData] = useState(null);

  const currentUserId = status === "authenticated" ? session?.user?.id : null;
  const currentUserName =
    status === "authenticated"
      ? session?.user?.name || "Administrateur Inconnu"
      : "Chargement...";

  const currentUserRole = session?.user?.roles?.[0] || "user";

  const [showDeleteReportConfirmModal, setShowDeleteReportConfirmModal] =
    useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);

  useEffect(() => {
    if (session) {
      console.log(
        "AdminCRAPage: Full session object from useSession():",
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
          errorInfo += ` - Message API: ${errorData.message || JSON.stringify(errorData)
            }`;
        } catch (jsonParseError) {
          errorInfo += ` - Réponse non-JSON ou invalide (début): "${rawText.substring(
            0,
            200
          )}..."`;
        }
      } catch (textError) { }
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
        "AdminCRAPage: fetchCraActivitiesForMonth appelée. currentUserId:",
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
            const dureeJoursValue = parseFloat(activity.duree_jours || activity.temps_passe);
            console.log(`AdminCRAPage: Activity ID ${activity.id} - original duree_jours: ${activity.duree_jours}, parsed: ${dureeJoursValue}`);
            return {
              ...activity,
              date_activite: isValid(dateObj) ? dateObj : null,
              duree_jours: isNaN(dureeJoursValue) ? 0 : dureeJoursValue,
            };
          })
          .filter((activity) => activity.date_activite !== null);

        console.log("AdminCRAPage: Processed activities for month:", format(monthToFetch, "yyyy-MM"), processedActivities);
        setCraActivities(processedActivities);
        return processedActivities;
      } catch (err) {
        console.error(
          "AdminCRAPage: Erreur lors du chargement des activités CRA:",
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
      setClientDefinitions(clientsData);
      return clientsData;
    } catch (err) {
      console.error(
        "AdminCRAPage: Erreur lors du chargement des clients:",
        err
      );
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
      setActivityTypeDefinitions(activityTypesData);
      return activityTypesData;
    } catch (err) {
      console.error(
        "AdminCRAPage: Erreur lors du chargement des types d'activité:",
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
      console.log("AdminCRAPage: Rapports mensuels bruts de l'API:", data.data);

      const processedReports = (data.data || []).map(report => {
        let normalizedReport = { ...report };
        if (normalizedReport.status === "rejected") {
          let reasonValue = normalizedReport.rejectionReason || normalizedReport.rejection_reason;
          if (reasonValue === "nul") { // Convertir la chaîne "nul" en null
            reasonValue = null;
          }
          // Assigner la raison normalisée à la propriété snake_case pour la cohérence
          normalizedReport.rejection_reason = reasonValue;
          // Assurer que la propriété camelCase est également cohérente si elle est la source primaire
          if (normalizedReport.rejectionReason && normalizedReport.rejectionReason !== reasonValue) {
            normalizedReport.rejectionReason = reasonValue;
          }
        } else {
          // Si le rapport n'est pas rejeté, s'assurer qu'aucune raison de rejet n'est présente
          normalizedReport.rejection_reason = null;
          normalizedReport.rejectionReason = null;
        }
        return normalizedReport;
      });
      console.log("AdminCRAPage: Rapports mensuels normalisés pour l'état:", processedReports);
      setMonthlyReports(processedReports);
    }
    catch (err) {
      console.error(
        "AdminCRAPage: Erreur lors de la récupération des rapports mensuels de l'utilisateur:",
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
            fetchMonthlyReportsForUser(), // Assurez-vous que cette fonction est appelée
          ]);
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
          "AdminCRAPage: Erreur lors du chargement initial des données:",
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
    activeTab,
    currentUserRole,
    router,
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
          duree_jours: parseFloat(activityData.duree_jours) || 0, // Ensure it's a number on add
        };
        const response = await fetch("/api/cra_activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message ||
            `Erreur serveur: ${response.statusText}` ||
            "Erreur lors de la création de l'activité CRA."
          );
        }
        const newActivity = await response.json();
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
        await fetchMonthlyReportsForUser();
        showMessage("Activité ajoutée avec succès !", "success");
        return newActivity;
      } catch (error) {
        console.error(
          "AdminCRAPage: Échec de la création de l'activité CRA:",
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
          duree_jours: parseFloat(activityData.duree_jours) || 0, // Ensure it's a number on update
        };
        const response = await fetch(`/api/cra_activities/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message ||
            `Erreur serveur: ${response.statusText}` ||
            "Erreur lors de la mise à jour de l'activité CRA."
          );
        }
        const updatedActivity = await response.json();
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
        await fetchMonthlyReportsForUser();
        showMessage("Activité mise à jour avec succès !", "success");
        return updatedActivity;
      } catch (error) {
        console.error(
          "AdminCRAPage: Échec de la mise à jour de l'activité CRA:",
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
        const response = await fetch(`/api/cra_activities/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          if (response.status === 204) {
            showMessage("Activité supprimée avec succès !", "success");
          } else {
            const responseData = await response.json();
            showMessage(
              responseData.message || "Activité supprimée avec succès !",
              "success"
            );
          }
          await fetchCraActivitiesForMonth(currentDisplayedMonth);
          await fetchMonthlyReportsForUser();
        } else {
          const contentType = response.headers.get("content-type");
          let errorData = {};
          if (contentType && contentType.includes("application/json")) {
            try {
              errorData = await response.json();
            } catch (jsonError) {
              errorData.message = await response.text();
            }
          } else {
            errorData.message = await response.text();
          }
          throw new Error(
            errorData.message ||
            `Erreur serveur: ${response.statusText}` ||
            "Échec de la suppression de l'activité CRA."
          );
        }
      } catch (error) {
        console.error("AdminCRAPage: Erreur lors de la suppression:", error);
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
        // Ensure activities is an array before mapping
        const activitiesToSend = Array.isArray(reportData.activities)
          ? reportData.activities.map(act => ({
            ...act,
            duree_jours: parseFloat(act.duree_jours) || 0 // Ensure numeric
          }))
          : []; // Default to empty array if not an array

        const payload = {
          ...reportData,
          activities: activitiesToSend,
        };
        const response = await fetch("/api/monthly_cra_reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message ||
            `Erreur serveur: ${response.statusText}` ||
            "Échec de l'envoi du rapport mensuel."
          );
        }

        const result = await response.json();
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
        await fetchMonthlyReportsForUser();
        showMessage(
          `Rapport de type "${reportData.report_type}" envoyé avec succès !`,
          "success"
        );
        return result;
      } catch (error) {
        console.error(
          "AdminCRAPage: Échec de l'envoi du rapport mensuel:",
          error
        );
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
          "AdminCRAPage: Échec complet de la suppression du rapport mensuel:",
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
        const res = await fetch("/api/client", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientData),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.message || `Erreur serveur: ${res.statusText}`
          );
        }
        showMessage("Client ajouté avec succès !", "success");
        await fetchClients();
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
      } catch (error) {
        console.error("AdminCRAPage: Erreur lors de l'ajout du client:", error);
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
      if (!id) {
        showMessage(
          "Erreur: ID du client manquant pour la mise à jour.",
          "error"
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
          "AdminCRAPage: Erreur lors de la mise à jour du client:",
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
      if (!id) {
        showMessage(
          "Erreur: ID du client manquant pour la suppression.",
          "error"
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
        console.error(
          "AdminCRAPage: Échec de la suppression du client:",
          error
        );
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
          "AdminCRAPage: Erreur lors de l'ajout du type d'activité:",
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
          "AdminCRAPage: Erreur lors de la mise à jour du type d'activité:",
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
          "AdminCRAPage: Échec de la suppression du type d'activité:",
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

  // NOUVELLE FONCTION: Préparer et afficher le rapport détaillé
  const handleShowDetailedReport = useCallback(() => {
    // Calculer les totaux pour le mois affiché
    const totalActivitiesTime = craActivities.reduce(
      (sum, activity) => sum + (parseFloat(activity.duree_jours) || 0), // Assurez-vous que duree_jours est un nombre
      0
    );

    // Calculer les jours ouvrés du mois (nombre de jours du lundi au vendredi)
    const start = startOfMonth(currentDisplayedMonth);
    const end = endOfMonth(currentDisplayedMonth);
    const allDaysInMonth = eachDayOfInterval({ start, end });
    const totalWorkingDays = allDaysInMonth.filter((day) => {
      const dayOfWeek = getDay(day); // Dimanche = 0, Lundi = 1, ..., Samedi = 6
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Lundi (1) à Vendredi (5)
    }).length;

    // Nouvelle métrique: Jours ouvrés travaillés (somme des duree_jours pour les activités sur jours ouvrés)
    const totalWorkingDaysActivitiesTime = craActivities.reduce((sum, activity) => {
      const dateObj = isValid(activity.date_activite) ? activity.date_activite : parseISO(activity.date_activite);
      if (isValid(dateObj)) {
        const dayOfWeek = getDay(dateObj);
        if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Lundi à Vendredi
          return sum + (parseFloat(activity.duree_jours) || 0);
        }
      }
      return sum;
    }, 0);

    // Nouvelle métrique: Total des jours de congés payés dans le mois
    const totalPaidLeaveDaysInMonth = craActivities.reduce((sum, activity) => {
      // Pour cette métrique, on devrait vérifier le type d'activité, pas le report_type qui est une prop de rapport
      // Il faut trouver l'ID du type "Congé Payé"
      const paidLeaveType = activityTypeDefinitions.find(
        (type) => type.name && type.name.toLowerCase().includes("congé payé")
      );
      if (paidLeaveType && String(activity.type_activite) === String(paidLeaveType.id)) {
        return sum + (parseFloat(activity.duree_jours) || 0);
      }
      return sum;
    }, 0);


    const timeDifferenceValue = (
      totalActivitiesTime - totalWorkingDays
    ).toFixed(2);

    console.log("AdminCRAPage: Data for Detailed Report Modal:");
    console.log("  craActivities (before passing):", craActivities);
    console.log("  totalActivitiesTime (calculated):", totalActivitiesTime);
    console.log("  totalWorkingDays (calculated):", totalWorkingDays);
    console.log("  totalWorkingDaysActivitiesTime (calculated):", totalWorkingDaysActivitiesTime);
    console.log("  totalPaidLeaveDaysInMonth (calculated):", totalPaidLeaveDaysInMonth);
    console.log("  timeDifferenceValue (calculated):", timeDifferenceValue);
    console.log("  currentMonth:", currentDisplayedMonth);

    setDetailedReportData({
      activities: craActivities,
      clientDefinitions,
      activityTypeDefinitions,
      totalWorkingDaysInMonth: totalWorkingDays, // Total working days in month (count)
      totalActivitiesTimeInMonth: totalActivitiesTime, // Total activities time (all days)
      totalWorkingDaysActivitiesTime: totalWorkingDaysActivitiesTime, // New: Total activities time on working days
      totalPaidLeaveDaysInMonth: totalPaidLeaveDaysInMonth, // New: Total paid leave days
      timeDifference: timeDifferenceValue,
      currentMonth: currentDisplayedMonth,
      userName: currentUserName,
    });
    setShowDetailedReportModal(true);
  }, [
    craActivities,
    clientDefinitions,
    activityTypeDefinitions,
    currentDisplayedMonth,
    currentUserName,
  ]);

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen text-xl text-gray-700">
        Chargement des données de session et de l&apos;application...
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

        <div className="flex justify-center mb-8 space-x-4">
          <button
            onClick={() => setActiveTab("craManager")}
            className={`px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${activeTab === "craManager"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            Mon CRA
          </button>
          <button
            onClick={() => setActiveTab("sentCraHistory")}
            className={`ml-4 px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${activeTab === "sentCraHistory"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            Historique des CRAs envoyés
          </button>

          <div className="border-l-2 border-indigo-600 mx-6 h-auto self-stretch"></div>

          <button
            onClick={() => setActiveTab("receivedCras")}
            className={`px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${activeTab === "receivedCras"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            CRAs Reçus
          </button>
          <button
            onClick={() => setActiveTab("overview")}
            className={`ml-4 px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${activeTab === "overview"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            Vue d&apos;ensemble
          </button>
          <button
            onClick={() => setActiveTab("unifiedManager")}
            className={`ml-4 px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${activeTab === "unifiedManager"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            Gestion Unifiée
          </button>
        </div>

        {activeTab === "craManager" && (
          <CraBoard
            userId={currentUserId}
            userFirstName={currentUserName}
            currentMonth={currentDisplayedMonth}
            onMonthChange={setCurrentDisplayedMonth}
            activities={craActivities}
            activityTypeDefinitions={activityTypeDefinitions}
            clientDefinitions={clientDefinitions}
            onAddActivity={handleAddCraActivity}
            onUpdateActivity={handleUpdateCraActivity}
            onDeleteActivity={handleDeleteActivity}
            fetchActivitiesForMonth={fetchCraActivitiesForMonth}
            showMessage={showMessage}
            monthlyReports={monthlyReports} // Passe les rapports normalisés
            onSendMonthlyReport={handleSendMonthlyReport}
          // Pas de prop 'rejectionReason' directe ici, elle est gérée par monthlyReports
          />
        )}

        {activeTab === "sentCraHistory" && (
          <CraHistory
            userId={currentUserId}
            userFirstName={currentUserName}
            showMessage={showMessage}
            monthlyReports={monthlyReports}
            clientDefinitions={clientDefinitions}
            activityTypeDefinitions={activityTypeDefinitions}
            onDeleteMonthlyReport={requestDeleteReportConfirmation}
            onShowDetailedReport={handleShowDetailedReport}
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
            monthlyReports={monthlyReports} // Passe les rapports normalisés pour le filtre initial
            onDeleteMonthlyReport={requestDeleteReportConfirmation}
          />
        )}

        {activeTab === "overview" && (
          <OverviewBoard
            activityTypeDefinitions={activityTypeDefinitions}
            clientDefinitions={clientDefinitions}
            showMessage={showMessage}
            userRole={currentUserRole}
          />
        )}

        {activeTab === "unifiedManager" && (
          <UnifiedManager
            clientDefinitions={clientDefinitions}
            activityTypeDefinitions={activityTypeDefinitions}
            onAddClient={handleAddClient}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
            onAddActivityType={handleAddActivityType}
            onUpdateActivityType={handleUpdateActivityType}
            onDeleteActivityType={handleDeleteActivityType}
            showMessage={showMessage}
          />
        )}
      </div>

      <ToastMessage {...toastMessage} onClose={hideMessage} />

      {showDeleteReportConfirmModal && reportToDelete && (
        <ConfirmationModal
          isOpen={showDeleteReportConfirmModal}
          onClose={cancelDeleteReportConfirmation}
          onConfirm={confirmDeleteReportAction}
          message={`Êtes-vous sûr de vouloir supprimer le rapport de ${reportToDelete.report_type === "paid_leave"
              ? "Congés Payés"
              : "CRA"
            } pour ${reportToDelete.userName || "cet utilisateur"} pour ${format(
              new Date(reportToDelete.year, reportToDelete.month - 1),
              "MMMM yyyy",
              { locale: fr }
            )}? Cette action supprimera également toutes les activités associées à ce rapport.`}
          title="Confirmer la suppression du rapport"
        />
      )}

      {showDetailedReportModal && detailedReportData && (
        <DetailedCraReportModal
          isOpen={showDetailedReportModal}
          onClose={() => setShowDetailedReportModal(false)}
          reportData={detailedReportData}
        />
      )}
    </div>
  );
}
