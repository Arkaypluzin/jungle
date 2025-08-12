// components/cra/CraDayCell.js
"use client";

import React, { useCallback, useMemo } from "react";
import {
  format,
  isToday,
  isWeekend,
  isSameMonth,
  isBefore,
  startOfDay,
  isValid,
} from "date-fns";
import { fr } from "date-fns/locale";
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
  isPastDay,
  isTempSelected,
  // Handlers pour la sélection multiple (passés conditionnellement par CraCalendar)
  handleMouseDown,
  handleMouseEnter,
  handleMouseUp, // Ce handler est pour la fin du drag de sélection multiple
  // Handlers pour le clic simple et le D&D individuel (toujours passés par CraCalendar)
  handleDayClick, // Pour le clic simple sur la cellule (ajout/édition 1 jour)
  onActivityClick, // Pour le clic sur une activité existante
  requestDeleteFromCalendar,
  activityTypeDefinitions,
  clientDefinitions,
  showMessage,
  readOnly,
  isCraEditable,
  isPaidLeaveEditable,
  userId,
  userFirstName,
  currentMonth,
  // Props pour le D&D individuel (passées par CraCalendar)
  onDragOverDay,
  onDropActivity,
  isDraggingActivity,
  isDropTargetValid,
  // Props pour le mode de sélection
  multiSelectType, // 'none', 'activity', 'paid_leave'
  isDragging, // Indique si un drag de sélection multiple est en cours (renommé isDraggingMultiSelect dans CraBoard)
  paidLeaveTypeId,
  onDragStartActivity, // Passé directement de CraBoard à CraActivityItem via CraCalendar
}) {
  if (!isValid(day)) {
    console.error("CraDayCell: Prop 'day' invalide reçue:", day);
    return null;
  }

  const isDayInteractable = useCallback(() => {
    if (readOnly) return false;
    // Un jour est interactif si au moins un des rapports est éditable
    return isCraEditable || isPaidLeaveEditable;
  }, [readOnly, isCraEditable, isPaidLeaveEditable]);

  // --- Détermination des classes CSS et du comportement ---
  let cellClasses = [
    "relative p-2 h-32 sm:h-40 flex flex-col justify-start border rounded-lg m-0.5 transition duration-200 overflow-hidden",
  ];

  // Couleurs de base et opacité pour les jours hors mois
  if (isOutsideCurrentMonth) {
    cellClasses.push(
      "bg-gray-100 text-gray-400 border-gray-200 opacity-50 cursor-not-allowed"
    );
  } else {
    // Styles pour les jours dans le mois courant
    if (isTodayHighlight) {
      cellClasses.push("bg-blue-100 border-blue-500 shadow-md text-blue-800");
    } else if (isNonWorkingDay) {
      cellClasses.push("bg-gray-200 text-gray-500 border-gray-300");
    } else {
      cellClasses.push("bg-white text-gray-900 border-gray-300");
    }

    // Styles pour la sélection temporaire (multi-sélection)
    if (
      isTempSelected &&
      (multiSelectType === "activity" || multiSelectType === "paid_leave")
    ) {
      cellClasses.push("ring-2 ring-blue-400 border-blue-500 bg-blue-50");
    }

    // Styles pour le feedback de D&D individuel
    // Ces styles sont toujours actifs si un D&D individuel est en cours
    if (isDraggingActivity) {
      if (isDropTargetValid) {
        cellClasses.push("border-dashed border-green-500 bg-green-50");
      } else {
        cellClasses.push("border-dashed border-red-500 bg-red-50");
      }
    }

    // Curseur en fonction du mode et de l'interactibilité (PAS DE CHANGEMENT DE CURSEUR POUR LES MODES MULTI-SÉLECTION)
    if (isDayInteractable()) {
      // Le curseur par défaut est "default" ou "pointer" pour les modes multi-sélection
      cellClasses.push("cursor-pointer hover:bg-blue-50");
    } else {
      cellClasses.push("cursor-not-allowed");
    }
  }

  // --- Gestionnaires d'événements conditionnels ---

  // Pour le clic sur la cellule (qui peut initier une sélection multiple ou ouvrir une modale simple)
  const handleCellClick = useCallback(
    (e) => {
      // Empêcher le clic si le jour est hors du mois ou non interactif
      if (isOutsideCurrentMonth || !isDayInteractable()) {
        return;
      }

      // Si le clic vient d'une activité individuelle, ne rien faire (géré par CraActivityItem)
      if (e && e.target.closest(".cra-activity-item")) {
        return;
      }

      // Si un mode de sélection multiple est actif, le clic simple sur la cellule n'ouvre PAS la modale.
      // L'événement `onMouseDown` initiera la sélection multiple.
      if (multiSelectType !== "none") {
        // Si un drag de sélection multiple est déjà en cours, ne rien faire.
        if (isDragging) return; // isDragging ici est isDraggingMultiSelect de CraBoard

        // Si c'est un clic simple en mode multi-sélection, on initie le drag (simuler mousedown)
        // Ceci est un fallback si l'utilisateur ne fait pas un "drag" après le clic initial.
        // Le `onMouseDown` réel capturera le début du drag.
        if (handleMouseDown) {
          handleMouseDown(e, day);
        }
      } else {
        // Mode "Glisser-Déposer" (none) : clic simple sur la cellule ouvre la modale pour un seul jour
        if (handleDayClick) {
          handleDayClick(day, e);
        }
      }
    },
    [
      isOutsideCurrentMonth,
      isDayInteractable,
      multiSelectType,
      isDragging,
      handleMouseDown,
      handleDayClick,
      day,
    ]
  );

  // Les handlers de D&D sur la cellule sont toujours actifs (la logique de CraBoard les filtrera)
  const onCellDragOver = onDragOverDay;
  const onCellDrop = (e) => onDropActivity(e, day);

  const enhancedActivities = useMemo(() => {
    return activitiesForDay.map((activity) => {
      const typeDefinition = activityTypeDefinitions.find(
        (t) => String(t.id) === String(activity.type_activite)
      );
      return {
        ...activity,
        // Ajout des propriétés `is_absence` et `is_overtime` à l'activité
        is_absence: typeDefinition?.is_absence || false,
        is_overtime: typeDefinition?.is_overtime || false,
      };
    });
  }, [activitiesForDay, activityTypeDefinitions]);

  return (
    <div
      className={cellClasses.join(" ")}
      onClick={handleCellClick} // Utilise le nouveau handler de clic pour la cellule
      // Les handlers de sélection multiple sont attachés si multiSelectType n'est pas 'none'
      onMouseDown={
        isDayInteractable() && multiSelectType !== "none" && handleMouseDown
          ? (e) => handleMouseDown(e, day)
          : undefined
      }
      onMouseEnter={
        isDayInteractable() && multiSelectType !== "none" && handleMouseEnter
          ? () => handleMouseEnter(day)
          : undefined
      }
      onMouseUp={
        isDayInteractable() && multiSelectType !== "none" && handleMouseUp
          ? handleMouseUp
          : undefined
      }
      // Les handlers de D&D individuel sont toujours attachés
      onDragOver={onCellDragOver}
      onDrop={onCellDrop}
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

      {enhancedActivities.length > 0 && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
          {enhancedActivities
            .reduce((sum, act) => sum + (parseFloat(act.temps_passe) || 0), 0)
            .toFixed(1)}
          j
        </div>
      )}

      <div className="flex-grow overflow-y-auto w-full pr-1 custom-scrollbar">
        {enhancedActivities
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
              )?.nom_client ||
              a.client_name ||
              "";
            const clientB =
              clientDefinitions.find(
                (c) => String(c.id) === String(b.client_id)
              )?.nom_client ||
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
              handleActivityClick={onActivityClick} // Toujours actif
              requestDeleteFromCalendar={requestDeleteFromCalendar}
              showMessage={showMessage}
              readOnly={readOnly}
              isCraEditable={isCraEditable}
              isPaidLeaveEditable={isPaidLeaveEditable}
              userId={userId}
              userFirstName={userFirstName}
              paidLeaveTypeId={paidLeaveTypeId}
              // L'attribut draggable est maintenant géré uniquement par canModifyActivity et readOnly
              isDraggable={
                !readOnly &&
                activity.user_id === userId &&
                (activity.status === "draft" || activity.status === "rejected")
              }
              onDragStartActivity={onDragStartActivity} // Passé directement de CraBoard
            />
          ))}
      </div>
    </div>
  );
}
