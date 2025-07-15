// components/cra/CraCalendar.js
import React, { useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isWeekend,
  isBefore,
  startOfDay,
  isSameDay,
  isValid, // Import isValid to check date validity
} from "date-fns";
import { fr } from "date-fns/locale";
import CraDayCell from "./CraDayCell";

const daysOfWeekDisplay = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function CraCalendar({
  currentMonth,
  activitiesByDay,
  activityTypeDefinitions,
  clientDefinitions,
  isPublicHoliday,
  readOnly,
  isDragging,
  tempSelectedDays,
  handleMouseDown,
  handleMouseEnter,
  handleDayClick,
  handleActivityClick,
  requestDeleteFromCalendar,
  showMessage,
  userId,
  userFirstName,
}) {
  console.log(
    "CraCalendar: currentMonth received:",
    currentMonth,
    "isValid:",
    isValid(currentMonth)
  );

  const getDaysInCalendar = useMemo(() => {
    if (!isValid(currentMonth)) {
      console.error(
        "CraCalendar: currentMonth is invalid, cannot generate calendar days."
      );
      return []; // Return empty array if currentMonth is invalid
    }

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startCalendarDay = startOfWeek(monthStart, {
      locale: fr,
      weekStartsOn: 1,
    });
    const endCalendarDay = endOfWeek(monthEnd, { locale: fr, weekStartsOn: 1 });

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

    if (!isValid(startCalendarDay) || !isValid(endCalendarDay)) {
      console.error(
        "CraCalendar: startCalendarDay or endCalendarDay is invalid, cannot generate calendar days."
      );
      return [];
    }

    return eachDayOfInterval({ start: startCalendarDay, end: endCalendarDay });
  }, [currentMonth]);

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
      if (!isValid(day)) {
        // Defensive check for each day
        console.warn("CraCalendar: Skipping invalid day in renderCells:", day);
        return; // Skip this day if it's invalid
      }

      const formattedDate = format(day, "d");
      const activitiesForDay =
        activitiesByDay.get(format(day, "yyyy-MM-dd")) || [];
      const isTodayHighlight = isToday(day);
      const isWeekendDay = isWeekend(day, { weekStartsOn: 1 });
      const isPublicHolidayDay = isPublicHoliday(day);
      const isNonWorkingDay = isWeekendDay || isPublicHolidayDay;
      const isOutsideCurrentMonth = !isSameMonth(day, currentMonth);
      const isPastDay = isBefore(day, startOfDay(new Date()));
      const isTempSelected = tempSelectedDays.some((d) => isSameDay(d, day));

      allCells.push(
        <CraDayCell
          key={format(day, "yyyy-MM-dd")} // Key must be unique and stable
          day={day}
          formattedDate={formattedDate}
          activitiesForDay={activitiesForDay}
          isTodayHighlight={isTodayHighlight}
          isWeekendDay={isWeekendDay}
          isPublicHolidayDay={isPublicHolidayDay}
          isNonWorkingDay={isNonWorkingDay}
          isOutsideCurrentMonth={isOutsideCurrentMonth}
          isPastDay={isPastDay}
          isTempSelected={isTempSelected}
          handleMouseDown={handleMouseDown}
          handleMouseEnter={handleMouseEnter}
          handleDayClick={handleDayClick}
          handleActivityClick={handleActivityClick}
          requestDeleteFromCalendar={requestDeleteFromCalendar}
          activityTypeDefinitions={activityTypeDefinitions}
          clientDefinitions={clientDefinitions}
          showMessage={showMessage}
          readOnly={readOnly}
          userId={userId}
          userFirstName={userFirstName}
          currentMonth={currentMonth}
          isDragging={isDragging}
        />
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

  return (
    <>
      {renderDaysOfWeek()}
      {renderCells()}
    </>
  );
}
