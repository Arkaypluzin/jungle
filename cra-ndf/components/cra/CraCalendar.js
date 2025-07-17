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
  isCraEditable, // Reçu de CraBoard
  isPaidLeaveEditable, // Reçu de CraBoard
  requestDeleteFromCalendar, // Reçu de CraBoard
  showMessage, // Reçu de CraBoard
  userId, // Reçu de CraBoard
  userFirstName, // Reçu de CraBoard
  isDragging, // Reçu de CraBoard
}) => {
  console.log(
    "CraCalendar: currentMonth received:",
    currentMonth,
    "isValid:",
    currentMonth instanceof Date && !isNaN(currentMonth)
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
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    console.log(
      "CraCalendar: monthStart:",
      monthStart,
      "isValid:",
      monthStart instanceof Date && !isNaN(monthStart)
    );
    console.log(
      "CraCalendar: monthEnd:",
      monthEnd,
      "isValid:",
      monthEnd instanceof Date && !isNaN(monthEnd)
    );

    const startCalendarDay = startOfWeek(monthStart, { locale: fr });
    const endCalendarDay = endOfWeek(monthEnd, { locale: fr });
    console.log(
      "CraCalendar: startCalendarDay:",
      startCalendarDay,
      "isValid:",
      startCalendarDay instanceof Date && !isNaN(startCalendarDay)
    );
    console.log(
      "CraCalendar: endCalendarDay:",
      endCalendarDay,
      "isValid:",
      endCalendarDay instanceof Date && !isNaN(endCalendarDay)
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
                formattedDate={format(day, "d")} // Pass formatted day number
                activitiesForDay={activitiesForDay}
                isTodayHighlight={isTodayHighlight}
                isWeekendDay={isWeekendDay}
                isPublicHolidayDay={isPublicHolidayDay}
                isNonWorkingDay={isNonWorkingDay}
                isOutsideCurrentMonth={isOutsideCurrentMonth}
                isPastDay={isPastDay} // Pass isPastDay
                isTempSelected={isTempSelected}
                handleMouseDown={onMouseDown} // Pass the handler from CraBoard
                handleMouseEnter={onMouseEnter} // Pass the handler from CraBoard
                handleDayClick={onDayClick} // Pass the handler from CraBoard
                handleActivityClick={onActivityClick} // Pass the handler from CraBoard
                requestDeleteFromCalendar={requestDeleteFromCalendar} // Pass the handler from CraBoard
                activityTypeDefinitions={activityTypeDefinitions}
                clientDefinitions={clientDefinitions}
                showMessage={showMessage}
                readOnly={readOnly} // Pass global readOnly
                isCraEditable={isCraEditable} // Pass specific editable flags
                isPaidLeaveEditable={isPaidLeaveEditable} // Pass specific editable flags
                userId={userId}
                userFirstName={userFirstName}
                currentMonth={currentMonth}
                isDragging={isDragging} // Pass isDragging state to CraDayCell
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CraCalendar;
