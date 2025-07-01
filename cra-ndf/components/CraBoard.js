"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react"; // Ajout de useMemo
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
} from "date-fns";
import { fr } from "date-fns/locale";
import ActivityModal from "./ActivityModal";
import SummaryReport from "./SummaryReport";
import ConfirmationModal from "./ConfirmationModal";

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [publicHolidays, setPublicHolidays] = useState([]);
  const [isHolidayOrWeekendSelected, setIsHolidayOrWeekendSelected] =
    useState(false);
  const [showSummaryReport, setShowSummaryReport] = useState(false);
  const [summaryReportMonth, setSummaryReportMonth] = useState(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);

  const [showResetMonthConfirmModal, setShowResetMonthConfirmModal] =
    useState(false);
  const [showFinalizeMonthConfirmModal, setShowFinalizeMonthConfirmModal] =
    useState(false);

  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);

  // Nouvelle fonction pour calculer le statut global du mois
  const calculateCurrentMonthStatus = useCallback(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const userActivitiesInMonth = craActivities.filter(
      (activity) =>
        activity.user_id === currentUserId &&
        activity.date_activite &&
        isValid(parseISO(activity.date_activite)) &&
        parseISO(activity.date_activite) >= monthStart &&
        parseISO(activity.date_activite) <= monthEnd
    );

    const totalCount = userActivitiesInMonth.length;
    if (totalCount === 0) return "empty";

    const validatedCount = userActivitiesInMonth.filter(
      (a) => a.status === "validated"
    ).length;
    const finalizedCount = userActivitiesInMonth.filter(
      (a) => a.status === "finalized"
    ).length;
    const draftCount = userActivitiesInMonth.filter(
      (a) => a.status === "draft"
    ).length;

    if (validatedCount === totalCount) return "validated";
    if (finalizedCount === totalCount) return "finalized";
    if (draftCount === totalCount) return "draft";

    // If there's a mix of statuses
    if (validatedCount > 0 || finalizedCount > 0) return "mixed";

    return "draft"; // Fallback
  }, [currentDate, craActivities, currentUserId]);

  const currentMonthStatus = useMemo(
    () => calculateCurrentMonthStatus(),
    [calculateCurrentMonthStatus]
  );

  // Les fonctions isCurrentMonthFinalized et isCurrentMonthPartiallyFinalized peuvent être simplifiées
  // ou remplacées par l'utilisation directe de currentMonthStatus
  const isCurrentMonthFinalized = useCallback(
    () =>
      currentMonthStatus === "finalized" || currentMonthStatus === "validated",
    [currentMonthStatus]
  );
  const isCurrentMonthPartiallyFinalized = useCallback(
    () => currentMonthStatus === "mixed",
    [currentMonthStatus]
  );

  const fetchPublicHolidays = useCallback(async () => {
    try {
      const currentYear = format(currentDate, "yyyy");
      const nextYear = format(addMonths(currentDate, 12), "yyyy");

      const resCurrent = await fetch(
        `/api/public_holidays?year=${currentYear}&countryCode=FR`
      );
      if (!resCurrent.ok) {
        const errorText = await resCurrent.text();
        throw new Error(
          `Erreur HTTP ${resCurrent.status}: ${
            res.statusText
          } - Détails: ${errorText.substring(0, 100)}...`
        );
      }
      const holidaysCurrent = await resCurrent.json();

      const resNext = await fetch(
        `/api/public_holidays?year=${nextYear}&countryCode=FR`
      );
      if (!resNext.ok) {
        const errorText = await resNext.text();
        throw new Error(
          `Erreur HTTP ${resNext.status}: ${
            res.statusText
          } - Détails: ${errorText.substring(0, 100)}...`
        );
      }
      const holidaysNext = await resNext.json();

      const allHolidays = [...holidaysCurrent, ...holidaysNext];
      setPublicHolidays(allHolidays.map((h) => h.date));
    } catch (error) {
      console.error("Erreur lors de la récupération des jours fériés :", error);
      showMessage(
        `Impossible de charger les jours fériés. Veuillez réessayer. (${error.message})`,
        "warning"
      );
    }
  }, [currentDate, showMessage]);

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

  const handleDayClick = (dayDate) => {
    if (!isValid(dayDate)) {
      console.error("handleDayClick: dayDate invalide reçue", dayDate);
      showMessage(
        "Erreur : Date sélectionnée invalide. Impossible d'ajouter une activité.",
        "error"
      );
      return;
    }

    if (
      currentMonthStatus === "finalized" ||
      currentMonthStatus === "validated"
    ) {
      // Utilisation de currentMonthStatus
      showMessage(
        "Ce mois est finalisé ou validé. Vous ne pouvez pas ajouter de nouvelles activités.",
        "info"
      );
      return;
    }

    const isWeekendDay = isWeekend(dayDate, { weekStartsOn: 1 });
    const isPublicHolidayDay = isPublicHoliday(dayDate);
    const isNonWorkingDay = isWeekendDay || isPublicHolidayDay;

    setSelectedDateForModal(new Date(dayDate.getTime()));
    setEditingActivity(null);
    setIsHolidayOrWeekendSelected(isNonWorkingDay);
    setShowActivityModal(true);
  };

  const handleActivityClick = (activity) => {
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

    const activityDate = activity.date_activite
      ? parseISO(activity.date_activite)
      : null;
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
  };

  const handleCloseModal = () => {
    setShowActivityModal(false);
    setSelectedDateForModal(null);
    setEditingActivity(null);
    setIsHolidayOrWeekendSelected(false);
  };

  const requestDeleteFromCalendar = useCallback(
    (activityId, event) => {
      event.stopPropagation();
      const activity = craActivities.find((act) => act.id === activityId);

      if (activity.user_id !== currentUserId) {
        showMessage(
          "Vous ne pouvez pas supprimer les activités des autres utilisateurs.",
          "error"
        );
        return;
      }

      if (
        activity &&
        (activity.status === "finalized" || activity.status === "validated")
      ) {
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
        showMessage("Activité supprimée avec succès !", "success");
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

  const goToPreviousMonth = useCallback(() => {
    setCurrentDate((prevDate) => subMonths(prevDate, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentDate((prevDate) => addMonths(prevDate, 1));
  }, []);

  const handleToggleSummaryReport = useCallback(() => {
    setShowSummaryReport((prev) => !prev);
    if (!showSummaryReport) {
      setSummaryReportMonth(currentDate);
    } else {
      setSummaryReportMonth(null);
    }
  }, [showSummaryReport, currentDate]);

  useEffect(() => {
    if (showSummaryReport) {
      setSummaryReportMonth(currentDate);
    }
  }, [currentDate, showSummaryReport]);

  const requestResetMonth = useCallback(() => {
    if (
      currentMonthStatus === "finalized" ||
      currentMonthStatus === "validated"
    ) {
      // Utilisation de currentMonthStatus
      showMessage(
        "Ce mois est finalisé ou validé et ne peut pas être réinitialisé. Seul un administrateur peut annuler la finalisation.",
        "info"
      );
      return;
    }
    setShowResetMonthConfirmModal(true);
  }, [currentMonthStatus, showMessage]);

  const confirmResetMonth = useCallback(async () => {
    setShowResetMonthConfirmModal(false);
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    const activitiesInMonth = craActivities.filter(
      (activity) =>
        activity.user_id === currentUserId &&
        activity.date_activite &&
        isValid(parseISO(activity.date_activite)) &&
        parseISO(activity.date_activite) >= monthStart &&
        parseISO(activity.date_activite) <= monthEnd &&
        activity.status === "draft"
    );

    if (activitiesInMonth.length === 0) {
      showMessage(
        `Aucune activité brouillon à réinitialiser pour ${format(
          currentDate,
          "MMMM",
          { locale: fr }
        )}.`,
        "info"
      );
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const activity of activitiesInMonth) {
      try {
        await onDeleteCraActivity(activity.id, true);
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
          currentDate,
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
    currentDate,
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
      currentMonthStatus === "validated"
    ) {
      // Utilisation de currentMonthStatus
      showMessage("Ce mois est déjà finalisé ou validé.", "info");
      return;
    }
    setShowFinalizeMonthConfirmModal(true);
  }, [currentMonthStatus, showMessage]);

  const confirmFinalizeMonth = useCallback(async () => {
    setShowFinalizeMonthConfirmModal(false);
    const year = format(currentDate, "yyyy");
    const month = parseInt(format(currentDate, "MM"));

    await onFinalizeMonth(year, month);
  }, [currentDate, onFinalizeMonth]);

  const cancelFinalizeMonth = useCallback(() => {
    setShowFinalizeMonthConfirmModal(false);
  }, []);

  const requestSendCra = useCallback(() => {
    // Peut envoyer seulement si le mois est finalisé ou validé
    if (
      currentMonthStatus !== "finalized" &&
      currentMonthStatus !== "validated"
    ) {
      // Utilisation de currentMonthStatus
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
    const year = format(currentDate, "yyyy");
    const month = parseInt(format(currentDate, "MM"));

    try {
      const response = await fetch(`/api/cra_activities?action=send-cra`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          month,
          userId: currentUserId,
          userName: currentUserName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Échec de l'envoi du CRA.");
      }

      showMessage(
        `Le CRA pour ${currentUserName} pour ${format(currentDate, "MMMM", {
          locale: fr,
        })} a été envoyé avec succès !`,
        "success"
      );
    } catch (error) {
      console.error("Erreur lors de l'envoi du CRA :", error);
      showMessage(`Erreur lors de l'envoi du CRA : ${error.message}`, "error");
    }
  }, [currentDate, currentUserId, currentUserName, showMessage]);

  const cancelSendCra = useCallback(() => {
    setShowSendConfirmModal(false);
  }, []);

  const renderHeader = () => {
    let statusBadge = null;
    if (currentMonthStatus === "validated") {
      statusBadge = (
        <span className="ml-3 text-sm font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">
          VALIDÉ
        </span>
      );
    } else if (currentMonthStatus === "finalized") {
      statusBadge = (
        <span className="ml-3 text-sm font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
          FINALISÉ
        </span>
      );
    } else if (currentMonthStatus === "mixed") {
      statusBadge = (
        <span className="ml-3 text-sm font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
          PARTIELLEMENT FINALISÉ
        </span>
      );
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
        <h2 className="text-2xl font-semibold text-blue-800">
          {format(currentDate, "MMMM", { locale: fr })}
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
    const monthStart = startOfMonth(currentDate);
    const numDaysInMonth = getDaysInMonth(currentDate);
    const startCalendarDay = startOfWeek(monthStart, {
      locale: fr,
      weekStartsOn: 1,
    });

    const allCells = [];
    let day = startCalendarDay;

    // Remplir les jours du mois précédent
    while (day < monthStart) {
      allCells.push(
        <div
          key={`empty-prev-${format(day, "yyyy-MM-dd")}`}
          className="p-2 h-32 sm:h-40 bg-gray-100 opacity-50 rounded-lg m-0.5"
        ></div>
      );
      day = addDays(day, 1);
    }

    // Jours du mois actuel
    for (let i = 0; i < numDaysInMonth; i++) {
      const currentDay = addDays(monthStart, i);
      const formattedDate = format(currentDay, "d");
      const cloneDay = currentDay;

      const activitiesForDay = craActivities
        .filter(
          (activity) =>
            activity.user_id === currentUserId &&
            activity.date_activite &&
            isValid(parseISO(activity.date_activite)) &&
            isSameDay(parseISO(activity.date_activite), cloneDay)
        )
        .sort((a, b) => {
          if ((a.type_activite || "") < (b.type_activite || "")) return -1;
          if ((a.type_activite || "") > (b.type_activite || "")) return 1;
          return 0;
        });

      const isToday = isSameDay(cloneDay, new Date());
      const isWeekendDay = isWeekend(cloneDay, { weekStartsOn: 1 });
      const isPublicHolidayDay = isPublicHoliday(cloneDay);

      const isNonWorkingDay = isWeekendDay || isPublicHolidayDay;

      let cellClasses = `
        p-2 h-32 sm:h-40 flex flex-col justify-start border border-gray-200 rounded-lg m-0.5
        transition duration-200 overflow-hidden relative
      `;

      if (isToday) {
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
          key={format(cloneDay, "yyyy-MM-dd")}
          onClick={() => handleDayClick(cloneDay)}
        >
          <span
            className={`text-sm font-semibold mb-1 ${
              isToday ? "text-blue-800" : ""
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
          <div className="flex-grow overflow-y-auto w-full pr-1 scrollbar-hide">
            {activitiesForDay.map((activity) => {
              const client = clientDefinitions.find(
                (c) => c.id === activity.client_id
              );
              const clientLabel = client ? client.nom_client : "Non attribué";

              const activityTypeLabel = activity.type_activite || "Activité";
              const timeSpentLabel = activity.temps_passe
                ? `${parseFloat(activity.temps_passe)}j`
                : "";
              const displayLabel = `${activityTypeLabel}${
                timeSpentLabel ? ` (${timeSpentLabel})` : ""
              }`;

              const typeColorClass = activityTypeLabel.includes("Absence")
                ? "bg-red-200 text-red-800"
                : activityTypeLabel === "Heure supplémentaire"
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
                  }`}
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
                      title={
                        activity.status === "validated" ? "Validé" : "Finalisé"
                      }
                    >
                      {activity.status === "validated" ? "V" : "F"}
                    </span>
                  )}
                  {!isActivityFinalizedOrValidated && (
                    <button
                      onClick={(e) => requestDeleteFromCalendar(activity.id, e)}
                      className="absolute top-0 right-0 h-full flex items-center justify-center p-1 bg-red-600 hover:bg-red-700 text-white rounded-tr-md rounded-br-md opacity-0 hover:opacity-100 transition-opacity duration-200"
                      title="Supprimer l'activité"
                      aria-label="Supprimer l'activité"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
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

    const totalCells = 6 * 7;
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

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full mt-8">
      <div className="calendar-header mb-4">
        {renderHeader()}
        <div className="flex justify-center space-x-4 mt-6">
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
                currentMonthStatus === "validated"
                  ? "bg-green-500 text-white cursor-not-allowed opacity-70"
                  : "bg-orange-500 text-white hover:bg-orange-600"
              }`}
            disabled={
              currentMonthStatus === "finalized" ||
              currentMonthStatus === "validated"
            }
          >
            {currentMonthStatus === "finalized" ||
            currentMonthStatus === "validated"
              ? "Mois finalisé"
              : "Finaliser le mois"}
          </button>
          <button
            onClick={requestResetMonth}
            className={`px-6 py-3 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition duration-300
              ${
                currentMonthStatus === "finalized" ||
                currentMonthStatus === "validated"
                  ? "cursor-not-allowed opacity-70"
                  : ""
              }`}
            disabled={
              currentMonthStatus === "finalized" ||
              currentMonthStatus === "validated"
            }
          >
            Réinitialiser le mois
          </button>
          <button
            onClick={requestSendCra}
            className={`px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md transition duration-300
              ${
                currentMonthStatus !== "finalized" &&
                currentMonthStatus !== "validated"
                  ? "cursor-not-allowed opacity-70"
                  : "hover:bg-purple-700"
              }`}
            disabled={
              currentMonthStatus !== "finalized" &&
              currentMonthStatus !== "validated"
            }
          >
            Envoyer le CRA
          </button>
        </div>
      </div>

      {renderDaysOfWeek()}
      {renderCells()}

      {showActivityModal && (
        <ActivityModal
          isOpen={showActivityModal}
          onClose={handleCloseModal}
          selectedDate={selectedDateForModal}
          activityTypeDefinitions={activityTypeDefinitions}
          clientDefinitions={clientDefinitions}
          editingActivity={editingActivity}
          onSave={editingActivity ? onUpdateCraActivity : onAddCraActivity}
          isHolidayOrWeekendSelected={isHolidayOrWeekendSelected}
          showMessage={showMessage}
        />
      )}

      {showSummaryReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative p-6">
            <button
              onClick={handleToggleSummaryReport}
              className="absolute top-4 right-4 p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition duration-200"
              aria-label="Fermer le rapport"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2">
              Récapitulatif CRA pour {currentUserName} pour{" "}
              {format(summaryReportMonth, "MMMM", { locale: fr })}
            </h2>
            <SummaryReport
              craActivities={craActivities}
              activityTypeDefinitions={activityTypeDefinitions}
              monthToDisplay={summaryReportMonth}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              showMessage={showMessage}
              clientDefinitions={clientDefinitions}
            />
          </div>
        </div>
      )}

      {/* Modals de confirmation */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={cancelDeleteActivity}
        onConfirm={confirmDeleteActivity}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer cette activité ? Cette action est irréversible."
      />

      <ConfirmationModal
        isOpen={showResetMonthConfirmModal}
        onClose={cancelResetMonth}
        onConfirm={confirmResetMonth}
        title="Confirmer la réinitialisation du mois"
        message={`Êtes-vous sûr de vouloir supprimer TOUTES les activités brouillon pour ${format(
          currentDate,
          "MMMM",
          { locale: fr }
        )} ?`}
      />

      <ConfirmationModal
        isOpen={showFinalizeMonthConfirmModal}
        onClose={cancelFinalizeMonth}
        onConfirm={confirmFinalizeMonth}
        title="Confirmer la finalisation du mois"
        message={`Êtes-vous sûr de vouloir finaliser toutes les activités brouillon pour ${format(
          currentDate,
          "MMMM",
          { locale: fr }
        )} ? Une fois finalisées, les activités ne peuvent pas être modifiées ou supprimées (sauf par un administrateur).`}
      />

      <ConfirmationModal
        isOpen={showSendConfirmModal}
        onClose={cancelSendCra}
        onConfirm={confirmSendCra}
        title="Confirmer l'envoi du CRA"
        message={`Êtes-vous sûr de vouloir envoyer le CRA pour ${currentUserName} pour ${format(
          currentDate,
          "MMMM",
          { locale: fr }
        )} ?`}
      />
    </div>
  );
}
