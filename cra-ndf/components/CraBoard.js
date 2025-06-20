// components/CraBoard.js
"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "date-fns";
import { fr } from "date-fns/locale";
import ActivityModal from "./ActivityModal";
import SummaryReport from "./SummaryReport"; // Importer SummaryReport ici

export default function CraBoard({
  craActivities = [],
  activityTypeDefinitions = [],
  clientDefinitions = [],
  onAddCraActivity,
  onUpdateCraActivity,
  onDeleteCraActivity,
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [message, setMessage] = useState("");
  const [isMessageVisible, setIsMessageVisible] = useState(false);
  const [publicHolidays, setPublicHolidays] = useState([]);
  const [isHolidayOrWeekendSelected, setIsHolidayOrWeekendSelected] =
    useState(false);
  const [showSummaryReport, setShowSummaryReport] = useState(false); // État pour afficher/masquer le récap
  const [summaryReportMonth, setSummaryReportMonth] = useState(null); // Mois à afficher dans le récap

  const showTemporaryMessage = useCallback((msg) => {
    setMessage(msg);
    setIsMessageVisible(true);
    const timer = setTimeout(() => {
      setIsMessageVisible(false);
      setMessage("");
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Fetch public holidays for the current year and the next
  const fetchPublicHolidays = useCallback(async () => {
    try {
      const currentYear = format(currentDate, "yyyy");
      const nextYear = format(addMonths(currentDate, 12), "yyyy");

      const resCurrent = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${currentYear}/FR`
      );
      const holidaysCurrent = await resCurrent.json();

      const resNext = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${nextYear}/FR`
      );
      const holidaysNext = await resNext.json();

      const allHolidays = [...holidaysCurrent, ...holidaysNext];
      setPublicHolidays(allHolidays.map((h) => h.date));
    } catch (error) {
      console.error("Erreur lors de la récupération des jours fériés:", error);
      showTemporaryMessage(
        "Impossible de charger les jours fériés. Vérifiez votre connexion internet."
      );
    }
  }, [currentDate, showTemporaryMessage]); // Dependencies for useCallback

  useEffect(() => {
    fetchPublicHolidays(); // Call the async function
  }, [fetchPublicHolidays]); // Dependency for useEffect (the function itself)

  const isPublicHoliday = useCallback(
    (date) => {
      const formattedDate = format(date, "yyyy-MM-dd");
      return publicHolidays.includes(formattedDate);
    },
    [publicHolidays]
  );

  const handleDayClick = (dayDate) => {
    const isWeekendDay = isWeekend(dayDate, { weekStartsOn: 1 });
    const isPublicHolidayDay = isPublicHoliday(dayDate);
    const isNonWorkingDay = isWeekendDay || isPublicHolidayDay;

    setSelectedDateForModal(dayDate);
    setEditingActivity(null);
    setIsHolidayOrWeekendSelected(isNonWorkingDay);
    setShowActivityModal(true);
  };

  const handleActivityClick = (activity) => {
    const activityDate = new Date(activity.date_activite);
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

  const handleDeleteFromCalendar = useCallback(
    async (activityId, event) => {
      event.stopPropagation();
      if (confirm("Êtes-vous sûr de vouloir supprimer cette activité ?")) {
        try {
          await onDeleteCraActivity(activityId);
          showTemporaryMessage("Activité supprimée avec succès !");
        } catch (error) {
          console.error(
            "Erreur lors de la suppression depuis le calendrier:",
            error
          );
          showTemporaryMessage(`Erreur de suppression: ${error.message}`);
        }
      }
    },
    [onDeleteCraActivity, showTemporaryMessage]
  );

  const goToPreviousMonth = useCallback(() => {
    setCurrentDate((prevDate) => subMonths(prevDate, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentDate((prevDate) => addMonths(prevDate, 1));
  }, []);

  const handleToggleSummaryReport = useCallback(() => {
    setShowSummaryReport((prev) => !prev);
    // Quand on ouvre le récap, on définit le mois à celui du calendrier
    if (!showSummaryReport) {
      setSummaryReportMonth(currentDate);
    } else {
      setSummaryReportMonth(null); // Réinitialiser quand on ferme
    }
  }, [showSummaryReport, currentDate]);

  useEffect(() => {
    // Met à jour le mois du récap lorsque le mois du calendrier change
    if (showSummaryReport) {
      setSummaryReportMonth(currentDate);
    }
  }, [currentDate, showSummaryReport]);

  const renderHeader = () => {
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
          {format(currentDate, "MMMM yyyy", { locale: fr })}{" "}
          {/* Ajout de l'année */}
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

    while (day < monthStart) {
      allCells.push(
        <div
          key={`empty-prev-${format(day, "yyyy-MM-dd")}`}
          className="p-2 h-32 sm:h-40 bg-gray-100 opacity-50 rounded-lg m-0.5"
        ></div>
      );
      day = addDays(day, 1);
    }

    for (let i = 0; i < numDaysInMonth; i++) {
      const currentDay = addDays(monthStart, i);
      const formattedDate = format(currentDay, "d");
      const cloneDay = currentDay;

      const activitiesForDay = craActivities
        .filter((activity) =>
          isSameDay(parseISO(activity.date_activite), cloneDay)
        )
        .sort((a, b) => {
          if ((a.client_name || "") < (b.client_name || "")) return -1;
          if ((a.client_name || "") > (b.client_name || "")) return 1;
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
        cellClasses += "bg-blue-100 border-blue-500 shadow-md text-blue-800";
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
              const clientLabel = activity.client_name || "Client Inconnu";
              const activityTypeLabel = activity.type_activite || "Activité";
              const timeSpentLabel = activity.temps_passe
                ? `${parseFloat(activity.temps_passe)}j`
                : "";
              const displayLabel = `${activityTypeLabel}${
                timeSpentLabel ? ` (${timeSpentLabel})` : ""
              }`;

              const typeColorClass = activityTypeLabel.includes("Absence")
                ? "bg-red-200 text-red-800"
                : "bg-blue-200 text-blue-800";

              const overrideLabel = activity.override_non_working_day
                ? " (Dérog.)"
                : "";

              return (
                <div
                  key={activity.id}
                  className={`relative text-xs px-2 py-0.5 rounded-md mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis ${typeColorClass}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActivityClick(activity);
                  }}
                  title={`Client: ${clientLabel}\nType: ${activityTypeLabel}\nTemps: ${timeSpentLabel}\nDescription: ${
                    activity.description_activite || "N/A"
                  }${overrideLabel ? "\nDérogation jour non ouvrable" : ""}`}
                >
                  {`${displayLabel} - ${clientLabel}${overrideLabel}`}
                  <button
                    onClick={(e) => handleDeleteFromCalendar(activity.id, e)}
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
      <h2 className="text-3xl font-bold text-gray-700 mb-6 border-b-2 pb-2">
        Calendrier des Activités CRA
      </h2>

      {renderHeader()}
      {renderDaysOfWeek()}
      {renderCells()}

      <div className="flex justify-center mt-6">
        <button
          onClick={handleToggleSummaryReport}
          className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75"
        >
          {showSummaryReport
            ? "Masquer le Récapitulatif Mensuel"
            : "Afficher le Récapitulatif Mensuel"}
        </button>
      </div>

      {showSummaryReport && (
        <SummaryReport
          craActivities={craActivities}
          activityTypeDefinitions={activityTypeDefinitions}
          monthToDisplay={summaryReportMonth} // Passer le mois au SummaryReport
        />
      )}

      {showActivityModal && (
        <ActivityModal
          isOpen={showActivityModal}
          onClose={handleCloseModal}
          onSave={onAddCraActivity}
          onUpdate={onUpdateCraActivity}
          onDelete={onDeleteCraActivity}
          initialDate={selectedDateForModal}
          editingActivity={editingActivity}
          activityTypeDefinitions={activityTypeDefinitions}
          clientDefinitions={clientDefinitions}
          showMessage={showTemporaryMessage}
          isHolidayOrWeekend={isHolidayOrWeekendSelected}
          publicHolidays={publicHolidays}
          craActivities={craActivities}
        />
      )}

      {isMessageVisible && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300 transform animate-fade-in-up">
          {message}
        </div>
      )}
    </div>
  );
}
