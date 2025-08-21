"use client";

/**
 * CraDayCell
 * ----------
 * Cellule d’un jour dans la grille du calendrier CRA
 */

import React, { useCallback, useMemo } from "react";
import { isValid } from "date-fns";
import CraActivityItem from "./CraActivityItem";

// Helper pour normaliser une valeur en string
const s = (v) => (v === null || v === undefined ? null : String(v));

function CraDayCellBase({
  day,
  formattedDate,
  activitiesForDay,
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

  // Clic simple / édition 1 jour
  handleDayClick,
  onActivityClick,

  // Suppression
  requestDeleteFromCalendar,

  // Définitions
  activityTypeDefinitions,
  clientDefinitions,

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

  // Sélection multiple (mode & état)
  multiSelectType, // "none" | "activity" | "paid_leave"
  isDragging,

  // Déduction congés
  paidLeaveTypeId,

  // DnD
  onDragStartActivity,
}) {
  if (!isValid(day)) {
    console.error("CraDayCell: Prop 'day' invalide reçue:", day);
    return null;
  }

  /** ────────────────────────────────
   * Jour interactif ?
   * ──────────────────────────────── */
  const checkDayInteractable = useCallback(() => {
    if (readOnly) return false;
    return isCraEditable || isPaidLeaveEditable;
  }, [readOnly, isCraEditable, isPaidLeaveEditable]);

  /** ────────────────────────────────
   * Index O(1) pour types & clients
   * ──────────────────────────────── */
  const typeIndex = useMemo(() => {
    const m = new Map();
    for (const t of activityTypeDefinitions || []) m.set(String(t.id), t);
    return m;
  }, [activityTypeDefinitions]);

  const clientIndex = useMemo(() => {
    const m = new Map();
    for (const c of clientDefinitions || []) m.set(String(c.id), c);
    return m;
  }, [clientDefinitions]);

  /** ────────────────────────────────
   * Enrichissement + tri + total
   * ──────────────────────────────── */
  const { enhancedActivities, totalLabel } = useMemo(() => {
    const list = (activitiesForDay || []).map((activity) => {
      const typeDef = typeIndex.get(String(activity.type_activite));
      const clientDef = clientIndex.get(String(activity.client_id));

      const typeLabel =
        typeDef?.name ||
        activity.activityTypeName ||
        activity.type_label ||
        (activity.__kind === "CP" || activity.__kind === "paid_leave"
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

    list.sort((a, b) => {
      const tA = a.display_type_label || "";
      const tB = b.display_type_label || "";
      if (tA < tB) return -1;
      if (tA > tB) return 1;
      const cA = a.display_client_label || "";
      const cB = b.display_client_label || "";
      if (cA < cB) return -1;
      if (cA > cB) return 1;
      return 0;
    });

    const total = list.reduce((s, act) => s + (parseFloat(act.temps_passe) || 0), 0);
    return { enhancedActivities: list, totalLabel: `${total.toFixed(1)}j` };
  }, [activitiesForDay, typeIndex, clientIndex]);

  /** ────────────────────────────────
   * Vérifier si jour férié
   * ──────────────────────────────── */
  const hasPublicHolidayActivity = useMemo(() => {
    return (activitiesForDay || []).some(
      (activity) => s(activity?.type_activite) === "holiday-leave"
    );
  }, [activitiesForDay]);

  const shouldShowHolidayBadge = isPublicHolidayDay || hasPublicHolidayActivity;

  /** ────────────────────────────────
   * Classes CSS
   * ──────────────────────────────── */
  const cellClassName = useMemo(() => {
    const cls = [
      "relative p-2 h-32 sm:h-40 flex flex-col justify-start border rounded-lg m-0.5 transition duration-200 overflow-hidden",
    ];

    if (isOutsideCurrentMonth) {
      cls.push(
        "bg-gray-100 text-gray-400 border-gray-200 opacity-50 cursor-not-allowed"
      );
      return cls.join(" ");
    }

    if (isTodayHighlight)
      cls.push("bg-blue-100 border-blue-500 shadow-md text-blue-800");
    else if (isNonWorkingDay)
      cls.push("bg-gray-200 text-gray-500 border-gray-300");
    else cls.push("bg-white text-gray-900 border-gray-300");

    if (
      isTempSelected &&
      (multiSelectType === "activity" || multiSelectType === "paid_leave")
    ) {
      cls.push("ring-2 ring-blue-400 border-blue-500 bg-blue-50");
    }

    if (isDraggingActivity) {
      cls.push(
        isDropTargetValid
          ? "border-dashed border-green-500 bg-green-50"
          : "border-dashed border-red-500 bg-red-50"
      );
    }

    cls.push(checkDayInteractable() ? "cursor-pointer hover:bg-blue-50" : "cursor-not-allowed");

    return cls.join(" ");
  }, [
    isOutsideCurrentMonth,
    isTodayHighlight,
    isNonWorkingDay,
    isTempSelected,
    multiSelectType,
    isDraggingActivity,
    isDropTargetValid,
    checkDayInteractable,
  ]);

  /** ────────────────────────────────
   * Handlers
   * ──────────────────────────────── */
  const handleCellClick = useCallback(
    (e) => {
      if (isOutsideCurrentMonth || !checkDayInteractable()) return;
      if (e?.target?.closest(".cra-activity-item")) return;

      if (multiSelectType !== "none") {
        if (isDragging) return;
        handleMouseDown?.(e, day);
      } else {
        handleDayClick?.(day, e);
      }
    },
    [
      isOutsideCurrentMonth,
      checkDayInteractable,
      multiSelectType,
      isDragging,
      handleMouseDown,
      day,
      handleDayClick,
    ]
  );

  const onCellDragOver = onDragOverDay;
  const onCellDrop = useCallback((e) => onDropActivity?.(e, day), [onDropActivity, day]);

  const onCellMouseDown = useCallback(
    (e) => {
      if (!checkDayInteractable() || multiSelectType === "none") return;
      handleMouseDown?.(e, day);
    },
    [checkDayInteractable, multiSelectType, handleMouseDown, day]
  );

  const onCellMouseEnter = useCallback(() => {
    if (!checkDayInteractable() || multiSelectType === "none") return;
    handleMouseEnter?.(day);
  }, [checkDayInteractable, multiSelectType, handleMouseEnter, day]);

  const onCellMouseUp = useCallback(
    (e) => {
      if (!checkDayInteractable() || multiSelectType === "none") return;
      handleMouseUp?.(e, day);
    },
    [checkDayInteractable, multiSelectType, handleMouseUp, day]
  );

  /** ────────────────────────────────
   * Rendu JSX
   * ──────────────────────────────── */
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
      <span
        className={`text-sm font-semibold mb-1 ${
          isTodayHighlight ? "text-blue-800" : ""
        }`}
      >
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

/* ────────────────────────────────
 * Comparateur personnalisé
 * ──────────────────────────────── */
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

export default React.memo(CraDayCellBase, areEqual);
