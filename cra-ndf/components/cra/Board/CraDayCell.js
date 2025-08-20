"use client";

/**
 * CraDayCell
 * ----------
 * Cellule d’un jour dans la grille du calendrier CRA :
 * - Affiche le jour + les badges (week-end / férié).
 * - Liste les activités du jour, avec libellés robustes (types/clients), triés et total du jour.
 * - Gère le clic simple (création/édition), la sélection multiple (mousedown / enter / mouseup),
 * et le drag & drop d’activité individuelle (dragOver/drop).
 *
 * Optimisations :
 * - Mémoïsation lourde (classes CSS, activités enrichies, total du jour).
 * - Index O(1) (Map) pour types/clients au lieu de .find() à chaque activité.
 * - Handlers enveloppés avec useCallback pour rester stables.
 * - Composant mémoïsé (React.memo) avec comparaison personnalisée (areEqual).
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

  // Sélection multiple (passés conditionnellement par CraCalendar)
  handleMouseDown,
  handleMouseEnter,
  handleMouseUp,

  // Clic simple / édition 1 jour
  handleDayClick,
  onActivityClick,

  // Suppression (icône sur l’activité)
  requestDeleteFromCalendar,

  // Définitions pour résolution des libellés
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
  isDragging,      // drag de sélection multiple en cours ?

  // Déduction congés
  paidLeaveTypeId,

  // DnD — passe-plat vers CraActivityItem
  onDragStartActivity,
}) {
  if (!isValid(day)) {
    console.error("CraDayCell: Prop 'day' invalide reçue:", day);
    return null;
  }

  /** Jour interactif ? (autorise clic/drag côté UI) */
  const isDayInteractable = useCallback(() => {
    if (readOnly) return false;
    // Interactif si AU MOINS un rapport est éditable
    return isCraEditable || isPaidLeaveEditable;
  }, [readOnly, isCraEditable, isPaidLeaveEditable]);

  /* ──────────────────────────────────────────────
   * Index O(1) pour types & clients (évite .find)
   * ──────────────────────────────────────────────*/
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

  /* ──────────────────────────────────────────────
   * Enrichissement des activités + tri + total
   * ──────────────────────────────────────────────*/
  const { enhancedActivities, totalLabel } = useMemo(() => {
    const list = (activitiesForDay || []).map((activity) => {
      const typeDef = typeIndex.get(String(activity.type_activite));
      const clientDef = clientIndex.get(String(activity.client_id));

      const typeLabel =
        typeDef?.name ||
        activity.activityTypeName || // DB (aggregation)
        activity.type_label ||       // éventuellement injecté côté history
        (activity.__kind === "CP" || activity.__kind === "paid_leave" ? "Congés payés" : "Activité");

      const clientLabel =
        clientDef?.nom_client ||
        activity.clientName ||       // DB (aggregation)
        activity.client_label || "";

      return {
        ...activity,
        is_absence: typeDef?.is_absence || activity.is_absence || false,
        is_overtime: typeDef?.is_overtime || activity.is_overtime || false,
        display_type_label: typeLabel,
        display_client_label: clientLabel,
        name: activity.name || typeLabel, // clé d’affichage utilisée par l’item
      };
    });

    // Tri stable : Type -> Client (alphabétique)
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

    // Total (j) du jour
    const total = list.reduce((s, act) => s + (parseFloat(act.temps_passe) || 0), 0);
    return { enhancedActivities: list, totalLabel: `${total.toFixed(1)}j` };
  }, [activitiesForDay, typeIndex, clientIndex]);

  // NOUVEAUTÉ : Vérifier si une activité est un jour férié, indépendamment des props
  const hasPublicHolidayActivity = useMemo(() => {
    return (activitiesForDay || []).some(
      (activity) => s(activity?.type_activite) === "holiday-leave"
    );
  }, [activitiesForDay]);

  const shouldShowHolidayBadge = isPublicHolidayDay || hasPublicHolidayActivity;

  /* ──────────────────────────────────────────────
   * Classes CSS de la cellule (mémoïsées)
   * ──────────────────────────────────────────────*/
  const cellClassName = useMemo(() => {
    const cls = [
      "relative p-2 h-32 sm:h-40 flex flex-col justify-start border rounded-lg m-0.5 transition duration-200 overflow-hidden",
    ];

    if (isOutsideCurrentMonth) {
      cls.push("bg-gray-100 text-gray-400 border-gray-200 opacity-50 cursor-not-allowed");
      return cls.join(" ");
    }

    // Couleur de fond / texte selon le contexte
    if (isTodayHighlight) cls.push("bg-blue-100 border-blue-500 shadow-md text-blue-800");
    else if (isNonWorkingDay) cls.push("bg-gray-200 text-gray-500 border-gray-300");
    else cls.push("bg-white text-gray-900 border-gray-300");

    // Sélection multiple (temporaire)
    if (isTempSelected && (multiSelectType === "activity" || multiSelectType === "paid_leave")) {
      cls.push("ring-2 ring-blue-400 border-blue-500 bg-blue-50");
    }

    // Feedback DnD individuel
    if (isDraggingActivity) {
      cls.push(isDropTargetValid ? "border-dashed border-green-500 bg-green-50" : "border-dashed border-red-500 bg-red-50");
    }

    // Curseur / hover
    cls.push(isDayInteractable() ? "cursor-pointer hover:bg-blue-50" : "cursor-not-allowed");

    return cls.join(" ");
  }, [
    isOutsideCurrentMonth,
    isTodayHighlight,
    isNonWorkingDay,
    isTempSelected,
    multiSelectType,
    isDraggingActivity,
    isDropTargetValid,
    isDayInteractable,
  ]);

  /* ──────────────────────────────────────────────
   * Handlers enveloppés (stables)
   * ──────────────────────────────────────────────*/

  // Clic sur la cellule : selon le mode (multi-select vs simple clic)
  const handleCellClick = useCallback(
    (e) => {
      if (isOutsideCurrentMonth || !isDayInteractable()) return;

      // Si clic sur une activité : laisser CraActivityItem gérer
      if (e?.target?.closest(".cra-activity-item")) return;

      if (multiSelectType !== "none") {
        // Mode sélection multiple : le mousedown lance la sélection
        if (isDragging) return; // un drag est déjà en cours
        handleMouseDown?.(e, day);
      } else {
        // Mode simple : ouvrir la modale (création/édition)
        handleDayClick?.(day, e);
      }
    },
    [isOutsideCurrentMonth, isDayInteractable, multiSelectType, isDragging, handleMouseDown, day, handleDayClick]
  );

  // DnD sur la cellule (le filtrage d'autorisation est géré dans CraBoard)
  const onCellDragOver = onDragOverDay;
  const onCellDrop = useCallback((e) => onDropActivity?.(e, day), [onDropActivity, day]);

  // Sélection multiple (attachés seulement si le jour est interactif + mode actif)
  const onCellMouseDown = useCallback((e) => handleMouseDown?.(e, day), [handleMouseDown, day]);
  const onCellMouseEnter = useCallback(() => handleMouseEnter?.(day), [handleMouseEnter, day]);

  /* ──────────────────────────────────────────────
   * Rendu
   * ──────────────────────────────────────────────*/
  return (
    <div
      className={cellClassName}
      onClick={handleCellClick}
      onMouseDown={isDayInteractable() && multiSelectType !== "none" ? onCellMouseDown : undefined}
      onMouseEnter={isDayInteractable() && multiSelectType !== "none" ? onCellMouseEnter : undefined}
      onMouseUp={isDayInteractable() && multiSelectType !== "none" ? handleMouseUp : undefined}
      onDragOver={onCellDragOver}
      onDrop={onCellDrop}
    >
      {/* Jour (numéro) */}
      <span className={`text-sm font-semibold mb-1 ${isTodayHighlight ? "text-blue-800" : ""}`}>
        {formattedDate}
      </span>

      {/* Badges contexte (W-E / Férié) */}
      {/* CORRECTION: La condition pour afficher le badge prend désormais en compte isPublicHolidayDay et hasPublicHolidayActivity */}
      {(isNonWorkingDay || hasPublicHolidayActivity) && !isOutsideCurrentMonth && (
        <span className="text-xs text-red-600 font-medium absolute top-1 right-1 px-1 py-0.5 bg-red-100 rounded">
          {shouldShowHolidayBadge && isWeekendDay ? "Férié & W-E" : shouldShowHolidayBadge ? "Férié" : "Week-end"}
        </span>
      )}

      {/* Total du jour (en haut à droite) */}
      {enhancedActivities.length > 0 && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
          {totalLabel}
        </div>
      )}

      {/* Liste des activités (triées) */}
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

