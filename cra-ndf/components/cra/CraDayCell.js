// components/cra/CraDayCell.js
import React from "react";
import { format } from "date-fns";
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
  isPastDay, // Toujours passé comme prop, mais non utilisé pour le style direct
  isTempSelected,
  handleMouseDown,
  handleMouseEnter,
  handleActivityClick,
  requestDeleteFromCalendar,
  activityTypeDefinitions,
  clientDefinitions,
  showMessage,
  readOnly,
  userId,
  userFirstName,
}) {
  let cellClasses = `
    p-2 h-32 sm:h-40 flex flex-col justify-start border border-gray-200 rounded-lg m-0.5
    transition duration-200 overflow-hidden relative
  `;

  if (isOutsideCurrentMonth) {
    cellClasses += " bg-gray-100 opacity-50 cursor-not-allowed";
  } else if (isTodayHighlight) {
    cellClasses += " bg-blue-100 border-blue-500 shadow-md text-blue-800";
  } else if (isTempSelected) {
    cellClasses += " ring-2 ring-purple-400 border-purple-500 bg-purple-50";
  } else if (isNonWorkingDay) {
    cellClasses += " bg-gray-200 text-gray-500";
  } else {
    cellClasses += " bg-white text-gray-900 hover:bg-blue-50 cursor-pointer";
  }

  return (
    <div
      className={cellClasses}
      onMouseDown={(e) => handleMouseDown(e, day)}
      onMouseEnter={() => handleMouseEnter(day)}
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
              userId={userId}
              userFirstName={userFirstName}
            />
          ))}
      </div>
    </div>
  );
}
