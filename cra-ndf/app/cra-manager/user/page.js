"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import CraBoard from "@/components/cra/Board/CraBoard";
import CraHistory from "@/components/cra/Reports/CraHistory";
import DetailedCraReportModal from "@/components/cra/Reports/DetailedCraReportModal";
import ConfirmationModal from "@/components/cra/Modals/ConfirmationModal";
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
    <div className={`fixed bottom-4 right-4 p-4 rounded-lg text-white shadow-lg ${bgColor} z-50`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 font-bold">
        &times;
      </button>
    </div>
  );
};

export default function UserCRAPage() {
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

  // Onglets réduits : seulement “Mon CRA” et “Historique”
  const [activeTab, setActiveTab] = useState("craManager");

  const [craActivities, setCraActivities] = useState([]);
  const [clientDefinitions, setClientDefinitions] = useState([]);
  const [activityTypeDefinitions, setActivityTypeDefinitions] = useState([]);
  const [loadingAppData, setLoadingAppData] = useState(true);
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [error, setError] = useState(null);
  const [currentDisplayedMonth, setCurrentDisplayedMonth] = useState(new Date());

  const [showDetailedReportModal, setShowDetailedReportModal] = useState(false);
  const [detailedReportData, setDetailedReportData] = useState(null);

  const [showDeleteReportConfirmModal, setShowDeleteReportConfirmModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);

  const currentUserId = status === "authenticated" ? session?.user?.id : null;
  const currentUserName =
    status === "authenticated"
      ? session?.user?.name || "Utilisateur"
      : "Chargement…";

  // Utilitaire fetch + parsing JSON robuste
  const fetchAndParse = useCallback(async (url, resourceName) => {
    const res = await fetch(url);
    if (!res.ok) {
      let errorInfo = `Erreur HTTP ${res.status}: ${res.statusText}`;
      let rawText = "Non disponible";
      try {
        rawText = await res.text();
        try {
          const errorData = JSON.parse(rawText);
          errorInfo += ` - Message API: ${errorData.message || JSON.stringify(errorData)}`;
        } catch {
          errorInfo += ` - Réponse non-JSON (début): "${rawText.substring(0, 200)}..."`;
        }
      } catch { }
      throw new Error(`Échec du chargement des ${resourceName}: ${errorInfo}`);
    }
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const rawText = await res.text();
      throw new Error(
        `Réponse inattendue pour ${resourceName} (non-JSON). Début: "${rawText.substring(0, 100)}..."`
      );
    }
    return res.json();
  }, []);

  // Data loaders
  const fetchClients = useCallback(async () => {
    try {
      const clients = await fetchAndParse("/api/client", "clients");
      setClientDefinitions(clients);
      return clients;
    } catch (err) {
      console.error("UserCRAPage: clients error:", err);
      showMessage(`Erreur de chargement des clients: ${err.message}`, "error");
      setClientDefinitions([]);
      throw err;
    }
  }, [fetchAndParse, showMessage]);

  const fetchActivityTypes = useCallback(async () => {
    try {
      const types = await fetchAndParse("/api/activity_type", "types d'activité");
      setActivityTypeDefinitions(types);
      return types;
    } catch (err) {
      console.error("UserCRAPage: activity types error:", err);
      showMessage(`Erreur de chargement des types d'activité: ${err.message}`, "error");
      setActivityTypeDefinitions([]);
      throw err;
    }
  }, [fetchAndParse, showMessage]);

  const fetchCraActivitiesForMonth = useCallback(
    async (monthToFetch) => {
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

        const processed = (activitiesData || [])
          .map((activity) => {
            const dateObj =
              typeof activity.date_activite === "string"
                ? parseISO(activity.date_activite)
                : activity.date_activite
                  ? new Date(activity.date_activite)
                  : null;

            const dureeJoursValue = parseFloat(
              activity.duree_jours ?? activity.temps_passe
            );

            return {
              ...activity,
              date_activite: isValid(dateObj) ? dateObj : null,
              duree_jours: isNaN(dureeJoursValue) ? 0 : dureeJoursValue,
            };
          })
          .filter((a) => a.date_activite !== null);

        setCraActivities(processed);
        return processed;
      } catch (err) {
        console.error("UserCRAPage: activities error:", err);
        showMessage(`Erreur de chargement des activités CRA: ${err.message}`, "error");
        setCraActivities([]);
        throw err;
      }
    },
    [currentUserId, fetchAndParse, showMessage]
  );

  const fetchMonthlyReportsForUser = useCallback(async () => {
    if (!currentUserId) {
      setMonthlyReports([]);
      return;
    }
    try {
      const queryParams = new URLSearchParams({ userId: currentUserId });
      const res = await fetch(`/api/monthly_cra_reports?${queryParams.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Échec de la récupération des rapports mensuels.");
      }
      const data = await res.json();

      // Normalisation des raisons de rejet
      const processed = (data.data || []).map((report) => {
        const r = { ...report };
        if (r.status === "rejected") {
          let reason = r.rejectionReason ?? r.rejection_reason;
          if (reason === "nul") reason = null;
          r.rejection_reason = reason;
          r.rejectionReason = reason;
        } else {
          r.rejection_reason = null;
          r.rejectionReason = null;
        }
        return r;
      });

      setMonthlyReports(processed);
    } catch (err) {
      console.error("UserCRAPage: monthly reports error:", err);
      showMessage(`Erreur lors du chargement de vos rapports mensuels: ${err.message}`, "error");
      setMonthlyReports([]);
    }
  }, [currentUserId, showMessage]);

  // Initial load
  useEffect(() => {
    if (status === "loading") {
      setLoadingAppData(true);
      return;
    }
    const load = async () => {
      setLoadingAppData(true);
      setError(null);
      try {
        if (status === "authenticated" && currentUserId) {
          await Promise.all([fetchClients(), fetchActivityTypes(), fetchMonthlyReportsForUser()]);
          await fetchCraActivitiesForMonth(currentDisplayedMonth);
        } else {
          setClientDefinitions([]);
          setActivityTypeDefinitions([]);
          setCraActivities([]);
          setMonthlyReports([]);
        }
      } catch (err) {
        console.error("UserCRAPage: init error:", err);
        setError(`Erreur de chargement des données: ${err.message}`);
        showMessage(`Erreur de chargement des données: ${err.message}`, "error");
      } finally {
        setLoadingAppData(false);
      }
    };
    load();
  }, [
    status,
    currentUserId,
    fetchClients,
    fetchActivityTypes,
    fetchMonthlyReportsForUser,
    fetchCraActivitiesForMonth,
    currentDisplayedMonth,
    showMessage,
  ]);

  // CRUD handlers (utilisateur)
  const handleAddCraActivity = useCallback(
    async (activityData) => {
      if (!currentUserId) {
        showMessage("Veuillez vous connecter pour ajouter des activités.", "error");
        throw new Error("Utilisateur non authentifié ou ID non disponible.");
      }
      try {
        const payload = {
          ...activityData,
          user_id: currentUserId,
          date_activite: activityData.date_activite
            ? format(activityData.date_activite, "yyyy-MM-dd")
            : null,
          // Beaucoup d’APIs internes attendent 'duree_jours'
          duree_jours: parseFloat(activityData.duree_jours ?? activityData.temps_passe) || 0,
        };
        const res = await fetch("/api/cra_activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || `Erreur serveur: ${res.statusText}`);
        }
        const created = await res.json();
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
        await fetchMonthlyReportsForUser();
        showMessage("Activité ajoutée avec succès !", "success");
        return created;
      } catch (error) {
        console.error("UserCRAPage: create activity error:", error);
        showMessage(`Échec de la création de l'activité: ${error.message}`, "error");
        throw error;
      }
    },
    [currentUserId, currentDisplayedMonth, fetchCraActivitiesForMonth, fetchMonthlyReportsForUser, showMessage]
  );

  const handleUpdateCraActivity = useCallback(
    async (id, activityData) => {
      if (!currentUserId) {
        showMessage("Veuillez vous connecter pour modifier des activités.", "error");
        throw new Error("Utilisateur non authentifié ou ID non disponible.");
      }
      try {
        const payload = {
          ...activityData,
          user_id: currentUserId,
          date_activite: activityData.date_activite
            ? format(activityData.date_activite, "yyyy-MM-dd")
            : null,
          duree_jours: parseFloat(activityData.duree_jours ?? activityData.temps_passe) || 0,
        };
        const res = await fetch(`/api/cra_activities/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || `Erreur serveur: ${res.statusText}`);
        }
        const updated = await res.json();
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
        await fetchMonthlyReportsForUser();
        showMessage("Activité mise à jour avec succès !", "success");
        return updated;
      } catch (error) {
        console.error("UserCRAPage: update activity error:", error);
        showMessage(`Échec de la mise à jour de l'activité: ${error.message}`, "error");
        throw error;
      }
    },
    [currentUserId, currentDisplayedMonth, fetchCraActivitiesForMonth, fetchMonthlyReportsForUser, showMessage]
  );

  const handleDeleteActivity = useCallback(
    async (id) => {
      if (!currentUserId) {
        showMessage("Veuillez vous connecter pour supprimer des activités.", "error");
        throw new Error("Utilisateur non authentifié ou ID non disponible.");
      }
      try {
        const res = await fetch(`/api/cra_activities/${id}`, { method: "DELETE" });
        if (res.ok) {
          if (res.status === 204) {
            showMessage("Activité supprimée avec succès !", "success");
          } else {
            const body = await res.json().catch(() => ({}));
            showMessage(body.message || "Activité supprimée avec succès !", "success");
          }
          await fetchCraActivitiesForMonth(currentDisplayedMonth);
          await fetchMonthlyReportsForUser();
        } else {
          let errText = await res.text();
          try {
            const errData = JSON.parse(errText);
            errText = errData.message || errText;
          } catch { }
          throw new Error(errText || `Erreur serveur: ${res.statusText}`);
        }
      } catch (error) {
        console.error("UserCRAPage: delete activity error:", error);
        showMessage(`Échec de la suppression: ${error.message}`, "error");
        throw error;
      }
    },
    [currentUserId, currentDisplayedMonth, fetchCraActivitiesForMonth, fetchMonthlyReportsForUser, showMessage]
  );

  const handleSendMonthlyReport = useCallback(
    async (reportData) => {
      if (!currentUserId) {
        showMessage("Veuillez vous connecter pour envoyer des rapports.", "error");
        throw new Error("Utilisateur non authentifié ou ID non disponible.");
      }
      try {
        const activitiesToSend = Array.isArray(reportData.activities)
          ? reportData.activities.map((a) => ({
            ...a,
            duree_jours: parseFloat(a.duree_jours ?? a.temps_passe) || 0,
          }))
          : [];

        const payload = { ...reportData, activities: activitiesToSend };
        const res = await fetch("/api/monthly_cra_reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || `Erreur serveur: ${res.statusText}`);
        }
        const result = await res.json();
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
        await fetchMonthlyReportsForUser();
        showMessage(`Rapport "${reportData.report_type}" envoyé avec succès !`, "success");
        return result;
      } catch (error) {
        console.error("UserCRAPage: send report error:", error);
        showMessage(`Échec de l'envoi du rapport: ${error.message}`, "error");
        throw error;
      }
    },
    [currentUserId, currentDisplayedMonth, fetchCraActivitiesForMonth, fetchMonthlyReportsForUser, showMessage]
  );

  // Suppression d’un rapport (depuis l’historique)
  const handleDeleteMonthlyReport = useCallback(
    async (report) => {
      if (!currentUserId) {
        showMessage("Veuillez vous connecter pour supprimer des rapports.", "error");
        return;
      }
      if (!report?.id) {
        showMessage("Rapport invalide pour la suppression.", "error");
        return;
      }
      try {
        const res = await fetch(`/api/monthly_cra_reports/${report.id}`, { method: "DELETE" });
        if (res.status === 204) {
          showMessage("Rapport mensuel et activités associées supprimés avec succès !", "success");
          await fetchCraActivitiesForMonth(currentDisplayedMonth);
          await fetchMonthlyReportsForUser();
          return;
        }
        if (!res.ok) {
          let txt = await res.text();
          try {
            const j = JSON.parse(txt);
            txt = j.message || txt;
          } catch { }
          throw new Error(txt || `Erreur serveur: ${res.statusText}`);
        }
        showMessage("Suppression effectuée avec succès.", "success");
        await fetchCraActivitiesForMonth(currentDisplayedMonth);
        await fetchMonthlyReportsForUser();
      } catch (error) {
        console.error("UserCRAPage: delete report error:", error);
        showMessage(`Échec de la suppression du rapport: ${error.message}`, "error");
      } finally {
        setShowDeleteReportConfirmModal(false);
        setReportToDelete(null);
      }
    },
    [currentUserId, fetchCraActivitiesForMonth, currentDisplayedMonth, fetchMonthlyReportsForUser, showMessage]
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
    if (reportToDelete) handleDeleteMonthlyReport(reportToDelete);
  }, [reportToDelete, handleDeleteMonthlyReport]);

  // Détail rapport (modal)
  const handleShowDetailedReport = useCallback(() => {
    const totalActivitiesTime = craActivities.reduce(
      (sum, a) => sum + (parseFloat(a.duree_jours) || 0),
      0
    );

    const start = startOfMonth(currentDisplayedMonth);
    const end = endOfMonth(currentDisplayedMonth);
    const totalWorkingDays = eachDayOfInterval({ start, end }).filter((d) => {
      const dow = getDay(d);
      return dow >= 1 && dow <= 5;
    }).length;

    const totalWorkingDaysActivitiesTime = craActivities.reduce((sum, a) => {
      const d = isValid(a.date_activite) ? a.date_activite : parseISO(a.date_activite);
      if (isValid(d)) {
        const dow = getDay(d);
        if (dow >= 1 && dow <= 5) return sum + (parseFloat(a.duree_jours) || 0);
      }
      return sum;
    }, 0);

    const paidLeaveType = activityTypeDefinitions.find(
      (t) => t.name && t.name.toLowerCase().includes("congé payé")
    );
    const totalPaidLeaveDaysInMonth = craActivities.reduce((sum, a) => {
      if (paidLeaveType && String(a.type_activite) === String(paidLeaveType.id)) {
        return sum + (parseFloat(a.duree_jours) || 0);
      }
      return sum;
    }, 0);

    const timeDifferenceValue = (totalActivitiesTime - totalWorkingDays).toFixed(2);

    setDetailedReportData({
      activities: craActivities,
      clientDefinitions,
      activityTypeDefinitions,
      totalWorkingDaysInMonth: totalWorkingDays,
      totalActivitiesTimeInMonth: totalActivitiesTime,
      totalWorkingDaysActivitiesTime,
      totalPaidLeaveDaysInMonth,
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
        Chargement…
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Retour
          </button>
        </div>

        {/* Onglets (réduits) */}
        <div className="flex justify-center mb-8 space-x-4">
          <button
            onClick={() => setActiveTab("craManager")}
            className={`px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${activeTab === "craManager" ? "bg-blue-600 text-white shadow-lg" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            Mon CRA
          </button>
          <button
            onClick={() => setActiveTab("sentCraHistory")}
            className={`ml-4 px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 ${activeTab === "sentCraHistory" ? "bg-blue-600 text-white shadow-lg" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            Historique des CRAs envoyés
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
            monthlyReports={monthlyReports}
            onSendMonthlyReport={handleSendMonthlyReport}
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
      </div>

      <ToastMessage {...toastMessage} onClose={hideMessage} />

      {showDeleteReportConfirmModal && reportToDelete && (
        <ConfirmationModal
          isOpen={showDeleteReportConfirmModal}
          onClose={cancelDeleteReportConfirmation}
          onConfirm={confirmDeleteReportAction}
          message={`Êtes-vous sûr de vouloir supprimer le rapport de ${reportToDelete.report_type === "paid_leave" ? "Congés Payés" : "CRA"
            } pour ${reportToDelete.userName || "cet utilisateur"} pour ${format(
              new Date(reportToDelete.year, reportToDelete.month - 1),
              "MMMM yyyy",
              { locale: fr }
            )} ? Cette action supprimera également toutes les activités associées à ce rapport.`}
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