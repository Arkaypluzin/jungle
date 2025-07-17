// components/cra/CraDayCell.js
import React from "react";
import {
  format,
  isSameMonth,
  isSameDay,
  isValid,
  isBefore,
  startOfDay,
} from "date-fns";
import CraActivityItem from "./CraActivityItem";

export default function CraDayCell({
  day,
  formattedDate,
  activitiesForDay,
  isTodayHighlight,
  isWeekendDay,
  isPublicHolidayDay,
  isNonWorkingDay,
  isOutsideCurrentMonth,
  isPastDay, // Prop isPastDay from CraCalendar
  isTempSelected,
  handleMouseDown,
  handleMouseEnter,
  handleDayClick, // Passé depuis CraCalendar
  handleActivityClick,
  requestDeleteFromCalendar,
  activityTypeDefinitions,
  clientDefinitions,
  showMessage,
  readOnly, // readOnly global (e.g., vue admin)
  isCraEditable, // Statut d'éditabilité du rapport CRA (draft ou rejected)
  isPaidLeaveEditable, // Statut d'éditabilité du rapport de congés payés (draft ou rejected)
  userId,
  userFirstName,
  currentMonth,
  isDragging,
}) {
  // Vérification défensive de la validité du jour
  if (!isValid(day)) {
    console.error("CraDayCell: Prop 'day' invalide reçue:", day);
    return null; // Ne rien rendre pour un jour invalide
  }

  let cellClasses =
    "relative p-2 h-32 sm:h-40 flex flex-col justify-start border border-gray-200 rounded-lg m-0.5 transition duration-200 overflow-hidden relative";

  // Déterminer si la cellule du jour est interactive pour l'ajout/modification d'activités.
  // Elle est interactive si :
  // 1. NON en mode lecture seule global (vue admin)
  // 2. ET (le rapport CRA est éditable OU le rapport de congés payés est éditable)
  // 3. ET ce n'est PAS un jour passé
  // 4. ET c'est dans le mois affiché actuellement
  const canInteractWithCellForAnyActivity =
    !readOnly &&
    (isCraEditable || isPaidLeaveEditable) &&
    !isPastDay &&
    isSameMonth(day, currentMonth);

  if (isOutsideCurrentMonth) {
    cellClasses += " bg-gray-100 opacity-50 cursor-not-allowed";
  } else if (isTodayHighlight) {
    cellClasses += " bg-blue-100 border-blue-500 shadow-md text-blue-800";
  } else if (isTempSelected) {
    cellClasses += " ring-2 ring-purple-400 border-purple-500 bg-purple-50";
  } else if (isNonWorkingDay) {
    cellClasses += " bg-gray-200 text-gray-500";
  } else {
    cellClasses += " bg-white text-gray-900"; // Fond par défaut pour les jours éditables
  }

  // Appliquer le curseur et les effets de survol de manière plus granulaire
  if (canInteractWithCellForAnyActivity) {
    if (isDragging && isPaidLeaveEditable) {
      // Curseur de "saisie" si en mode glisser-déposer et congés éditables
      cellClasses += " cursor-grabbing";
    } else {
      cellClasses += " hover:bg-blue-50 cursor-pointer"; // Curseur de "pointeur" pour les jours cliquables
    }
  } else {
    cellClasses += " cursor-not-allowed"; // Curseur par défaut si aucune interaction n'est autorisée
  }

  return (
    <div
      className={cellClasses}
      // Autoriser onClick UNIQUEMENT si la cellule est interactive ET si le rapport CRA est éditable.
      // handleDayClick (dans CraBoard) gérera ensuite s'il s'agit d'une nouvelle activité ou d'une modification.
      onClick={() =>
        canInteractWithCellForAnyActivity &&
        isCraEditable &&
        handleDayClick(day)
      }
      // Autoriser onMouseDown (pour le glisser-déposer de congés payés) UNIQUEMENT si la cellule est interactive ET si le rapport de congés payés est éditable.
      onMouseDown={(e) =>
        canInteractWithCellForAnyActivity &&
        isPaidLeaveEditable &&
        handleMouseDown(e, day)
      }
      // Autoriser onMouseEnter (pour le glisser-déposer de congés payés) UNIQUEMENT si la cellule est interactive ET si le rapport de congés payés est éditable.
      onMouseEnter={() =>
        canInteractWithCellForAnyActivity &&
        isPaidLeaveEditable &&
        handleMouseEnter(day)
      }
      data-date={format(day, "yyyy-MM-dd")}
    >
      <span
        className={`text-sm font-semibold mb-1 ${
          isTodayHighlight ? "text-blue-800" : ""
        }`}
      >
        {format(day, "d")}{" "}
        {/* Utilisation de 'day' directement pour le formatage */}
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
            .reduce((sum, act) => sum + (parseFloat(act.temps_passe) || 0), 0)
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
              )?.nom_client || // Utiliser nom_client
              a.client_name ||
              "";
            const clientB =
              clientDefinitions.find(
                (c) => String(c.id) === String(b.client_id)
              )?.nom_client || // Utiliser nom_client
              b.client_name ||
              "";
            if (clientA < clientB) return -1;
            if (clientA > clientB) return 1;
            return 0;
          })
          .map((activity) => (
            <CraActivityItem
              key={activity.id}
              activity={activity}
              activityTypeDefinitions={activityTypeDefinitions}
              clientDefinitions={clientDefinitions}
              handleActivityClick={handleActivityClick}
              requestDeleteFromCalendar={requestDeleteFromCalendar}
              showMessage={showMessage}
              readOnly={readOnly}
              isCraEditable={isCraEditable}
              isPaidLeaveEditable={isPaidLeaveEditable}
              userId={userId}
              userFirstName={userFirstName}
            />
          ))}
      </div>
    </div>
  );
}