/* ──────────────────────────────────────────────────────────────────────────────
 * Comparateur personnalisé pour React.memo
 * - On évite un re-render si rien de pertinent n'a changé visuellement.
 * - On compare jour + flags + activités (faible profondeur).
 * ──────────────────────────────────────────────────────────────────────────────*/
const areEqual = (prev, next) => {
  // Jour (timestamp) & format affiché
  if (+prev.day !== +next.day) return false;
  if (prev.formattedDate !== next.formattedDate) return false;

  // Flags visuels / interaction
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
  for (const k of boolKeys) if (prev[k] !== next[k]) return false;

  // Mode & identités utilisateur (affecte tooltips)
  if (prev.multiSelectType !== next.multiSelectType) return false;
  if (prev.userId !== next.userId) return false;
  if (prev.userFirstName !== next.userFirstName) return false;
  if (prev.paidLeaveTypeId !== next.paidLeaveTypeId) return false;

  // Définitions : si elles changent, on veut re-render
  if (prev.activityTypeDefinitions !== next.activityTypeDefinitions) return false;
  if (prev.clientDefinitions !== next.clientDefinitions) return false;

  // Activités du jour : comparaison légère (taille + champs principaux)
  const a = prev.activitiesForDay || [];
  const b = next.activitiesForDay || [];
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    const A = a[i], B = b[i];
    if (A === B) continue;
    if (
      String(A.id) !== String(B.id) ||
      String(A.type_activite) !== String(B.type_activite) ||
      String(A.client_id ?? "") !== String(B.client_id ?? "") ||
      (A.temps_passe ?? null) !== (B.temps_passe ?? null) ||
      (A.status ?? "draft") !== (B.status ?? "draft") ||
      (A.override_non_working_day ?? false) !== (B.override_non_working_day ?? false)
    ) {
      return false;
    }
  }

  // Handlers : supposés stabilisés par le parent via useCallback (si non, on re-render quand même)
  return (
    prev.handleMouseDown === next.handleMouseDown &&
    prev.handleMouseEnter === next.handleMouseEnter &&
    prev.handleMouseUp === next.handleMouseUp &&
    prev.handleDayClick === next.handleDayClick &&
    prev.onActivityClick === next.onActivityClick &&
    prev.requestDeleteFromCalendar === next.requestDeleteFromCalendar &&
    prev.onDragOverDay === next.onDragOverDay &&
    prev.onDropActivity === next.onDropActivity &&
    prev.onDragStartActivity === next.onDragStartActivity &&
    prev.showMessage === next.showMessage
  );
};

export default React.memo(CraDayCellBase, areEqual);
