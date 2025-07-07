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
  addDays,
  isSameMonth,
  isSameDay,
  isWeekend,
  parseISO,
  isValid,
  eachDayOfInterval,
  isBefore,
} from "date-fns";
import { fr } from "date-fns/locale";
import ActivityModal from "./ActivityModal";
import SummaryReport from "./SummaryReport";
import ConfirmationModal from "./ConfirmationModal";
// Suppression des imports Drag and Drop:
// import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const dayNames = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

export default function CraBoard({
  craActivities = [],
  activityTypeDefinitions = [],
  clientDefinitions = [],
  onAddCraActivity,
  onUpdateCraActivity,
  onDeleteCraActivity,
  showMessage,
  onFinalizeMonth,
  currentUserId,
  currentUserName,
}) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingActivity, setEditingActivity] = useState(null);
  const [publicHolidays, setPublicHolidays] = useState([]);
  const [isHolidayOrWeekendSelected, setIsHolidayOrWeekendSelected] =
    useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState(null);
  const [showSummaryReport, setShowSummaryReport] = useState(false);
  const [summaryReportMonth, setSummaryReportMonth] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [showResetMonthConfirmModal, setShowResetMonthConfirmModal] =
    useState(false);
  const [showFinalizeMonthConfirmModal, setShowFinalizeMonthConfirmModal] =
    useState(false);
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);

  const currentMonth = useMemo(
    () => startOfMonth(selectedDate),
    [selectedDate]
  );

  const fetchPublicHolidays = useCallback(async () => {
    const year = selectedDate.getFullYear();
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
      console.error("Error fetching public holidays:", error);
      showMessage(
        `Impossible de charger les jours fériés : ${error.message}`,
        "error"
      );
      setPublicHolidays([]);
    }
  }, [selectedDate, showMessage]);

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

  const calculateCurrentMonthStatus = useCallback(() => {
    const userActivitiesInMonth = craActivities.filter(
      (activity) =>
        activity.user_id === currentUserId &&
        activity.date_activite &&
        isValid(parseISO(activity.date_activite)) && // Parse the string date
        isSameMonth(parseISO(activity.date_activite), selectedDate) // Parse the string date
    );

    if (userActivitiesInMonth.length === 0) return "empty";

    const statuses = new Set(userActivitiesInMonth.map((a) => a.status));

    if (statuses.has("validated")) return "validated";
    if (statuses.has("finalized")) return "finalized";
    if (statuses.has("rejected")) return "rejected";

    if (statuses.size === 1 && statuses.has("draft")) return "draft";

    return "mixed";
  }, [craActivities, selectedDate, currentUserId]);

  const currentMonthStatus = useMemo(
    () => calculateCurrentMonthStatus(),
    [calculateCurrentMonthStatus]
  );

  const goToPreviousMonth = useCallback(() => {
    setSelectedDate((prevDate) => subMonths(prevDate, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedDate((prevDate) => addMonths(prevDate, 1));
  }, []);

  const handleDayClick = useCallback(
    (dayDate) => {
      if (!isValid(dayDate)) {
        showMessage("Erreur : Date sélectionnée invalide.", "error");
        return;
      }

      if (
        currentMonthStatus === "finalized" ||
        currentMonthStatus === "validated" ||
        currentMonthStatus === "mixed_finalized" ||
        currentMonthStatus === "mixed_validated"
      ) {
        showMessage(
          "Ce mois est finalisé ou validé. Vous ne pouvez pas ajouter de nouvelles activités.",
          "info"
        );
        return;
      }

      const isWeekendDay = isWeekend(dayDate, { weekStartsOn: 1 });
      const isPublicHolidayDay = isPublicHoliday(dayDate);
      const isNonWorkingDay = isWeekendDay || isPublicHolidayDay;

      setSelectedDateForModal(dayDate);
      setEditingActivity(null); // S'assurer que nous ajoutons, pas modifions
      setIsHolidayOrWeekendSelected(isNonWorkingDay);
      setShowActivityModal(true);
    },
    [showMessage, currentMonthStatus, isPublicHoliday]
  );

  const handleActivityClick = useCallback(
    (activity) => {
      if (activity.user_id !== currentUserId) {
        showMessage(
          "Vous ne pouvez pas modifier ou supprimer les activités des autres utilisateurs.",
          "error"
        );
        return;
      }

      if (activity.status === "finalized" || activity.status === "validated") {
        showMessage(
          "Cette activité est finalisée ou validée et ne peut pas être modifiée ou supprimée.",
          "info"
        );
        return;
      }

      // IMPORTANT: parseISO car activity.date_activite vient de la DB en string
      const activityDate = parseISO(activity.date_activite);
      if (!activityDate || !isValid(activityDate)) {
        console.error(
          "handleActivityClick: Date d'activité invalide de la base de données",
          activity.date_activite
        );
        showMessage(
          "Erreur : Date d'activité existante invalide. Impossible de modifier.",
          "error"
        );
        return;
      }

      const isWeekendDay = isWeekend(activityDate, { weekStartsOn: 1 });
      const isPublicHolidayDay = isPublicHoliday(activityDate);

      setSelectedDateForModal(activityDate);
      setEditingActivity(activity);
      setIsHolidayOrWeekendSelected(isWeekendDay || isPublicHolidayDay);
      setShowActivityModal(true);
    },
    [showMessage, currentUserId, isPublicHoliday]
  );

  const handleCloseActivityModal = useCallback(() => {
    setShowActivityModal(false);
    setSelectedDateForModal(null);
    setEditingActivity(null);
    setIsHolidayOrWeekendSelected(false);
  }, []);

  const handleSaveActivity = useCallback(
    async (activityData) => {
      try {
        if (editingActivity) {
          // Appelle la fonction de mise à jour du parent avec l'ID et les données
          await onUpdateCraActivity(editingActivity.id, activityData);
          showMessage("Activité modifiée avec succès !", "success");
        } else {
          // Appelle la fonction d'ajout du parent avec les données
          await onAddCraActivity(activityData);
          showMessage("Activité ajoutée avec succès !", "success");
        }
        handleCloseActivityModal(); // Ferme le modal après sauvegarde
      } catch (error) {
        console.error("Erreur lors de la sauvegarde de l'activité:", error);
        showMessage(`Échec de la sauvegarde: ${error.message}`, "error");
      }
    },
    [
      editingActivity,
      onAddCraActivity,
      onUpdateCraActivity,
      showMessage,
      handleCloseActivityModal,
    ]
  );

  const requestDeleteFromCalendar = useCallback(
    (activityId, event) => {
      event.stopPropagation();
      const activity = craActivities.find((act) => act.id === activityId);

      if (!activity) {
        showMessage("Activité non trouvée pour suppression.", "error");
        return;
      }

      if (activity.user_id !== currentUserId) {
        showMessage(
          "Vous ne pouvez pas supprimer les activités des autres utilisateurs.",
          "error"
        );
        return;
      }

      if (activity.status === "finalized" || activity.status === "validated") {
        showMessage(
          "Cette activité est finalisée ou validée et ne peut pas être supprimée.",
          "info"
        );
        return;
      }
      setActivityToDelete(activityId);
      setShowConfirmModal(true);
    },
    [craActivities, showMessage, currentUserId]
  );

  const confirmDeleteActivity = useCallback(async () => {
    setShowConfirmModal(false);
    if (activityToDelete) {
      try {
        await onDeleteCraActivity(activityToDelete);
        showMessage("Activité supprimée avec succès !", "success"); // Message de succès ici
      } catch (error) {
        console.error("Erreur lors de la suppression du calendrier :", error);
        showMessage(`Erreur de suppression : ${error.message}`, "error");
      } finally {
        setActivityToDelete(null);
      }
    }
  }, [activityToDelete, onDeleteCraActivity, showMessage]);

  const cancelDeleteActivity = useCallback(() => {
    setShowConfirmModal(false);
    setActivityToDelete(null);
  }, []);

  const requestResetMonth = useCallback(() => {
    if (
      currentMonthStatus === "finalized" ||
      currentMonthStatus === "validated" ||
      currentMonthStatus === "mixed_finalized" ||
      currentMonthStatus === "mixed_validated"
    ) {
      showMessage(
        "Ce mois est finalisé ou validé. Seul un administrateur peut annuler la finalisation.",
        "info"
      );
      return;
    }
    setShowResetMonthConfirmModal(true);
  }, [currentMonthStatus, showMessage]);

  const confirmResetMonth = useCallback(async () => {
    setShowResetMonthConfirmModal(false);
    const activitiesToReset = craActivities.filter(
      (activity) =>
        activity.user_id === currentUserId &&
        activity.date_activite &&
        isValid(parseISO(activity.date_activite)) && // Parse the string date
        isSameMonth(parseISO(activity.date_activite), selectedDate) && // Parse the string date
        activity.status === "draft"
    );

    if (activitiesToReset.length === 0) {
      showMessage(
        `Aucune activité brouillon à réinitialiser pour ${format(
          selectedDate,
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
        await onDeleteCraActivity(activity.id);
        successCount++;
      } catch (error) {
        console.error(
          `Erreur lors de la suppression de l'activité ${activity.id} :`,
          error
        );
        errorCount++;
      }
    }

    if (errorCount === 0) {
      showMessage(
        `${successCount} activités brouillon supprimées pour ${format(
          selectedDate,
          "MMMM",
          { locale: fr }
        )}.`,
        "success"
      );
    } else if (successCount > 0) {
      showMessage(
        `${successCount} activités brouillon supprimées, mais ${errorCount} erreurs rencontrées.`,
        "warning"
      );
    } else {
      showMessage(
        `Échec de la réinitialisation du mois. Aucune activité supprimée.`,
        "error"
      );
    }
  }, [
    selectedDate,
    craActivities,
    onDeleteCraActivity,
    showMessage,
    currentUserId,
  ]);

  const cancelResetMonth = useCallback(() => {
    setShowResetMonthConfirmModal(false);
  }, []);

  const requestFinalizeMonth = useCallback(() => {
    if (
      currentMonthStatus === "finalized" ||
      currentMonthStatus === "validated" ||
      currentMonthStatus === "mixed_finalized" ||
      currentMonthStatus === "mixed_validated"
    ) {
      showMessage("Ce mois est déjà finalisé ou validé.", "info");
      return;
    }
    setShowFinalizeMonthConfirmModal(true);
  }, [currentMonthStatus, showMessage]);

  const confirmFinalizeMonth = useCallback(async () => {
    setShowFinalizeMonthConfirmModal(false);
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    await onFinalizeMonth(currentUserId, year, month);
  }, [selectedDate, onFinalizeMonth, currentUserId]);

  const cancelFinalizeMonth = useCallback(() => {
    setShowFinalizeMonthConfirmModal(false);
  }, []);

  const requestSendCra = useCallback(() => {
    if (
      currentMonthStatus !== "finalized" &&
      currentMonthStatus !== "validated" &&
      currentMonthStatus !== "mixed_finalized" &&
      currentMonthStatus !== "mixed_validated" &&
      currentMonthStatus !== "mixed"
    ) {
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
    const year = format(selectedDate, "yyyy");
    const month = parseInt(format(selectedDate, "MM"));

    try {
      console.log(
        `CRA pour ${currentUserName} pour ${format(selectedDate, "MMMM", {
          locale: fr,
        })} envoyé (simulé).`
      );
      showMessage(
        `Le CRA pour ${currentUserName} pour ${format(selectedDate, "MMMM", {
          locale: fr,
        })} a été envoyé avec succès (simulé) !`,
        "success"
      );
    } catch (error) {
      console.error("Erreur lors de l'envoi du CRA (simulé) :", error);
      showMessage(
        `Erreur lors de l'envoi du CRA (simulé) : ${error.message}`,
        "error"
      );
    }
  }, [selectedDate, currentUserId, currentUserName, showMessage]);

  const cancelSendCra = useCallback(() => {
    setShowSendConfirmModal(false);
  }, []);

  const handleToggleSummaryReport = useCallback(() => {
    setShowSummaryReport((prev) => !prev);
    if (!showSummaryReport) {
      setSummaryReportMonth(selectedDate);
    } else {
      setSummaryReportMonth(null);
    }
  }, [showSummaryReport, selectedDate]);

  useEffect(() => {
    if (showSummaryReport) {
      setSummaryReportMonth(selectedDate);
    }
  }, [selectedDate, showSummaryReport]);

  // Suppression de la fonction onDragEnd

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
      case "mixed":
      case "mixed_finalized":
      case "mixed_validated":
      case "mixed_rejected":
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
          {format(selectedDate, "MMMM yyyy", { locale: fr })}{" "}
          {/* Ajout de l'année */}
          {statusBadge}
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
    const days = [];
    const dateFormat = "EEEE";
    // Start week on Monday for French locale
    const startWeekDay = startOfWeek(new Date(), {
      locale: fr,
      weekStartsOn: 1,
    });

    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="text-center font-bold text-gray-700 p-2" key={i}>
          {format(addDays(startWeekDay, i), dateFormat, { locale: fr })}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-7 border-b border-gray-200">{days}</div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(selectedDate);
    const numDaysInMonth = getDaysInMonth(selectedDate);
    const startCalendarDay = startOfWeek(monthStart, {
      locale: fr,
      weekStartsOn: 1,
    });

    const allCells = [];
    let day = startCalendarDay;

    // Jours du mois précédent pour remplir le début du calendrier
    while (isBefore(day, monthStart)) {
      allCells.push(
        <div
          key={`empty-prev-${format(day, "yyyy-MM-dd")}`}
          className="p-2 h-32 sm:h-40 bg-gray-100 opacity-50 rounded-lg m-0.5"
        ></div>
      );
      day = addDays(day, 1);
    }

    // Jours du mois courant
    for (let i = 0; i < numDaysInMonth; i++) {
      const currentDay = addDays(monthStart, i);
      const formattedDate = format(currentDay, "d");
      // Suppression de droppableDateId car plus de D&D

      // Filtrer les activités pour le jour courant et l'utilisateur actuel
      const activitiesForDay = craActivities
        .filter(
          (activity) =>
            String(activity.user_id) === String(currentUserId) && // Assurer la comparaison de chaînes
            activity.date_activite &&
            isValid(parseISO(activity.date_activite)) && // IMPORTANT: Parse la date string de la DB
            isSameDay(parseISO(activity.date_activite), currentDay)
        )
        .sort((a, b) => {
          // Tri par type d'activité puis par client
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
            clientDefinitions.find((c) => String(c.id) === String(a.client_id))
              ?.name ||
            a.client_name ||
            "";
          const clientB =
            clientDefinitions.find((c) => String(c.id) === String(b.client_id))
              ?.name ||
            b.client_name ||
            "";
          if (clientA < clientB) return -1;
          if (clientA > clientB) return 1;
          return 0;
        });

      const isTodayHighlight = isSameDay(currentDay, new Date());
      const isWeekendDay = isWeekend(currentDay, { weekStartsOn: 1 });
      const isPublicHolidayDay = isPublicHoliday(currentDay);

      const isNonWorkingDay = isWeekendDay || isPublicHolidayDay;

      let cellClasses = `
        p-2 h-32 sm:h-40 flex flex-col justify-start border border-gray-200 rounded-lg m-0.5
        transition duration-200 overflow-hidden relative
      `;

      if (isTodayHighlight) {
        cellClasses += " bg-blue-100 border-blue-500 shadow-md text-blue-800";
      } else if (isNonWorkingDay) {
        cellClasses += " bg-gray-200 text-gray-500 cursor-not-allowed";
      } else {
        cellClasses +=
          " bg-white text-gray-900 hover:bg-blue-50 cursor-pointer";
      }

      allCells.push(
        <div
          className={cellClasses}
          key={format(currentDay, "yyyy-MM-dd")}
          onClick={() => handleDayClick(currentDay)}
        >
          <span
            className={`text-sm font-semibold mb-1 ${
              isTodayHighlight ? "text-blue-800" : ""
            }`}
          >
            {formattedDate}
          </span>
          {isNonWorkingDay && (
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
            {activitiesForDay.map((activity) => {
              // Trouver le client et le type d'activité par leur ID
              const client = clientDefinitions.find(
                (c) => String(c.id) === String(activity.client_id)
              );
              const clientLabel = client
                ? client.name || client.nom_client
                : activity.client_name || "Non attribué"; // Fallback au nom stocké si ID non trouvé

              const activityTypeObj = activityTypeDefinitions.find(
                (type) => String(type.id) === String(activity.type_activite) // Recherche par ID
              );
              const activityTypeLabel = activityTypeObj
                ? activityTypeObj.name || activityTypeObj.libelle
                : activity.type_activite_name ||
                  activity.type_activite ||
                  "Activité"; // Fallback au nom stocké ou ID

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
                    .includes("heure supplémentaire")
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
              } else {
                statusColorClass = "bg-gray-300 text-gray-800";
              }

              const isActivityFinalizedOrValidated =
                activity.status === "finalized" ||
                activity.status === "validated";

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
                      : isActivityFinalizedOrValidated
                      ? "Finalisé"
                      : "Brouillon"
                  }\nFacturable: ${
                    activity.is_billable === 1 ? "Oui" : "Non"
                  }\nUtilisateur: ${currentUserName}`}
                >
                  {`${displayLabel} - ${clientLabel}${overrideLabel}`}
                  {activity.is_billable === 1 ? (
                    <span className="ml-1 text-green-600" title="Facturable">
                      ✔
                    </span>
                  ) : (
                    <span className="ml-1 text-red-600" title="Non facturable">
                      ✖
                    </span>
                  )}
                  {isActivityFinalizedOrValidated && (
                    <span
                      className={`absolute top-0 right-0 h-full flex items-center justify-center p-1 text-xs font-semibold rounded-tr-md rounded-br-md ${statusColorClass}`}
                      title={activity.status === "validated" ? "V" : "F"}
                    >
                      {activity.status === "validated" ? "V" : "F"}
                    </span>
                  )}
                  {!isActivityFinalizedOrValidated && (
                    <button
                      onClick={(e) => requestDeleteFromCalendar(activity.id, e)}
                      className="absolute top-0 right-0 h-full flex items-center justify-center p-1 bg-red-600 hover:bg-red-700 text-white rounded-tr-md rounded-br-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      title="Supprimer l'activité"
                      aria-label="Supprimer l'activité"
                    >
                      &times; {/* Utilisation d'un caractère X */}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }

    // Jours du mois suivant pour remplir la fin du calendrier
    const totalCells = 6 * 7; // Assure 6 semaines complètes pour le calendrier
    while (allCells.length < totalCells) {
      allCells.push(
        <div
          key={`empty-next-${format(day, "yyyy-MM-dd")}`}
          className="p-2 h-32 sm:h-40 bg-gray-100 opacity-50 rounded-lg m-0.5"
        ></div>
      );
      day = addDays(day, 1);
    }

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

  const totalWorkingDaysInMonth = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days.filter(
      (day) => !isWeekend(day, { weekStartsOn: 1 }) && !isPublicHoliday(day)
    ).length;
  }, [selectedDate, isPublicHoliday]);

  const totalActivitiesTimeInMonth = useMemo(() => {
    return craActivities
      .filter(
        (activity) =>
          String(activity.user_id) === String(currentUserId) && // Assurer la comparaison de chaînes
          activity.date_activite &&
          isValid(parseISO(activity.date_activite)) && // Parse the string date
          isSameMonth(parseISO(activity.date_activite), selectedDate) // Parse the string date
      )
      .reduce(
        (sum, activity) => sum + (parseFloat(activity.temps_passe) || 0),
        0
      );
  }, [craActivities, selectedDate, currentUserId]);

  const timeDifference = useMemo(() => {
    return (totalActivitiesTimeInMonth - totalWorkingDaysInMonth).toFixed(2);
  }, [totalActivitiesTimeInMonth, totalWorkingDaysInMonth]);

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

      <div className="flex justify-center space-x-4 mb-8">
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
              currentMonthStatus === "mixed_finalized" ||
              currentMonthStatus === "mixed_validated"
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          disabled={
            currentMonthStatus === "finalized" ||
            currentMonthStatus === "validated" ||
            currentMonthStatus === "mixed_finalized" ||
            currentMonthStatus === "mixed_validated"
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
              currentMonthStatus === "mixed_finalized" ||
              currentMonthStatus === "mixed_validated"
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-orange-600 text-white hover:bg-orange-700"
            }`}
          disabled={
            currentMonthStatus === "finalized" ||
            currentMonthStatus === "validated" ||
            currentMonthStatus === "mixed_finalized" ||
            currentMonthStatus === "mixed_validated"
          }
        >
          Réinitialiser le mois
        </button>
        <button
          onClick={requestSendCra}
          className={`px-6 py-3 font-semibold rounded-lg shadow-md transition duration-300
            ${
              currentMonthStatus === "finalized" ||
              currentMonthStatus === "validated" ||
              currentMonthStatus === "mixed_finalized" ||
              currentMonthStatus === "mixed_validated" ||
              currentMonthStatus === "mixed"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          disabled={
            !(
              currentMonthStatus === "finalized" ||
              currentMonthStatus === "validated" ||
              currentMonthStatus === "mixed_finalized" ||
              currentMonthStatus === "mixed_validated" ||
              currentMonthStatus === "mixed"
            )
          }
        >
          Envoyer le CRA
        </button>
      </div>

      <div className="calendar-grid">
        {renderDaysOfWeek()}
        {renderCells()}
      </div>

      <ActivityModal
        isOpen={showActivityModal}
        onClose={handleCloseActivityModal}
        date={selectedDateForModal}
        editingActivity={editingActivity}
        clientDefinitions={clientDefinitions}
        activityTypeDefinitions={activityTypeDefinitions}
        onSaveActivity={handleSaveActivity}
        showMessage={showMessage}
        isHolidayOrWeekend={isHolidayOrWeekendSelected}
        currentUserId={currentUserId}
        craActivities={craActivities}
      />

      {showSummaryReport && summaryReportMonth && (
        <SummaryReport
          month={summaryReportMonth}
          craActivities={craActivities}
          clientDefinitions={clientDefinitions}
          activityTypeDefinitions={activityTypeDefinitions}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onClose={handleToggleSummaryReport}
          showMessage={showMessage}
        />
      )}

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={cancelDeleteActivity}
        onConfirm={confirmDeleteActivity}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer cette activité ?"
      />
      <ConfirmationModal
        isOpen={showResetMonthConfirmModal}
        onClose={cancelResetMonth}
        onConfirm={confirmResetMonth}
        title="Confirmer la réinitialisation du mois"
        message="Toutes les activités en brouillon de ce mois seront supprimées. Êtes-vous sûr ?"
      />
      <ConfirmationModal
        isOpen={showFinalizeMonthConfirmModal}
        onClose={cancelFinalizeMonth}
        onConfirm={confirmFinalizeMonth}
        title="Confirmer la finalisation du mois"
        message="La finalisation rendra les activités non modifiables. Êtes-vous sûr de vouloir finaliser ce mois ?"
      />
      <ConfirmationModal
        isOpen={showSendConfirmModal}
        onClose={cancelSendCra}
        onConfirm={confirmSendCra}
        title="Confirmer l'envoi du CRA"
        message="Ceci simulera l'envoi du CRA. Êtes-vous sûr de vouloir continuer ?"
      />
    </div>
  );
}
