"use client";

/**
 * CraDayCell
 * ----------
 * Cellule d’un jour dans la grille du calendrier CRA
 */

import React, { useCallback, useMemo } from "react";
import { isValid } from "date-fns";
import CraActivityItem from "./CraActivityItem";

// Normalisation en string
const s = (v) => (v === null || v === undefined ? null : String(v));

function CraDayCell({
  day,
  formattedDate,
  activitiesForDay = [],
  isTodayHighlight,
  isWeekendDay,
  isPublicHolidayDay,
  isNonWorkingDay,
  isOutsideCurrentMonth,
  isTempSelected,

  // Sélection multiple
  handleMouseDown,
  handleMouseEnter,
  handleMouseUp,

  // Clic simple / édition
  handleDayClick,
  onActivityClick,

  // Suppression
  requestDeleteFromCalendar,

  // Définitions
  activityTypeDefinitions = [],
  clientDefinitions = [],

  // Contexte
  showMessage,
  readOnly,
  isCraEditable,
  isPaidLeaveEditable,
  userId,
  userFirstName,

  // DnD individuel
  onDragOverDay,
  onDropActivity,
  isDraggingActivity,
  isDropTargetValid,

  // Sélection multiple
  multiSelectType = "none",
  isDragging,

  // Déduction congés
  paidLeaveTypeId,

  // DnD
  onDragStartActivity,
}) {
  /** ────────────
   * Jour interactif
   * ──────────── */
  const isInteractable = useCallback(() => {
    return !readOnly && (isCraEditable || isPaidLeaveEditable);
  }, [readOnly, isCraEditable, isPaidLeaveEditable]);

  /** ────────────
   * Index rapide pour types et clients
   * ──────────── */
  const typeIndex = useMemo(
    () => new Map(activityTypeDefinitions.map((t) => [String(t.id), t])),
    [activityTypeDefinitions]
  );

  const clientIndex = useMemo(
    () => new Map(clientDefinitions.map((c) => [String(c.id), c])),
    [clientDefinitions]
  );

  /** ────────────
   * Activités enrichies + total
   * ──────────── */
  const { enhancedActivities, totalLabel } = useMemo(() => {
    const enriched = activitiesForDay.map((activity) => {
      const typeDef = typeIndex.get(String(activity.type_activite));
      const clientDef = clientIndex.get(String(activity.client_id));

      const typeLabel =
        typeDef?.name ||
        activity.activityTypeName ||
        activity.type_label ||
        (["CP", "paid_leave"].includes(activity.__kind)
          ? "Congés payés"
          : "Activité");

      const clientLabel =
        clientDef?.nom_client || activity.clientName || activity.client_label || "";

      return {
        ...activity,
        is_absence: typeDef?.is_absence || activity.is_absence || false,
        is_overtime: typeDef?.is_overtime || activity.is_overtime || false,
        display_type_label: typeLabel,
        display_client_label: clientLabel,
        name: activity.name || typeLabel,
      };
    });

    enriched.sort((a, b) => {
      if (a.display_type_label < b.display_type_label) return -1;
      if (a.display_type_label > b.display_type_label) return 1;
      if (a.display_client_label < b.display_client_label) return -1;
      if (a.display_client_label > b.display_client_label) return 1;
      return 0;
    });

    const total = enriched.reduce((sum, act) => sum + (parseFloat(act.temps_passe) || 0), 0);
    return { enhancedActivities: enriched, totalLabel: `${total.toFixed(1)}j` };
  }, [activitiesForDay, typeIndex, clientIndex]);

  /** ────────────
   * Badge jours fériés
   * ──────────── */
  const hasPublicHolidayActivity = useMemo(
    () => activitiesForDay.some((a) => s(a?.type_activite) === "holiday-leave"),
    [activitiesForDay]
  );

  const shouldShowHolidayBadge = isPublicHolidayDay || hasPublicHolidayActivity;

  /** ────────────
   * Classes CSS
   * ──────────── */
  const cellClassName = useMemo(() => {
    const cls = ["relative p-2 h-32 sm:h-40 flex flex-col justify-start border rounded-lg m-0.5 transition duration-200 overflow-hidden"];

    if (isOutsideCurrentMonth) {
      cls.push("bg-gray-100 text-gray-400 border-gray-200 opacity-50 cursor-not-allowed");
      return cls.join(" ");
    }

    if (isTodayHighlight) cls.push("bg-blue-100 border-blue-500 shadow-md text-blue-800");
    else if (isNonWorkingDay) cls.push("bg-gray-200 text-gray-500 border-gray-300");
    else cls.push("bg-white text-gray-900 border-gray-300");

    if (isTempSelected && multiSelectType !== "none") {
      cls.push("ring-2 ring-blue-400 border-blue-500 bg-blue-50");
    }

    if (isDraggingActivity) {
      cls.push(
        isDropTargetValid
          ? "border-dashed border-green-500 bg-green-50"
          : "border-dashed border-red-500 bg-red-50"
      );
    }

    cls.push(isInteractable() ? "cursor-pointer hover:bg-blue-50" : "cursor-not-allowed");
    return cls.join(" ");
  }, [
    isOutsideCurrentMonth,
    isTodayHighlight,
    isNonWorkingDay,
    isTempSelected,
    multiSelectType,
    isDraggingActivity,
    isDropTargetValid,
    isInteractable,
  ]);

  /** ────────────
   * Handlers
   * ──────────── */
  const handleCellClick = useCallback(
    (e) => {
      if (isOutsideCurrentMonth || !isInteractable()) return;
      if (e?.target?.closest(".cra-activity-item")) return;

      if (multiSelectType !== "none") {
        if (!isDragging) handleMouseDown?.(e, day);
      } else {
        handleDayClick?.(day, e);
      }
    },
    [isOutsideCurrentMonth, isInteractable, multiSelectType, isDragging, handleMouseDown, day, handleDayClick]
  );

  const onCellDragOver = onDragOverDay;
  const onCellDrop = useCallback((e) => onDropActivity?.(e, day), [onDropActivity, day]);

  const onCellMouseDown = useCallback(
    (e) => {
      if (!isInteractable() || multiSelectType === "none") return;
      handleMouseDown?.(e, day);
    },
    [isInteractable, multiSelectType, handleMouseDown, day]
  );

  const onCellMouseEnter = useCallback(() => {
    if (!isInteractable() || multiSelectType === "none") return;
    handleMouseEnter?.(day);
  }, [isInteractable, multiSelectType, handleMouseEnter, day]);

  const onCellMouseUp = useCallback(
    (e) => {
      if (!isInteractable() || multiSelectType === "none") return;
      handleMouseUp?.(e, day);
    },
    [isInteractable, multiSelectType, handleMouseUp, day]
  );
  
  // Cette condition est déplacée après tous les appels de hooks
  if (!isValid(day)) {
    console.error("CraDayCell: Prop 'day' invalide reçue:", day);
    return null;
  }

  /** ────────────
   * Rendu JSX
   * ──────────── */
  return (
    <div
      className={cellClassName}
      onClick={handleCellClick}
      onMouseDown={onCellMouseDown}
      onMouseEnter={onCellMouseEnter}
      onMouseUp={onCellMouseUp}
      onDragOver={onCellDragOver}
      onDrop={onCellDrop}
    >
      {/* Jour */}
      <span className={`text-sm font-semibold mb-1 ${isTodayHighlight ? "text-blue-800" : ""}`}>
        {formattedDate}
      </span>

      {/* Badges */}
      {(isNonWorkingDay || hasPublicHolidayActivity) && !isOutsideCurrentMonth && (
        <span className="text-xs text-red-600 font-medium absolute top-1 right-1 px-1 py-0.5 bg-red-100 rounded">
          {shouldShowHolidayBadge && isWeekendDay
            ? "Férié & W-E"
            : shouldShowHolidayBadge
            ? "Férié"
            : "Week-end"}
        </span>
      )}

      {/* Total du jour */}
      {enhancedActivities.length > 0 && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
          {totalLabel}
        </div>
      )}

      {/* Activités */}
      <div className="flex-grow overflow-y-auto w-full pr-1 custom-scrollbar">
        {enhancedActivities.map((activity) => (
          <CraActivityItem
            key={activity.id}
            activity={activity}
            activityTypeDefinitions={activityTypeDefinitions}
            clientDefinitions={clientDefinitions}
            handleActivityClick={onActivityClick}
            requestDeleteFromCalendar={requestDeleteFromCalendar}
            showMessage={showMessage}
            readOnly={readOnly}
            isCraEditable={isCraEditable}
            isPaidLeaveEditable={isPaidLeaveEditable}
            userId={userId}
            userFirstName={userFirstName}
            paidLeaveTypeId={paidLeaveTypeId}
            onDragStartActivity={onDragStartActivity}
          />
        ))}
      </div>
    </div>
  );
}

/** ────────────
 * Comparateur personnalisé pour React.memo
 * ──────────── */
const areEqual = (prev, next) => {
  if (+prev.day !== +next.day) return false;
  if (prev.formattedDate !== next.formattedDate) return false;

  const boolKeys = [
    "isTodayHighlight",
    "isWeekendDay",
    "isPublicHolidayDay",
    "isNonWorkingDay",
    "isOutsideCurrentMonth",
    "isTempSelected",
    "readOnly",
    "isCraEditable",
    "isPaidLeaveEditable",
    "isDraggingActivity",
    "isDropTargetValid",
    "isDragging",
  ];

  for (const key of boolKeys) if (prev[key] !== next[key]) return false;

  if (prev.activitiesForDay?.length !== next.activitiesForDay?.length) return false;

  return true;
};

export default React.memo(CraDayCell, areEqual);