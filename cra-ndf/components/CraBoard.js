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
import { fr } from "date-fns/locale"; // <-- C'est ici que la correction a été faite
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
  fetchActivitiesForMonth,
  userId,
  userFirstName, // Le nom de l'utilisateur connecté
  showMessage,
  currentMonth: propCurrentMonth,
  onMonthChange,
  readOnly = false,
}) {
  console.log(
    "[CraBoard] Activités reçues par le composant:",
    activities.length,
    "activités."
  );
  console.log(
    "[CraBoard] userFirstName reçu du parent (CRAPage):",
    userFirstName
  ); // Log pour vérifier userFirstName

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

  useEffect(() => {
    if (!isSameMonth(currentMonth, propCurrentMonth)) {
      setCurrentMonth(propCurrentMonth);
    }
  }, [propCurrentMonth, currentMonth]);

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
    if (statuses.has("pending_review")) return "pending_review";

    if (statuses.has("finalized")) return "finalized";

    if (statuses.size === 1 && statuses.has("draft")) return "draft";

    return "mixed";
  }, [activitiesForCurrentMonth]);

  const currentMonthStatus = useMemo(
    () => calculateCurrentMonthStatus(),
    [calculateCurrentMonthStatus]
  );

  const goToPreviousMonth = useCallback(() => {
    if (readOnly) return;
    const newMonth = subMonths(currentMonth, 1);
    if (onMonthChange && typeof onMonthChange === "function") {
      onMonthChange(newMonth);
    } else {
      setCurrentMonth(newMonth);
    }
  }, [currentMonth, onMonthChange, readOnly]);

  const goToNextMonth = useCallback(() => {
    if (readOnly) return;
    const newMonth = addMonths(currentMonth, 1);
    if (onMonthChange && typeof onMonthChange === "function") {
      onMonthChange(newMonth);
    } else {
      setCurrentMonth(newMonth);
    }
  }, [currentMonth, onMonthChange, readOnly]);

  const goToToday = useCallback(() => {
    if (readOnly) return;
    const today = new Date();
    if (onMonthChange && typeof onMonthChange === "function") {
      onMonthChange(today);
    } else {
      setCurrentMonth(today);
      setSelectedDate(today);
    }
  }, [onMonthChange, readOnly]);

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

  const handleDayClick = useCallback(
    (dayDate) => {
      if (readOnly) {
        showMessage(
          "Ajout/modification d'activité désactivée en mode lecture seule.",
          "info"
        );
        return;
      }
      if (!isValid(dayDate)) {
        showMessage("Erreur : Date sélectionnée invalide.", "error");
        return;
      }

      if (
        currentMonthStatus === "finalized" ||
        currentMonthStatus === "validated" ||
        currentMonthStatus === "rejected" ||
        currentMonthStatus === "pending_review" ||
        currentMonthStatus.startsWith("mixed")
      ) {
        showMessage(
          "Impossible d'ajouter/modifier des activités. Le mois est déjà finalisé, validé, rejeté ou en attente de révision.",
          "info"
        );
        return;
      }

      const dateKey = format(dayDate, "yyyy-MM-dd");
      const existingActivitiesForDay = activitiesByDay.get(dateKey);

      if (existingActivitiesForDay && existingActivitiesForDay.length > 0) {
        showMessage(
          "Une activité existe déjà pour ce jour. Vous pouvez la modifier.",
          "info"
        );
        setSelectedDate(dayDate);
        setEditingActivity(existingActivitiesForDay[0]);
        setIsModalOpen(true);
      } else {
        setSelectedDate(dayDate);
        setEditingActivity(null);
        setIsModalOpen(true);
      }
    },
    [showMessage, currentMonthStatus, activitiesByDay, readOnly]
  );

  const handleActivityClick = useCallback(
    (activity) => {
      if (readOnly) {
        showMessage(
          "Modification d'activité désactivée en mode lecture seule.",
          "info"
        );
        return;
      }
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
        showMessage(
          "Cette activité est finalisée, validée ou en attente de révision. Elle ne peut être ni modifiée ni supprimée.",
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
    [showMessage, userId, readOnly]
  );

  const handleCloseActivityModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingActivity(null);
  }, []);

  const handleSaveActivity = useCallback(
    async (activityData) => {
      if (readOnly) {
        showMessage(
          "Opération de sauvegarde désactivée en mode lecture seule.",
          "info"
        );
        return;
      }
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
        fetchActivitiesForMonth(currentMonth);
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
      readOnly,
    ]
  );

  const requestDeleteFromCalendar = useCallback(
    (activityId, event) => {
      event.stopPropagation();
      if (readOnly) {
        showMessage(
          "Suppression d'activité désactivée en mode lecture seule.",
          "info"
        );
        return;
      }
      const activity = activities.find((act) => act.id === activityId);

      if (
        activity.status === "finalized" ||
        activity.status === "validated" ||
        activity.status === "pending_review"
      ) {
        showMessage(
          "Cette activité est finalisée, validée ou en attente de révision. Elle ne peut pas être supprimée.",
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
    [activities, showMessage, userId, readOnly]
  );

  const confirmDeleteActivity = useCallback(async () => {
    setShowConfirmModal(false);
    if (readOnly) {
      showMessage(
        "Opération de suppression désactivée en mode lecture seule.",
        "info"
      );
      return;
    }
    if (activityToDelete) {
      try {
        await onDeleteActivity(activityToDelete);
        showMessage("Activité supprimée avec succès !", "success");
        fetchActivitiesForMonth(currentMonth);
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
    readOnly,
  ]);

  const cancelDeleteActivity = useCallback(() => {
    setShowConfirmModal(false);
    setActivityToDelete(null);
  }, []);

  const requestResetMonth = useCallback(() => {
    if (readOnly) {
      showMessage(
        "Opération de réinitialisation désactivée en mode lecture seule.",
        "info"
      );
      return;
    }
    if (
      currentMonthStatus === "finalized" ||
      currentMonthStatus === "validated" ||
      currentMonthStatus === "rejected" ||
      currentMonthStatus === "pending_review" ||
      currentMonthStatus.startsWith("mixed")
    ) {
      showMessage(
        "Impossible de réinitialiser le mois. Il est déjà finalisé, validé, rejeté ou en attente de révision. Seul un administrateur peut annuler ces statuts.",
        "info"
      );
      return;
    }
    setShowResetMonthConfirmModal(true);
  }, [currentMonthStatus, showMessage, readOnly]);

  const confirmResetMonth = useCallback(async () => {
    setShowResetMonthConfirmModal(false);
    if (readOnly) {
      showMessage(
        "Opération de réinitialisation désactivée en mode lecture seule.",
        "info"
      );
      return;
    }
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
    readOnly,
  ]);

  const cancelResetMonth = useCallback(() => {
    setShowResetMonthConfirmModal(false);
  }, []);

  const requestFinalizeMonth = useCallback(() => {
    if (readOnly) {
      showMessage(
        "Opération de finalisation désactivée en mode lecture seule.",
        "info"
      );
      return;
    }
    if (
      currentMonthStatus === "finalized" ||
      currentMonthStatus === "validated" ||
      currentMonthStatus === "rejected" ||
      currentMonthStatus === "pending_review" ||
      currentMonthStatus.startsWith("mixed")
    ) {
      showMessage("Ce mois est déjà finalisé ou validé.", "info");
      return;
    }
    setShowFinalizeMonthConfirmModal(true);
  }, [currentMonthStatus, showMessage, readOnly]);

  const confirmFinalizeMonth = useCallback(async () => {
    setShowFinalizeMonthConfirmModal(false);
    if (readOnly) {
      showMessage(
        "Opération de finalisation désactivée en mode lecture seule.",
        "info"
      );
      return;
    }
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
              ...activity,
              status: "finalized",
            },
            true
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
    readOnly,
  ]);

  const cancelFinalizeMonth = useCallback(() => {
    setShowFinalizeMonthConfirmModal(false);
  }, []);

  const requestSendCra = useCallback(() => {
    if (readOnly) {
      showMessage(
        "Opération d'envoi de CRA désactivée en mode lecture seule.",
        "info"
      );
      return;
    }
    if (
      currentMonthStatus !== "finalized" &&
      currentMonthStatus !== "validated"
    ) {
      showMessage(
        "Seuls les mois finalisés ou validés peuvent être envoyés.",
        "info"
      );
      return;
    }
    setShowSendConfirmModal(true);
  }, [currentMonthStatus, showMessage, readOnly]);

  const calculateBillableTime = useCallback(() => {
    return activitiesForCurrentMonth.reduce((sum, activity) => {
      const activityType = activityTypeDefinitions.find(
        (def) => String(def.id) === String(activity.type_activite)
      );
      if (activityType?.is_billable) {
        return sum + (parseFloat(activity.temps_passe) || 0);
      }
      return sum;
    }, 0);
  }, [activitiesForCurrentMonth, activityTypeDefinitions]);

  const totalActivitiesTimeInMonth = useMemo(() => {
    return activitiesForCurrentMonth.reduce(
      (sum, activity) => sum + (parseFloat(activity.temps_passe) || 0),
      0
    );
  }, [activitiesForCurrentMonth]);

  const confirmSendCra = useCallback(async () => {
    setShowSendConfirmModal(false);
    if (readOnly) {
      showMessage(
        "Opération d'envoi de CRA désactivée en mode lecture seule.",
        "info"
      );
      return;
    }
    let activitiesUpdateSuccessCount = 0;
    let activitiesUpdateErrorCount = 0;

    const activitiesToUpdateStatus = activitiesForCurrentMonth.filter(
      (activity) => activity.status === "finalized"
    );

    if (activitiesToUpdateStatus.length === 0) {
      showMessage(
        `Aucune activité finalisée à envoyer pour ${format(
          currentMonth,
          "MMMM",
          {
            locale: fr,
          }
        )}.`,
        "info"
      );
      return;
    }

    for (const activity of activitiesToUpdateStatus) {
      try {
        await onUpdateActivity(
          activity.id,
          {
            ...activity,
            status: "pending_review",
          },
          true
        );
        activitiesUpdateSuccessCount++;
      } catch (error) {
        console.error(
          `CraBoard: Erreur lors de la mise à jour du statut de l'activité ${activity.id}:`,
          error
        );
        activitiesUpdateErrorCount++;
      }
    }

    const totalBillableDays = calculateBillableTime();
    const totalDaysWorked = totalActivitiesTimeInMonth;

    const monthlyReportData = {
      user_id: userId,
      userName: userFirstName, // <-- userFirstName est passé ici. LOG IMPORTANT.
      month: currentMonth.getMonth() + 1,
      year: currentMonth.getFullYear(),
      total_days_worked: totalDaysWorked,
      total_billable_days: totalBillableDays,
      activities_snapshot: activitiesToUpdateStatus.map((act) => act.id),
    };

    console.log(
      "[CraBoard] confirmSendCra: Données de rapport mensuel envoyées:",
      JSON.stringify(monthlyReportData, null, 2)
    );

    try {
      const response = await fetch("/api/monthly_cra_reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(monthlyReportData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Échec de l'envoi du rapport mensuel."
        );
      }

      showMessage(
        `Le CRA de ${format(currentMonth, "MMMM", {
          locale: fr,
        })} a été envoyé et le résumé mensuel créé !`,
        "success"
      );
    } catch (reportError) {
      console.error(
        "CraBoard: Erreur lors de l'envoi du rapport mensuel:",
        reportError
      );
      showMessage(
        `Erreur lors de l'envoi du rapport mensuel: ${reportError.message}`,
        "error"
      );
    }

    fetchActivitiesForMonth(currentMonth);
  }, [
    currentMonth,
    showMessage,
    activitiesForCurrentMonth,
    onUpdateActivity,
    fetchActivitiesForMonth,
    userId,
    userFirstName, // AJOUTÉ aux dépendances
    totalActivitiesTimeInMonth,
    calculateBillableTime,
    readOnly,
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
    const formattedReportData = activitiesForCurrentMonth.map((activity) => {
      const activityType = activityTypeDefinitions.find(
        (def) => String(def.id) === String(activity.type_activite)
      );
      const client = clientDefinitions.find(
        (def) => String(def.id) === String(activity.client_id)
      );

      return {
        ...activity,
        date_activite: parseISO(activity.date_activite),
        activity_type_name_full: activityType
          ? activityType.name
          : "Type Inconnu",
        client_name_full: client ? client.nom_client : "Client Inconnu",
      };
    });

    setMonthlyReportPreviewData({
      reportData: formattedReportData,
      year: currentMonth.getFullYear(),
      month: currentMonth.getMonth() + 1,
      userName: userFirstName,
      userId: userId,
    });
  }, [
    activitiesForCurrentMonth,
    currentMonth,
    userFirstName,
    userId,
    activityTypeDefinitions,
    clientDefinitions,
  ]);

  const handleCloseMonthlyReportPreview = useCallback(() => {
    setShowMonthlyReportPreview(false);
    setMonthlyReportPreviewData(null);
  }, []);

  const totalWorkingDaysInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days.filter(
      (day) => !isWeekend(day, { weekStartsOn: 1 }) && !isPublicHoliday(day)
    ).length;
  }, [currentMonth, isPublicHoliday]);

  const timeDifference = useMemo(() => {
    return (totalActivitiesTimeInMonth - totalWorkingDaysInMonth).toFixed(2);
  }, [totalActivitiesTimeInMonth, totalWorkingDaysInMonth]);

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
        break;
      case "pending_review":
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
          className={`p-2 rounded-full bg-blue-500 text-white transition duration-300 ${
            readOnly ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"
          }`}
          aria-label="Mois précédent"
          disabled={readOnly}
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
        <div className="flex flex-col items-center">
          <h3 className="text-xl font-semibold text-blue-700 mb-1">
            {userFirstName}
          </h3>
          <h2 className="text-2xl font-semibold text-blue-800 flex items-center">
            {format(currentMonth, "MMMM ", { locale: fr })}
            <span className="ml-1">{format(currentMonth, "yyyy")}</span>
            {statusBadge}
          </h2>
        </div>
        <button
          onClick={goToNextMonth}
          className={`p-2 rounded-full bg-blue-500 text-white transition duration-300 ${
            readOnly ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"
          }`}
          aria-label="Mois suivant"
          disabled={readOnly}
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
        currentMonthStatus !== "rejected" &&
        currentMonthStatus !== "pending_review" &&
        !currentMonthStatus.startsWith("mixed");

      allCells.push(
        <div
          className={cellClasses}
          key={format(day, "yyyy-MM-dd")}
          onClick={readOnly ? null : () => handleDayClick(day)}
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
                const clientLabel = client ? client.nom_client : "Non attribué";

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
                  statusColorClass = "bg-blue-300 text-blue-900";
                } else {
                  statusColorClass = "bg-gray-300 text-gray-800";
                }

                const isActivityFinalizedOrValidated =
                  activity.status === "finalized" ||
                  activity.status === "validated" ||
                  activity.status === "pending_review" ||
                  activity.status === "rejected";

                return (
                  <div
                    key={activity.id}
                    className={`relative text-xs px-1 py-0.5 rounded-md mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis
                                ${typeColorClass} ${
                      isActivityFinalizedOrValidated ? "opacity-70" : ""
                    } group`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!readOnly) handleActivityClick(activity);
                      else
                        showMessage(
                          "Modification d'activité désactivée en mode lecture seule.",
                          "info"
                        );
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
                        ? "En attente de révision"
                        : activity.status === "rejected"
                        ? "Rejeté"
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
                            ? "A"
                            : activity.status === "rejected"
                            ? "R"
                            : ""
                        }
                      >
                        {activity.status === "validated"
                          ? "V"
                          : activity.status === "finalized"
                          ? "F"
                          : activity.status === "pending_review"
                          ? "A"
                          : activity.status === "rejected"
                          ? "R"
                          : ""}
                      </span>
                    )}
                    {!isActivityFinalizedOrValidated && !readOnly && (
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

  useEffect(() => {
    if (
      fetchActivitiesForMonth &&
      typeof fetchActivitiesForMonth === "function"
    ) {
      fetchActivitiesForMonth(currentMonth);
    }
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

      {!readOnly && (
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
                currentMonthStatus === "rejected" ||
                currentMonthStatus === "pending_review" ||
                currentMonthStatus.startsWith("mixed")
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            disabled={
              currentMonthStatus === "finalized" ||
              currentMonthStatus === "validated" ||
              currentMonthStatus === "rejected" ||
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
                currentMonthStatus === "rejected" ||
                currentMonthStatus === "pending_review" ||
                currentMonthStatus.startsWith("mixed")
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-orange-600 text-white hover:bg-orange-700"
              }`}
            disabled={
              currentMonthStatus === "finalized" ||
              currentMonthStatus === "validated" ||
              currentMonthStatus === "rejected" ||
              currentMonthStatus === "pending_review" ||
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
              currentMonthStatus !== "finalized" &&
              currentMonthStatus !== "validated"
            }
          >
            Envoyer le CRA
          </button>
        </div>
      )}
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
          readOnly={readOnly}
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
        message="Êtes-vous sûr de vouloir supprimer cette activité ? Cette action est irréversible."
      />
      <ConfirmationModal
        isOpen={showResetMonthConfirmModal}
        onClose={cancelResetMonth}
        onConfirm={confirmResetMonth}
        message={`Confirmez-vous la suppression de TOUTES les activités brouillons pour ${format(
          currentMonth,
          "MMMM ",
          { locale: fr }
        )}. Cette action est irréversible.`}
      />

      <ConfirmationModal
        isOpen={showFinalizeMonthConfirmModal}
        onClose={cancelFinalizeMonth}
        onConfirm={confirmFinalizeMonth}
        message={`Confirmez-vous la finalisation du CRA pour ${format(
          currentMonth,
          "MMMM ",
          { locale: fr }
        )} ? Les activités deviendront non modifiables.`}
      />

      <ConfirmationModal
        isOpen={showSendConfirmModal}
        onClose={cancelSendCra}
        onConfirm={confirmSendCra}
        message={`Confirmez-vous l'envoi du CRA pour ${format(
          currentMonth,
          "MMMM ",
          { locale: fr }
        )} ? Une fois envoyé, vous ne pourrez plus le modifier.`}
      />
    </div>
  );
}
