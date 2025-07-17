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
import CraDayCell from "./CraDayCell"; // Import the CraDayCell component

const CraCalendar = ({
  currentMonth,
  activitiesByDay,
  activityTypeDefinitions,
  clientDefinitions,
  isPublicHoliday,
  onDayClick,
  onActivityClick,
  tempSelectedDays,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
  readOnly = false,
  isCraEditable,
  isPaidLeaveEditable,
  requestDeleteFromCalendar,
  showMessage,
  userId,
  userFirstName,
  isDragging,
  paidLeaveTypeId, // <--- NOUVEAU : Reçu de CraBoard
}) => {
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
  console.log("CraCalendar: isDragging:", isDragging);

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
    console.log(
      "CraCalendar: monthStart:",
      monthStart,
      "isValid:",
      isValid(monthStart)
    );
    console.log(
      "CraCalendar: monthEnd:",
      monthEnd,
      "isValid:",
      isValid(monthEnd)
    );

    const startCalendarDay = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endCalendarDay = endOfWeek(monthEnd, { weekStartsOn: 1 });
    console.log(
      "CraCalendar: startCalendarDay:",
      startCalendarDay,
      "isValid:",
      isValid(startCalendarDay)
    );
    console.log(
      "CraCalendar: endCalendarDay:",
      endCalendarDay,
      "isValid:",
      isValid(endCalendarDay)
    );

    return eachDayOfInterval({ start: startCalendarDay, end: endCalendarDay });
  }, [currentMonth]);

  const weekdays = useMemo(() => {
    return ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  }, []);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full inline-block align-middle">
        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-700 mb-2">
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
                handleMouseDown={onMouseDown}
                handleMouseEnter={onMouseEnter}
                handleDayClick={onDayClick}
                handleActivityClick={onActivityClick}
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
                isDragging={isDragging}
                paidLeaveTypeId={paidLeaveTypeId} // <--- PASSAGE DE LA PROP
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CraCalendar;
