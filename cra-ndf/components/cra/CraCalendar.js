// components/cra/CraCalendar.js
"use client";

import React, { useMemo, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isWeekend,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addDays,
  startOfDay,
  isBefore,
  isValid,
} from "date-fns";
import { fr } from "date-fns/locale";
import CraDayCell from "./CraDayCell";

export default function CraCalendar({
  currentMonth,
  activitiesByDay,
  activityTypeDefinitions,
  clientDefinitions,
  isPublicHoliday,
  onDayClick, // Pour le clic simple (édition/ajout 1 jour)
  onActivityClick, // Pour le clic sur une activité existante
  tempSelectedDays, // Jours temporairement sélectionnés pour le style
  onMouseDown, // Démarre la sélection multiple (passé par CraBoard)
  onMouseEnter, // Gère le survol pendant la sélection multiple (passé par CraBoard)
  onMouseUp, // Termine la sélection multiple (passé par CraBoard)
  readOnly = false,
  isCraEditable,
  isPaidLeaveEditable,
  requestDeleteFromCalendar, // Appel à la prop de suppression de CraBoard
  showMessage,
  userId,
  userFirstName,
  paidLeaveTypeId,
  // Props pour le D&D individuel (passées par CraBoard)
  onDragStartActivity, // Passé à CraDayCell pour être ensuite passé à CraActivityItem
  onDragOverDay,
  onDropActivity,
  isDraggingActivity,
  isDropTargetValid,
  // Props pour le mode de sélection
  multiSelectType, // 'none', 'activity', 'paid_leave'
  isDragging, // Indique si un drag de sélection multiple est en cours
}) {
  console.log(
    "CraCalendar: currentMonth received:",
    currentMonth,
    "isValid:",
    isValid(currentMonth)
  );
  console.log(
    "CraCalendar: readOnly:",
    readOnly,
    "isCraEditable:",
    isCraEditable,
    "isPaidLeaveEditable:",
    isPaidLeaveEditable
  );
  console.log("CraCalendar: isDraggingActivity:", isDraggingActivity);
  console.log("CraCalendar: isDragging (multi-select):", isDragging);
  console.log("CraCalendar: multiSelectType:", multiSelectType); // Nouveau log

  const daysInMonth = useMemo(() => {
    if (!isValid(currentMonth)) {
      console.error(
        "CraCalendar: currentMonth est invalide. Utilisation de la date actuelle."
      );
      const today = new Date();
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      const startCalendarDay = startOfWeek(monthStart, { weekStartsOn: 1 });
      const endCalendarDay = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({
        start: startCalendarDay,
        end: endCalendarDay,
      });
    }

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const startCalendarDay = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endCalendarDay = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startCalendarDay, end: endCalendarDay });
  }, [currentMonth]);

  const weekdays = useMemo(() => {
    return ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  }, []);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full inline-block align-middle">
        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-700 mb-2 bg-gray-100 rounded-lg py-3">
          {weekdays.map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((day) => {
            const dateString = format(day, "yyyy-MM-dd");
            const activitiesForDay = activitiesByDay.get(dateString) || [];
            const isTodayHighlight = isToday(day);
            const isWeekendDay = isWeekend(day, { weekStartsOn: 1 });
            const isPublicHolidayDay = isPublicHoliday(day);
            const isNonWorkingDay = isWeekendDay || isPublicHolidayDay;
            const isOutsideCurrentMonth = !isSameMonth(day, currentMonth);
            const isPastDay = isBefore(day, startOfDay(new Date()));
            const isTempSelected = tempSelectedDays.some((d) =>
              isSameDay(d, day)
            );

            // Les handlers de sélection multiple sont passés si multiSelectType n'est pas 'none'
            const conditionalOnMouseDown =
              multiSelectType !== "none" ? onMouseDown : undefined;
            const conditionalOnMouseEnter =
              multiSelectType !== "none" ? onMouseEnter : undefined;
            const conditionalOnMouseUp =
              multiSelectType !== "none" ? onMouseUp : undefined;

            // Les handlers de D&D sont toujours passés (le CraDayCell décidera si draggable)
            const conditionalOnDragOverDay = onDragOverDay;
            const conditionalOnDropActivity = onDropActivity;

            return (
              <CraDayCell
                key={dateString}
                day={day}
                formattedDate={format(day, "d")}
                activitiesForDay={activitiesForDay}
                isTodayHighlight={isTodayHighlight}
                isWeekendDay={isWeekendDay}
                isPublicHolidayDay={isPublicHolidayDay}
                isNonWorkingDay={isNonWorkingDay}
                isOutsideCurrentMonth={isOutsideCurrentMonth}
                isPastDay={isPastDay}
                isTempSelected={isTempSelected}
                // Passer les handlers conditionnels pour la sélection multiple
                handleMouseDown={conditionalOnMouseDown}
                handleMouseEnter={conditionalOnMouseEnter}
                handleMouseUp={conditionalOnMouseUp}
                // Les handlers de clic simple et d'activité sont toujours passés
                handleDayClick={onDayClick}
                onActivityClick={onActivityClick}
                requestDeleteFromCalendar={requestDeleteFromCalendar}
                activityTypeDefinitions={activityTypeDefinitions}
                clientDefinitions={clientDefinitions}
                showMessage={showMessage}
                readOnly={readOnly}
                isCraEditable={isCraEditable}
                isPaidLeaveEditable={isPaidLeaveEditable}
                userId={userId}
                userFirstName={userFirstName}
                currentMonth={currentMonth}
                // Passer les D&D props (onDragStartActivity est passé via CraActivityItem)
                onDragOverDay={conditionalOnDragOverDay}
                onDropActivity={conditionalOnDropActivity}
                isDraggingActivity={isDraggingActivity}
                isDropTargetValid={isDropTargetValid}
                // Props pour le mode de sélection
                multiSelectType={multiSelectType}
                isDragging={isDragging} // Indique si un drag de sélection multiple est en cours
                paidLeaveTypeId={paidLeaveTypeId}
                onDragStartActivity={onDragStartActivity} // Passé à CraDayCell pour CraActivityItem
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
