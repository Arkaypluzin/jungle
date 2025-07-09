// components/CraBoard.js
"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isWeekend,
  parseISO,
  isValid,
  eachDayOfInterval,
  isBefore,
  isToday,
} from "date-fns";
import { fr } from "date-fns/locale";
import ActivityModal from "./ActivityModal";
import SummaryReport from "./SummaryReport";
import ConfirmationModal from "./ConfirmationModal";
import MonthlyReportPreviewModal from "./MonthlyReportPreviewModal";

// Noms des jours de la semaine, commençant par Lundi pour la locale fr
const daysOfWeekDisplay = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function CraBoard({
  activities = [],
  activityTypeDefinitions = [],
  clientDefinitions = [],
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  fetchActivitiesForMonth, // Cette prop est maintenant appelée avec le mois interne de CraBoard
  userId,
  userFirstName,
  showMessage,
  currentMonth: propCurrentMonth, // Reçoit le mois de la prop
  onMonthChange, // Reçoit la fonction de mise à jour du mois de la prop
}) {
  // Utilise le mois passé par la prop comme état initial, et le gère localement
  const [currentMonth, setCurrentMonth] = useState(propCurrentMonth);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [publicHolidays, setPublicHolidays] = useState([]);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [showResetMonthConfirmModal, setShowResetMonthConfirmModal] =
    useState(false);
  const [showFinalizeMonthConfirmModal, setShowFinalizeMonthConfirmModal] =
    useState(false);
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);
  const [showSummaryReport, setShowSummaryReport] = useState(false);
  const [summaryReportMonth, setSummaryReportMonth] = useState(null);
  const [showMonthlyReportPreview, setShowMonthlyReportPreview] =
    useState(false);
  const [monthlyReportPreviewData, setMonthlyReportPreviewData] =
    useState(null);

  // Synchronise le mois interne avec la prop si elle change
  useEffect(() => {
    if (!isSameMonth(currentMonth, propCurrentMonth)) {
      setCurrentMonth(propCurrentMonth);
    }
  }, [propCurrentMonth, currentMonth]);

  // --- Effets et Mémos ---

  const fetchPublicHolidays = useCallback(async () => {
    const year = currentMonth.getFullYear();
    try {
      const response = await fetch(`/api/public_holidays?year=${year}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch public holidays");
      }
      const data = await response.json();
      const formattedHolidays = data.map((holiday) =>
        format(new Date(holiday.date), "yyyy-MM-dd")
      );
      setPublicHolidays(formattedHolidays);
    } catch (error) {
      console.error(
        "CraBoard: Erreur lors de la récupération des jours fériés:",
        error
      );
      showMessage(
        `Impossible de charger les jours fériés : ${error.message}`,
        "error"
      );
      setPublicHolidays([]);
    }
  }, [currentMonth, showMessage]);

  useEffect(() => {
    fetchPublicHolidays();
  }, [fetchPublicHolidays]);

  const isPublicHoliday = useCallback(
    (date) => {
      if (!isValid(date)) return false;
      const formattedDate = format(date, "yyyy-MM-dd");
      return publicHolidays.includes(formattedDate);
    },
    [publicHolidays]
  );

  const activitiesForCurrentMonth = useMemo(() => {
    return activities.filter(
      (activity) =>
        String(activity.user_id) === String(userId) &&
        activity.date_activite &&
        isValid(parseISO(activity.date_activite)) &&
        isSameMonth(parseISO(activity.date_activite), currentMonth)
    );
  }, [activities, currentMonth, userId]);

  const activitiesByDay = useMemo(() => {
    const activitiesMap = new Map();
    activitiesForCurrentMonth.forEach((activity) => {
      const dateKey = format(parseISO(activity.date_activite), "yyyy-MM-dd");
      if (!activitiesMap.has(dateKey)) {
        activitiesMap.set(dateKey, []);
      }
      activitiesMap.get(dateKey).push(activity);
    });
    return activitiesMap;
  }, [activitiesForCurrentMonth]);

  const calculateCurrentMonthStatus = useCallback(() => {
    if (activitiesForCurrentMonth.length === 0) return "empty";

    const statuses = new Set(activitiesForCurrentMonth.map((a) => a.status));

    if (statuses.has("validated")) return "validated";
    if (statuses.has("rejected")) return "rejected";
    if (statuses.has("pending_review")) return "pending_review"; // <-- AJOUTEZ CETTE LIGNE

    if (statuses.has("finalized")) return "finalized";

    if (statuses.size === 1 && statuses.has("draft")) return "draft";

    return "mixed";
  }, [activitiesForCurrentMonth]);

  const currentMonthStatus = useMemo(
    () => calculateCurrentMonthStatus(),
    [calculateCurrentMonthStatus]
  );

  // --- Fonctions de navigation et de gestion des dates ---

  const goToPreviousMonth = useCallback(() => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange(newMonth); // Informe le parent du changement de mois
  }, [currentMonth, onMonthChange]);

  const goToNextMonth = useCallback(() => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange(newMonth); // Informe le parent du changement de mois
  }, [currentMonth, onMonthChange]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
    onMonthChange(today); // Informe le parent du changement de mois
  }, [onMonthChange]);

  const getDaysInCalendar = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const startCalendarDay = startOfWeek(monthStart, {
      locale: fr,
      weekStartsOn: 1,
    });
    const endCalendarDay = endOfWeek(monthEnd, { locale: fr, weekStartsOn: 1 });

    return eachDayOfInterval({ start: startCalendarDay, end: endCalendarDay });
  }, [currentMonth]);

  // --- Gestion des clics sur les jours et activités ---

  const handleDayClick = useCallback(
    (dayDate) => {
      if (!isValid(dayDate)) {
        showMessage("Erreur : Date sélectionnée invalide.", "error");
        return;
      }

      if (
        currentMonthStatus === "finalized" ||
        currentMonthStatus === "validated" ||
        currentMonthStatus === "rejected" ||
        currentMonthStatus === "pending_review" || // <-- AJOUTEZ CETTE LIGNE
        currentMonthStatus.startsWith("mixed")
      ) {
        showMessage(
          "Impossible d'ajouter des activités. Le mois est déjà finalisé, validé, rejeté ou en attente de révision.", // Message plus direct
          "info"
        );
        return;
      }

      setSelectedDate(dayDate);
      setEditingActivity(null);
      setIsModalOpen(true);
    },
    [showMessage, currentMonthStatus]
  );

  const handleActivityClick = useCallback(
    (activity) => {
      if (String(activity.user_id) !== String(userId)) {
        showMessage(
          "Vous ne pouvez pas modifier ou supprimer les activités des autres utilisateurs.",
          "error"
        );
        return;
      }

      if (
        activity.status === "finalized" ||
        activity.status === "validated" ||
        activity.status === "pending_review"
      ) {
        // <-- MODIFIEZ CETTE LIGNE
        showMessage(
          "Cette activité est finalisée, validée ou en attente de révision. Elle ne peut être ni modifiée ni supprimée.", // Message plus direct
          "info"
        );
        return;
      }

      const activityDate = parseISO(activity.date_activite);
      if (!activityDate || !isValid(activityDate)) {
        console.error(
          "CraBoard: Date d'activité invalide de la base de données",
          activity.date_activite
        );
        showMessage(
          "Erreur : Date d'activité existante invalide. Impossible de modifier.",
          "error"
        );
        return;
      }

      setSelectedDate(activityDate);
      setEditingActivity(activity);
      setIsModalOpen(true);
    },
    [showMessage, userId]
  );

  const handleCloseActivityModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingActivity(null);
  }, []);

  const handleSaveActivity = useCallback(
    async (activityData) => {
      try {
        const payload = { ...activityData, user_id: userId };
        if (editingActivity) {
          await onUpdateActivity(editingActivity.id, payload);
          showMessage("Activité modifiée avec succès !", "success");
        } else {
          await onAddActivity(payload);
          showMessage("Activité ajoutée avec succès !", "success");
        }
        handleCloseActivityModal();
        fetchActivitiesForMonth(currentMonth); // Utilise le mois interne de CraBoard
      } catch (error) {
        console.error(
          "CraBoard: Erreur lors de la sauvegarde de l'activité:",
          error
        );
        showMessage(`Échec de la sauvegarde: ${error.message}`, "error");
      }
    },
    [
      editingActivity,
      onAddActivity,
      onUpdateActivity,
      showMessage,
      handleCloseActivityModal,
      fetchActivitiesForMonth,
      currentMonth,
      userId,
    ]
  );

  const requestDeleteFromCalendar = useCallback(
    (activityId, event) => {
      event.stopPropagation();
      const activity = activities.find((act) => act.id === activityId);

      if (
        activity.status === "finalized" ||
        activity.status === "validated" ||
        activity.status === "pending_review"
      ) {
        // <-- MODIFIEZ CETTE LIGNE
        showMessage(
          "Cette activité est finalisée, validée ou en attente de révision. Elle ne peut pas être supprimée.", // Message plus direct
          "info"
        );
        return;
      }

      if (String(activity.user_id) !== String(userId)) {
        showMessage(
          "Vous ne pouvez pas supprimer les activités des autres utilisateurs.",
          "error"
        );
        return;
      }
      setActivityToDelete(activityId);
      setShowConfirmModal(true);
    },
    [activities, showMessage, userId]
  );

  const confirmDeleteActivity = useCallback(async () => {
    setShowConfirmModal(false);
    if (activityToDelete) {
      try {
        await onDeleteActivity(activityToDelete);
        showMessage("Activité supprimée avec succès !", "success");
        fetchActivitiesForMonth(currentMonth); // Utilise le mois interne de CraBoard
      } catch (error) {
        console.error(
          "CraBoard: Erreur lors de la suppression de l'activité:",
          error
        );
        showMessage(`Erreur de suppression : ${error.message}`, "error");
      } finally {
        setActivityToDelete(null);
      }
    }
  }, [
    activityToDelete,
    onDeleteActivity,
    showMessage,
    fetchActivitiesForMonth,
    currentMonth,
  ]);

  const cancelDeleteActivity = useCallback(() => {
    setShowConfirmModal(false);
    setActivityToDelete(null);
  }, []);

  // --- Fonctions de gestion du mois (Réinitialiser, Finaliser, Envoyer) ---

  const requestResetMonth = useCallback(() => {
    if (
      currentMonthStatus === "finalized" ||
      currentMonthStatus === "validated" ||
      currentMonthStatus === "rejected" ||
      currentMonthStatus === "pending_review" || // <-- AJOUTEZ CETTE LIGNE
      currentMonthStatus.startsWith("mixed")
    ) {
      showMessage(
        "Impossible de réinitialiser le mois. Il est déjà finalisé, validé, rejeté ou en attente de révision. Seul un administrateur peut annuler ces statuts.", // Message plus précis
        "info"
      );
      return;
    }
    setShowResetMonthConfirmModal(true);
  }, [currentMonthStatus, showMessage]);

  const confirmResetMonth = useCallback(async () => {
    setShowResetMonthConfirmModal(false);
    const activitiesToReset = activitiesForCurrentMonth.filter(
      (activity) => activity.status === "draft"
    );

    if (activitiesToReset.length === 0) {
      showMessage(
        `Aucune activité brouillon à réinitialiser pour ${format(
          currentMonth,
          "MMMM",
          { locale: fr }
        )}.`,
        "info"
      );
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const activity of activitiesToReset) {
      try {
        await onDeleteActivity(activity.id);
        successCount++;
      } catch (error) {
        console.error(
          `CraBoard: Erreur lors de la suppression de l'activité ${activity.id} lors de la réinitialisation:`,
          error
        );
        errorCount++;
      }
    }
    fetchActivitiesForMonth(currentMonth);
  }, [
    activitiesForCurrentMonth,
    onDeleteActivity,
    showMessage,
    currentMonth,
    fetchActivitiesForMonth,
  ]);

  const cancelResetMonth = useCallback(() => {
    setShowResetMonthConfirmModal(false);
  }, []);

  const requestFinalizeMonth = useCallback(() => {
    if (
      currentMonthStatus === "finalized" ||
      currentMonthStatus === "validated" ||
      currentMonthStatus === "rejected" || // <-- AJOUTEZ CETTE LIGNE
      currentMonthStatus === "pending_review" ||
      currentMonthStatus.startsWith("mixed")
    ) {
      showMessage("Ce mois est déjà finalisé ou validé.", "info");
      return;
    }
    setShowFinalizeMonthConfirmModal(true);
  }, [currentMonthStatus, showMessage]);

  const confirmFinalizeMonth = useCallback(async () => {
    setShowFinalizeMonthConfirmModal(false);
    let successCount = 0;
    let errorCount = 0;
    const year = format(currentMonth, "yyyy");
    const month = parseInt(format(currentMonth, "MM"));

    try {
      showMessage(
        `Le mois de ${format(currentMonth, "MMMM", {
          locale: fr,
        })} a été finalisé avec succès!`,
        "success"
      );
      const activitiesToFinalize = activitiesForCurrentMonth.filter(
        (activity) => activity.status === "draft"
      );
      for (const activity of activitiesToFinalize) {
        try {
          await onUpdateActivity(
            activity.id,
            {
              // Premier argument: ID de l'activité
              ...activity,
              status: "finalized",
            },
            true // <-- AJOUTEZ CET ARGUMENT pour suppressMessage
          );
          successCount++;
        } catch (error) {
          console.error(
            `CraBoard: Erreur lors de la finalisation de l'activité ${activity.id}:`,
            error
          );
          errorCount++;
        }
      }
      fetchActivitiesForMonth(currentMonth);
    } catch (error) {
      console.error("CraBoard: Erreur lors de la finalisation du mois:", error);
      showMessage(`Échec de la finalisation: ${error.message}`, "error");
    }
  }, [
    currentMonth,
    showMessage,
    activitiesForCurrentMonth,
    onUpdateActivity,
    fetchActivitiesForMonth,
  ]);

  const cancelFinalizeMonth = useCallback(() => {
    setShowFinalizeMonthConfirmModal(false);
  }, []);

  const requestSendCra = useCallback(() => {
    if (
      currentMonthStatus !== "finalized" &&
      currentMonthStatus !== "validated"
    ) {
      // <-- MODIFIEZ CETTE LIGNE
      showMessage(
        "Seuls les mois finalisés ou validés peuvent être envoyés.",
        "info"
      );
      return;
    }
    setShowSendConfirmModal(true);
  }, [currentMonthStatus, showMessage]);

  const confirmSendCra = useCallback(async () => {
    setShowSendConfirmModal(false);
    let successCount = 0;
    let errorCount = 0;

    // Filter activities for the current month that are "finalized"
    const activitiesToSend = activitiesForCurrentMonth.filter(
      (activity) => activity.status === "finalized"
    );

    if (activitiesToSend.length === 0) {
      showMessage(
        `No finalized activities to send for ${format(currentMonth, "MMMM", {
          locale: fr,
        })}.`,
        "info"
      );
      return;
    }
    for (const activity of activitiesToSend) {
      try {
        // Update the activity status to "pending_review"
        await onUpdateActivity(
          activity.id,
          {
            ...activity,
            status: "pending_review",
          },
          true // <-- AJOUTEZ CET ARGUMENT ICI
        );
        successCount++;
      } catch (error) {
        console.error(
          `CraBoard: Error sending activity ${activity.id}:`,
          error
        );
        errorCount++;
      }
    }
    // AJOUTEZ LE BLOC SUIVANT ICI :
    if (errorCount === 0) {
      showMessage(
        `Le CRA de ${format(currentMonth, "MMMM", {
          locale: fr,
        })} a été envoyé !`,
        "success"
      );
    } else if (successCount > 0) {
      showMessage(
        `${successCount} activités envoyées, mais ${errorCount} erreurs sont survenues.`,
        "warning"
      );
    } else {
      showMessage(
        `Échec complet de l'envoi du CRA. Aucune activité n'a été envoyée.`,
        "error"
      );
    }

    // Refresh activities after sending so that the status is updated in the UI
    fetchActivitiesForMonth(currentMonth);
  }, [
    currentMonth,
    showMessage,
    activitiesForCurrentMonth,
    onUpdateActivity,
    fetchActivitiesForMonth,
  ]);

  const cancelSendCra = useCallback(() => {
    setShowSendConfirmModal(false);
  }, []);

  const handleToggleSummaryReport = useCallback(() => {
    setShowSummaryReport((prev) => !prev);
    if (!showSummaryReport) {
      setSummaryReportMonth(currentMonth);
    } else {
      setSummaryReportMonth(null);
    }
  }, [showSummaryReport, currentMonth]);

  useEffect(() => {
    if (showSummaryReport) {
      setSummaryReportMonth(currentMonth);
    }
  }, [currentMonth, showSummaryReport]);
  const handleOpenMonthlyReportPreview = useCallback(() => {
    setShowMonthlyReportPreview(true);
    // Mapper les activités pour s'assurer que date_activite est un objet Date
    // ET ajouter les noms de client et de type d'activité pour MonthlyDetailedReport
    const formattedReportData = activitiesForCurrentMonth.map((activity) => {
      const activityType = activityTypeDefinitions.find(
        (def) => String(def.id) === String(activity.type_activite)
      );
      const client = clientDefinitions.find(
        (def) => String(def.id) === String(activity.client_id)
      );

      return {
        ...activity,
        date_activite: parseISO(activity.date_activite), // Assurez-vous que c'est un objet Date
        activity_type_name_full: activityType
          ? activityType.name
          : "Type Inconnu", // Nom du type d'activité
        client_name_full: client ? client.nom_client : "Client Inconnu", // Nom du client
      };
    });

    setMonthlyReportPreviewData({
      reportData: formattedReportData, // Les activités du mois courant, avec dates et noms formatés
      year: currentMonth.getFullYear(),
      month: currentMonth.getMonth() + 1, // getMonth() est basé sur 0
      userName: userFirstName,
      userId: userId, // Passez l'ID utilisateur si nécessaire dans le rapport détaillé
    });
  }, [
    activitiesForCurrentMonth,
    currentMonth,
    userFirstName,
    userId,
    activityTypeDefinitions,
    clientDefinitions,
  ]); // <-- VÉRIFIEZ BIEN CES DÉPENDANCES

  // Nouvelle fonction pour fermer la modal de prévisualisation du rapport détaillé <-- AJOUTEZ TOUT CE BLOC
  const handleCloseMonthlyReportPreview = useCallback(() => {
    setShowMonthlyReportPreview(false);
    setMonthlyReportPreviewData(null);
  }, []);

  // --- Calculs pour l'affichage ---

  const totalWorkingDaysInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days.filter(
      (day) => !isWeekend(day, { weekStartsOn: 1 }) && !isPublicHoliday(day)
    ).length;
  }, [currentMonth, isPublicHoliday]);

  const totalActivitiesTimeInMonth = useMemo(() => {
    return activitiesForCurrentMonth.reduce(
      (sum, activity) => sum + (parseFloat(activity.temps_passe) || 0),
      0
    );
  }, [activitiesForCurrentMonth]);

  const timeDifference = useMemo(() => {
    return (totalActivitiesTimeInMonth - totalWorkingDaysInMonth).toFixed(2);
  }, [totalActivitiesTimeInMonth, totalWorkingDaysInMonth]);

  // --- Rendu des composants ---

  const renderHeader = () => {
    let statusBadge = null;
    let badgeClass = "ml-3 text-sm font-bold px-2 py-1 rounded-full";

    switch (currentMonthStatus) {
      case "validated":
        statusBadge = (
          <span className={`${badgeClass} text-green-700 bg-green-100`}>
            VALIDÉ
          </span>
        );
        break;
      case "finalized":
        statusBadge = (
          <span className={`${badgeClass} text-yellow-700 bg-yellow-100`}>
            FINALISÉ
          </span>
        );
      case "pending_review": // <-- AJOUTEZ CE BLOC
        statusBadge = (
          <span className={`${badgeClass} text-blue-700 bg-blue-100`}>
            ENVOYÉ (EN ATTENTE)
          </span>
        );
        break;
      case "mixed":
      case "mixed_finalized":
      case "mixed_validated":
      case "mixed_rejected":
      case "mixed_pending_review":
        statusBadge = (
          <span className={`${badgeClass} text-purple-700 bg-purple-100`}>
            PARTIEL
          </span>
        );
        break;
      case "rejected":
        statusBadge = (
          <span className={`${badgeClass} text-red-700 bg-red-100`}>
            REJETÉ
          </span>
        );
        break;
      case "draft":
      case "empty":
      default:
        statusBadge = null;
        break;
    }

    return (
      <div className="flex justify-between items-center mb-4 p-4 bg-blue-100 rounded-lg shadow-md">
        <button
          onClick={goToPreviousMonth}
          className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition duration-300"
          aria-label="Mois précédent"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h2 className="text-2xl font-semibold text-blue-800 flex items-center">
          {format(currentMonth, "MMMM ", { locale: fr })} {statusBadge}
        </h2>
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition duration-300"
          aria-label="Mois suivant"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    );
  };

  const renderDaysOfWeek = () => {
    return (
      <div className="grid grid-cols-7 border-b border-gray-200">
        {daysOfWeekDisplay.map((dayName, i) => (
          <div className="text-center font-bold text-gray-700 p-2" key={i}>
            {dayName}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const allCells = [];

    getDaysInCalendar.forEach((day) => {
      const formattedDate = format(day, "d");
      const activitiesForDay =
        activitiesByDay.get(format(day, "yyyy-MM-dd")) || [];

      const isTodayHighlight = isToday(day);
      const isWeekendDay = isWeekend(day, { weekStartsOn: 1 });
      const isPublicHolidayDay = isPublicHoliday(day);
      const isNonWorkingDay = isWeekendDay || isPublicHolidayDay;
      const isOutsideCurrentMonth = !isSameMonth(day, currentMonth);

      let cellClasses = `
        p-2 h-32 sm:h-40 flex flex-col justify-start border border-gray-200 rounded-lg m-0.5
        transition duration-200 overflow-hidden relative
      `;

      if (isOutsideCurrentMonth) {
        cellClasses += " bg-gray-100 opacity-50 cursor-not-allowed";
      } else if (isTodayHighlight) {
        cellClasses += " bg-blue-100 border-blue-500 shadow-md text-blue-800";
      } else if (isNonWorkingDay) {
        cellClasses += " bg-gray-200 text-gray-500 cursor-not-allowed";
      } else {
        cellClasses +=
          " bg-white text-gray-900 hover:bg-blue-50 cursor-pointer";
      }
      const canAddActivity =
        !isOutsideCurrentMonth &&
        !isNonWorkingDay &&
        currentMonthStatus !== "finalized" &&
        currentMonthStatus !== "validated" &&
        currentMonthStatus !== "rejected" && // <-- AJOUTEZ CETTE LIGNE
        currentMonthStatus !== "pending_review" && // <-- AJOUTEZ CETTE LIGNE
        !currentMonthStatus.startsWith("mixed");

      allCells.push(
        <div
          className={cellClasses}
          key={format(day, "yyyy-MM-dd")}
          onClick={isOutsideCurrentMonth ? null : () => handleDayClick(day)}
        >
          <span
            className={`text-sm font-semibold mb-1 ${
              isTodayHighlight ? "text-blue-800" : ""
            }`}
          >
            {formattedDate}
          </span>
          {isNonWorkingDay && isOutsideCurrentMonth === false && (
            <span className="text-xs text-red-600 font-medium absolute top-1 right-1 px-1 py-0.5 bg-red-100 rounded">
              {isWeekendDay && isPublicHolidayDay
                ? "Férié & W-E"
                : isWeekendDay
                ? "Week-end"
                : "Férié"}
            </span>
          )}

          {activitiesForDay.length > 0 && (
            <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
              {activitiesForDay
                .reduce(
                  (sum, act) => sum + (parseFloat(act.temps_passe) || 0),
                  0
                )
                .toFixed(1)}
              j
            </div>
          )}

          <div className="flex-grow overflow-y-auto w-full pr-1 custom-scrollbar">
            {activitiesForDay
              .sort((a, b) => {
                const typeA =
                  activityTypeDefinitions.find(
                    (t) => String(t.id) === String(a.type_activite)
                  )?.name ||
                  a.type_activite_name ||
                  a.type_activite;
                const typeB =
                  activityTypeDefinitions.find(
                    (t) => String(t.id) === String(b.type_activite)
                  )?.name ||
                  b.type_activite_name ||
                  b.type_activite;
                if ((typeA || "") < (typeB || "")) return -1;
                if ((typeA || "") > (typeB || "")) return 1;

                const clientA =
                  clientDefinitions.find(
                    (c) => String(c.id) === String(a.client_id)
                  )?.name ||
                  a.client_name ||
                  "";
                const clientB =
                  clientDefinitions.find(
                    (c) => String(c.id) === String(b.client_id)
                  )?.name ||
                  b.client_name ||
                  "";
                if (clientA < clientB) return -1;
                if (clientA > clientB) return 1;
                return 0;
              })
              .map((activity) => {
                const client = clientDefinitions.find(
                  (c) => String(c.id) === String(activity.client_id)
                );
                const clientLabel = client ? client.name : "Non attribué";

                const activityTypeObj = activityTypeDefinitions.find(
                  (type) => String(type.id) === String(activity.type_activite)
                );
                const activityTypeLabel = activityTypeObj
                  ? activityTypeObj.name
                  : "Activité inconnue";

                const timeSpentLabel = activity.temps_passe
                  ? `${parseFloat(activity.temps_passe)}j`
                  : "";
                const displayLabel = `${activityTypeLabel}${
                  timeSpentLabel ? ` (${timeSpentLabel})` : ""
                }`;

                const typeColorClass = activityTypeLabel
                  .toLowerCase()
                  .includes("absence")
                  ? "bg-red-200 text-red-800"
                  : activityTypeLabel
                      .toLowerCase()
                      .includes("heure supplémentaire") ||
                    activityTypeObj?.is_overtime
                  ? "bg-purple-200 text-purple-800"
                  : "bg-blue-200 text-blue-800";

                const overrideLabel = activity.override_non_working_day
                  ? " (Dérogation)"
                  : "";

                let statusColorClass = "";
                if (activity.status === "finalized") {
                  statusColorClass = "bg-green-300 text-green-900";
                } else if (activity.status === "validated") {
                  statusColorClass = "bg-purple-300 text-purple-900";
                } else if (activity.status === "pending_review") {
                  // <-- AJOUTEZ CE BLOC
                  statusColorClass = "bg-blue-300 text-blue-900";
                } else {
                  statusColorClass = "bg-gray-300 text-gray-800";
                }

                const isActivityFinalizedOrValidated =
                  activity.status === "finalized" ||
                  activity.status === "validated" ||
                  activity.status === "rejected" || // <-- AJOUTEZ CETTE LIGNE
                  activity.status === "pending_review";

                return (
                  <div
                    key={activity.id}
                    className={`relative text-xs px-1 py-0.5 rounded-md mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis
                                ${typeColorClass} ${
                      isActivityFinalizedOrValidated ? "opacity-70" : ""
                    } group`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActivityClick(activity);
                    }}
                    title={`Client: ${clientLabel}\nType: ${activityTypeLabel}\nTemps: ${timeSpentLabel}\nDescription: ${
                      activity.description_activite || "N/A"
                    }${
                      overrideLabel ? "\nDérogation jour non ouvrable" : ""
                    }\nStatut: ${
                      activity.status === "validated"
                        ? "Validé"
                        : activity.status === "finalized"
                        ? "Finalisé"
                        : activity.status === "pending_review"
                        ? "En attente de révision" // <-- MODIFIEZ CETTE LIGNE
                        : "Brouillon"
                    }\nFacturable: ${
                      activityTypeObj?.is_billable ? "Oui" : "Non"
                    }\nClient requis: ${
                      activityTypeObj?.requires_client ? "Oui" : "Non"
                    }\nHeures sup: ${
                      activityTypeObj?.is_overtime ? "Oui" : "Non"
                    }\nUtilisateur: ${userFirstName}`}
                  >
                    {`${displayLabel} - ${clientLabel}${overrideLabel}`}
                    {activityTypeObj?.is_billable ? (
                      <span className="ml-1 text-green-600" title="Facturable">
                        ✔
                      </span>
                    ) : (
                      <span
                        className="ml-1 text-red-600"
                        title="Non facturable"
                      >
                        ✖
                      </span>
                    )}
                    {isActivityFinalizedOrValidated && (
                      <span
                        className={`absolute top-0 right-0 h-full flex items-center justify-center p-1 text-xs font-semibold rounded-tr-md rounded-br-md ${statusColorClass}`}
                        title={
                          activity.status === "validated"
                            ? "V"
                            : activity.status === "finalized"
                            ? "F"
                            : activity.status === "pending_review"
                            ? "A" // <-- AJOUTEZ CETTE LIGNE (A pour En Attente)
                            : ""
                        }
                      >
                        {activity.status === "validated" ? "V" : "F"}
                      </span>
                    )}
                    {!isActivityFinalizedOrValidated && (
                      <button
                        onClick={(e) =>
                          requestDeleteFromCalendar(activity.id, e)
                        }
                        className="absolute top-0 right-0 h-full flex items-center justify-center p-1 bg-red-600 hover:bg-red-700 text-white rounded-tr-md rounded-br-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        title="Supprimer l'activité"
                        aria-label="Supprimer l'activité"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      );
    });

    const rows = [];
    for (let i = 0; i < allCells.length; i += 7) {
      rows.push(
        <div className="grid grid-cols-7 w-full" key={`row-${i}`}>
          {allCells.slice(i, i + 7)}
        </div>
      );
    }

    return <div className="w-full">{rows}</div>;
  };

  // Déclenche la récupération des activités lorsque le mois interne change
  useEffect(() => {
    fetchActivitiesForMonth(currentMonth);
  }, [currentMonth, fetchActivitiesForMonth]);

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full mt-8">
      {renderHeader()}

      <div className="bg-gray-50 p-4 rounded-lg shadow-inner mb-6 flex flex-col sm:flex-row justify-around text-center">
        <p className="text-gray-700 font-medium">
          Jours ouvrés dans le mois:{" "}
          <span className="font-bold">{totalWorkingDaysInMonth}</span>
        </p>
        <p className="text-gray-700 font-medium">
          Temps total déclaré (jours):{" "}
          <span className="font-bold">
            {totalActivitiesTimeInMonth.toFixed(2)}
          </span>
        </p>
        <p className="text-gray-700 font-medium">
          Écart:{" "}
          <span
            className={`font-bold ${
              parseFloat(timeDifference) < 0 ? "text-red-500" : "text-green-600"
            }`}
          >
            {timeDifference}
          </span>
        </p>
      </div>

      <div className="flex justify-center space-x-4 mb-8 flex-wrap gap-2">
        <button
          onClick={handleToggleSummaryReport}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-300"
        >
          {showSummaryReport ? "Masquer le rapport" : "Afficher le rapport"}
        </button>
        <button
          onClick={requestFinalizeMonth}
          className={`px-6 py-3 font-semibold rounded-lg shadow-md transition duration-300
            ${
              currentMonthStatus === "finalized" ||
              currentMonthStatus === "validated" ||
              currentMonthStatus === "rejected" || // <-- AJOUTEZ CETTE LIGNE
              currentMonthStatus === "pending_review" ||
              currentMonthStatus.startsWith("mixed")
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          disabled={
            currentMonthStatus === "finalized" ||
            currentMonthStatus === "validated" ||
            currentMonthStatus === "rejected" || // <-- AJOUTEZ CETTE LIGNE
            currentMonthStatus === "pending_review" ||
            currentMonthStatus.startsWith("mixed")
          }
        >
          Finaliser le mois
        </button>
        <button
          onClick={requestResetMonth}
          className={`px-6 py-3 font-semibold rounded-lg shadow-md transition duration-300
            ${
              currentMonthStatus === "finalized" ||
              currentMonthStatus === "validated" ||
              currentMonthStatus === "rejected" || // <-- AJOUTEZ CETTE LIGNE
              currentMonthStatus === "pending_review" ||
              currentMonthStatus.startsWith("mixed")
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-orange-600 text-white hover:bg-orange-700"
            }`}
          disabled={
            currentMonthStatus === "finalized" ||
            currentMonthStatus === "validated" ||
            currentMonthStatus === "rejected" || // <-- AJOUTEZ CETTE LIGNE
            currentMonthStatus === "pending_review" || // <-- AJOUTEZ CETTE LIGNE
            currentMonthStatus.startsWith("mixed")
          }
        >
          Réinitialiser le mois
        </button>
        <button
          onClick={requestSendCra}
          className={`px-6 py-3 font-semibold rounded-lg shadow-md transition duration-300
            ${
              currentMonthStatus === "draft" || currentMonthStatus === "empty"
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
          disabled={
            currentMonthStatus !== "finalized" && // <-- MODIFIEZ CETTE LIGNE
            currentMonthStatus !== "validated"
          }
        >
          Envoyer le CRA
        </button>
      </div>
      {showSummaryReport && summaryReportMonth && (
        <SummaryReport
          month={summaryReportMonth}
          activities={activitiesForCurrentMonth}
          activityTypeDefinitions={activityTypeDefinitions}
          clientDefinitions={clientDefinitions}
          totalWorkingDays={totalWorkingDaysInMonth}
          totalActivitiesTime={totalActivitiesTimeInMonth}
          timeDifference={timeDifference}
          isPublicHoliday={isPublicHoliday}
          userFirstName={userFirstName}
          onClose={handleToggleSummaryReport}
          onOpenMonthlyReportPreview={handleOpenMonthlyReportPreview}
        />
      )}

      {renderDaysOfWeek()}
      {renderCells()}

      {isModalOpen && (
        <ActivityModal
          isOpen={isModalOpen}
          onClose={handleCloseActivityModal}
          onSave={handleSaveActivity}
          onDelete={confirmDeleteActivity}
          activity={editingActivity}
          initialDate={selectedDate}
          activityTypeDefinitions={activityTypeDefinitions}
          clientDefinitions={clientDefinitions}
          showMessage={showMessage}
        />
      )}

      {showMonthlyReportPreview && monthlyReportPreviewData && (
        <MonthlyReportPreviewModal
          isOpen={showMonthlyReportPreview}
          onClose={handleCloseMonthlyReportPreview}
          reportData={monthlyReportPreviewData.reportData}
          year={monthlyReportPreviewData.year}
          month={monthlyReportPreviewData.month}
          userName={monthlyReportPreviewData.userName}
          userId={monthlyReportPreviewData.userId}
        />
      )}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={cancelDeleteActivity}
        onConfirm={confirmDeleteActivity}
        message="Êtes-vous sûr de vouloir supprimer cette activité ? Cette action est irréversible." // Message plus clair
      />
      <ConfirmationModal
        isOpen={showResetMonthConfirmModal}
        onClose={cancelResetMonth}
        onConfirm={confirmResetMonth}
        message={`Confirmez-vous la suppression de TOUTES les activités brouillons pour ${format(
          currentMonth,
          "MMMM ",
          { locale: fr }
        )} ? Cette action est irréversible.`} // Message plus clair
      />

      <ConfirmationModal
        isOpen={showFinalizeMonthConfirmModal}
        onClose={cancelFinalizeMonth}
        onConfirm={confirmFinalizeMonth}
        message={`Confirmez-vous la finalisation du CRA pour ${format(
          currentMonth,
          "MMMM ",
          { locale: fr }
        )} ? Les activités deviendront non modifiables.`} // Message plus clair
      />

      <ConfirmationModal
        isOpen={showSendConfirmModal}
        onClose={cancelSendCra}
        onConfirm={confirmSendCra}
        message={`Confirmez-vous l'envoi du CRA pour ${format(
          currentMonth,
          "MMMM ",
          { locale: fr }
        )} ? Une fois envoyé, vous ne pourrez plus le modifier.`} // Message plus clair
      />
    </div>
  );
}
