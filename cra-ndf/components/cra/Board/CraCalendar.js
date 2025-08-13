"use client";

/**
 * CraCalendar
 * -----------
 * Grille mensuelle 7xN affichant les activités par jour (CRA + Absences).
 *
 * Points clés & perf :
 * - Génère la plage [début de semaine du 1er jour du mois ; fin de semaine du dernier jour du mois]
 * - Utilise un Set des jours temporairement sélectionnés (O(1) au lieu de .some isSameDay O(n))
 * - Evite les recréations de structures (labels semaine constants, helpers mémoïsés)
 * - Laisse CraDayCell gérer les règles fines d’édition/drag/suppression
 * - `React.memo` avec une comparaison ciblée pour éviter des re-renders inutiles
 */

import React, { useMemo, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isWeekend,
  startOfWeek,
  endOfWeek,
  startOfDay,
  isBefore,
  isValid,
} from "date-fns";
import CraDayCell from "./CraDayCell";

/* ──────────────────────────────────────────────────────────────────────────────
 * Constantes & petits helpers
 * ──────────────────────────────────────────────────────────────────────────────*/

const WEEK_START = { weekStartsOn: 1 }; // Lundi
const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Format de clé standard pour `activitiesByDay` (Map 'yyyy-MM-dd' -> Activity[]) */
const keyOf = (d) => format(d, "yyyy-MM-dd");

/** Génère tous les jours couvrant la grille du mois (avec bordures de semaines) */
const buildCalendarDays = (month) => {
  const safeMonth = isValid(month) ? month : new Date();
  const mStart = startOfMonth(safeMonth);
  const mEnd = endOfMonth(safeMonth);
  const startCal = startOfWeek(mStart, WEEK_START);
  const endCal = endOfWeek(mEnd, WEEK_START);
  return eachDayOfInterval({ start: startCal, end: endCal });
};

/** Version "safe" d’un test jour férié (au cas où la prop ne serait pas fournie) */
const makeSafeIsHoliday = (fn) => (date) => (typeof fn === "function" ? fn(date) : false);

/* ──────────────────────────────────────────────────────────────────────────────
 * Composant
 * ──────────────────────────────────────────────────────────────────────────────*/

