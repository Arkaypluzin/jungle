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

  // Résout les libellés depuis la DB (activityTypeName/clientName) avec fallback defs
  const resolveLabelsFromDB = useCallback((activity) => {
    const typeDef = activityTypeDefinitions.find(
      (t) => String(t.id) === String(activity.type_activite)
    );

    const typeLabel =
      typeDef?.name ||
      activity.activityTypeName || // <- nom renvoyé par la DB (model.js)
      activity.type_label ||       // <- éventuellement fourni par l'appelant (history)
      (activity.__kind === "CP" || activity.__kind === "paid_leave"
        ? "Congés payés"
        : "Activité");

    const clientDef = clientDefinitions.find(
      (c) => String(c.id) === String(activity.client_id)
    );

    const clientLabel =
      clientDef?.nom_client ||
      activity.clientName ||  // <- nom client renvoyé par la DB (model.js)
      activity.client_label || "";

    return { typeDef, typeLabel, clientLabel };
  }, [activityTypeDefinitions, clientDefinitions]);

  const enhancedActivities = useMemo(() => {
    return activitiesForDay.map((activity) => {
      const { typeDef, typeLabel, clientLabel } = resolveLabelsFromDB(activity);
      return {
        ...activity,
        is_absence: typeDef?.is_absence || activity.is_absence || false,
        is_overtime: typeDef?.is_overtime || activity.is_overtime || false,
        // labels prêts pour l'affichage + tri
        display_type_label: typeLabel,
        display_client_label: clientLabel,
        // 🔑 Fournit toujours un name exploitable pour CraActivityItem
        name: activity.name || typeLabel,
      };
    });
  }, [activitiesForDay, resolveLabelsFromDB]);

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
        className={`text-sm font-semibold mb-1 ${isTodayHighlight ? "text-blue-800" : ""
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
            const typeA = a.display_type_label || "";
            const typeB = b.display_type_label || "";
            if (typeA < typeB) return -1;
            if (typeA > typeB) return 1;

            const clientA = a.display_client_label || "";
            const clientB = b.display_client_label || "";
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
              handleActivityClick={onActivityClick}
              requestDeleteFromCalendar={requestDeleteFromCalendar}
              showMessage={showMessage}
              readOnly={readOnly}
              isCraEditable={isCraEditable}
              isPaidLeaveEditable={isPaidLeaveEditable}
              userId={userId}
              userFirstName={userFirstName}
              paidLeaveTypeId={paidLeaveTypeId}
              isDraggable={
                !readOnly &&
                activity.user_id === userId &&
                (activity.status === "draft" || activity.status === "rejected")
              }
              onDragStartActivity={onDragStartActivity}
            />
          ))}
      </div>
    </div>
  );
}