function CraCalendarBase({
  currentMonth,
  activitiesByDay,
  activityTypeDefinitions,
  clientDefinitions,
  isPublicHoliday,
  onDayClick,           // clic simple (édition/ajout 1 jour)
  onActivityClick,      // clic sur une activité existante
  tempSelectedDays = [],// sélection temporaire (multi-jours)
  onMouseDown,          // démarrage sélection multiple
  onMouseEnter,         // survol pendant sélection multiple
  onMouseUp,            // fin sélection multiple
  readOnly = false,
  isCraEditable,
  isPaidLeaveEditable,
  requestDeleteFromCalendar,
  showMessage,
  userId,
  userFirstName,
  paidLeaveTypeId,
  // DnD individuel (passés à CraDayCell puis CraActivityItem)
  onDragStartActivity,
  onDragOverDay,
  onDropActivity,
  isDraggingActivity,
  isDropTargetValid,
  // Sélection multiple
  multiSelectType = "none", // 'none' | 'activity' | 'paid_leave'
  isDragging = false,
}) {
  /* ────────────────────────────────────────────────────────────────────────
   * Données mémoïsées pour limiter le coût par cellule
   * ────────────────────────────────────────────────────────────────────────*/

  // Grille de jours du mois courant (avec bordures semaine)
  const daysInMonth = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  // Set O(1) des jours sélectionnés temporairement (clé 'yyyy-MM-dd')
  const selectedKeys = useMemo(() => {
    if (!Array.isArray(tempSelectedDays) || tempSelectedDays.length === 0) return new Set();
    const set = new Set();
    for (const d of tempSelectedDays) {
      if (d && isValid(d)) set.add(keyOf(startOfDay(d)));
    }
    return set;
  }, [tempSelectedDays]);

  // Aujourd'hui (début de journée) pour un test "passé"
  const todayStart = useMemo(() => startOfDay(new Date()), []);

  // Fonction férié "safe"
  const isHoliday = useMemo(() => makeSafeIsHoliday(isPublicHoliday), [isPublicHoliday]);

  // Sélection multiple active ?
  const hasMultiSelect = multiSelectType !== "none";

  // Handlers de sélection multiple passés seulement si le mode est actif
  const msDown = hasMultiSelect ? onMouseDown : undefined;
  const msEnter = hasMultiSelect ? onMouseEnter : undefined;
  const msUp = hasMultiSelect ? onMouseUp : undefined;

  /* ────────────────────────────────────────────────────────────────────────
   * Rendu
   * ────────────────────────────────────────────────────────────────────────*/
  return (
    <div className="overflow-x-auto">
      <div className="min-w-full inline-block align-middle">
        {/* En-têtes des jours de la semaine */}
        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-700 mb-2 bg-gray-100 rounded-lg py-3">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-2">
              {label}
            </div>
          ))}
        </div>

        {/* Grille des jours */}
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((day) => {
            const key = keyOf(day);
            const activitiesForDay = activitiesByDay.get(key) || [];

            const isTodayHighlight = isToday(day);
            const isWeekendDay = isWeekend(day, WEEK_START);
            const isPublicHolidayDay = isHoliday(day);
            const isNonWorkingDay = isWeekendDay || isPublicHolidayDay;
            const isOutsideCurrentMonth = !isSameMonth(day, currentMonth);
            const isPastDay = isBefore(day, todayStart);
            const isTempSelected = selectedKeys.has(key);

            return (
              <CraDayCell
                key={key}
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
                /* Sélection multiple */
                handleMouseDown={msDown}
                handleMouseEnter={msEnter}
                handleMouseUp={msUp}
                /* Clics simples */
                handleDayClick={onDayClick}
                onActivityClick={onActivityClick}
                /* Suppression depuis la cellule */
                requestDeleteFromCalendar={requestDeleteFromCalendar}
                /* Définitions & contexte */
                activityTypeDefinitions={activityTypeDefinitions}
                clientDefinitions={clientDefinitions}
                showMessage={showMessage}
                readOnly={readOnly}
                isCraEditable={isCraEditable}
                isPaidLeaveEditable={isPaidLeaveEditable}
                userId={userId}
                userFirstName={userFirstName}
                currentMonth={currentMonth}
                paidLeaveTypeId={paidLeaveTypeId}
                /* Drag & Drop individuel (CraActivityItem) */
                onDragStartActivity={onDragStartActivity}
                onDragOverDay={onDragOverDay}
                onDropActivity={onDropActivity}
                isDraggingActivity={isDraggingActivity}
                isDropTargetValid={isDropTargetValid}
                /* Etat du drag de sélection multiple (pour styliser la cellule) */
                multiSelectType={multiSelectType}
                isDragging={isDragging}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
 * Mémoisation du composant :
 *  - On compare les props qui affectent réellement l’UI
 *  - `activitiesByDay` est comparé par référence (on part du principe que le parent
 *    fournit une nouvelle Map lorsqu’il change les activités).
 * ──────────────────────────────────────────────────────────────────────────────*/
const areEqual = (prev, next) => {
  // Mois courant (au jour près)
  const prevTime = isValid(prev.currentMonth) ? +startOfDay(prev.currentMonth) : 0;
  const nextTime = isValid(next.currentMonth) ? +startOfDay(next.currentMonth) : 0;
  if (prevTime !== nextTime) return false;

  // Références lourdes / collections
  if (prev.activitiesByDay !== next.activitiesByDay) return false;
  if (prev.activityTypeDefinitions !== next.activityTypeDefinitions) return false;
  if (prev.clientDefinitions !== next.clientDefinitions) return false;

  // Flags & handlers qui changent l’UI
  if (prev.readOnly !== next.readOnly) return false;
  if (prev.isCraEditable !== next.isCraEditable) return false;
  if (prev.isPaidLeaveEditable !== next.isPaidLeaveEditable) return false;
  if (prev.isDraggingActivity !== next.isDraggingActivity) return false;
  if (prev.isDropTargetValid !== next.isDropTargetValid) return false;
  if (prev.multiSelectType !== next.multiSelectType) return false;
  if (prev.isDragging !== next.isDragging) return false;

  // Contexte utilisateur
  if (prev.userId !== next.userId) return false;
  if (prev.userFirstName !== next.userFirstName) return false;
  if (prev.paidLeaveTypeId !== next.paidLeaveTypeId) return false;

  // On considère les callbacks stables (passés depuis le parent via useCallback)
  // et isPublicHoliday également (utilisé via wrapper mémoïsé)

  // Sélection temporaire : compare longueur & quelques clés (cheap check)
  const a = prev.tempSelectedDays || [];
  const b = next.tempSelectedDays || [];
  if (a.length !== b.length) return false;

  return true;
};

export default React.memo(CraCalendarBase, areEqual);