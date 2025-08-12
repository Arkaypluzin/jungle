// components/cra/CraActivityItem.js
"use client";

import React, { useCallback, useMemo } from "react";

export default function CraActivityItem({
  activity,
  activityTypeDefinitions,
  clientDefinitions,
  handleActivityClick,
  requestDeleteFromCalendar,
  showMessage,
  readOnly,
  userId,
  userFirstName,
  isCraEditable,
  isPaidLeaveEditable,
  paidLeaveTypeId,
  onDragStartActivity, // <- handler drag (via CraBoard)
}) {
  // --- Résolution type & client depuis defs + valeurs DB + fallback ---
  const typeDef = useMemo(
    () =>
      activityTypeDefinitions.find(
        (t) => String(t.id) === String(activity.type_activite)
      ),
    [activity.type_activite, activityTypeDefinitions]
  );

  const clientDef = useMemo(
    () =>
      clientDefinitions.find(
        (c) => String(c.id) === String(activity.client_id)
      ),
    [activity.client_id, clientDefinitions]
  );

  // Paid leave / absence detection (plus robuste)
  const isPaidLeaveActivity = useMemo(() => {
    const fromId = String(activity.type_activite) === String(paidLeaveTypeId);
    const fromKind = activity.__kind === "CP" || activity.__kind === "paid_leave";
    const fromAbsenceFlag = activity.is_absence === true;
    const code = (typeDef?.code || "").toString().toLowerCase();
    const fromCode = code === "cp" || code === "paid_leave";
    return fromId || fromKind || fromAbsenceFlag || fromCode;
  }, [activity.type_activite, activity.__kind, activity.is_absence, paidLeaveTypeId, typeDef?.code]);

  // Labels (ordre de confiance : defs -> valeurs enrichies -> valeurs DB -> fallback)
  const typeLabel =
    typeDef?.name ||
    activity.display_type_label ||     // injecté par CraDayCell (patch précédent)
    activity.activityTypeName ||       // depuis la pipeline d'agrégation Mongo
    activity.type_label ||             // éventuellement calculé côté history
    (isPaidLeaveActivity ? "Congés payés" : "Activité");

  const clientLabel =
    clientDef?.nom_client ||
    activity.display_client_label ||   // injecté par CraDayCell (patch précédent)
    activity.clientName ||             // depuis la pipeline d'agrégation Mongo
    activity.client_label ||           // éventuellement côté history
    "Non attribué";

  // Temps passé (format compact)
  const timeSpentValue = parseFloat(activity.temps_passe);
  const timeSpentLabel = Number.isFinite(timeSpentValue) ? `${timeSpentValue}j` : "";
  const displayLabel = `${typeLabel}${timeSpentLabel ? ` (${timeSpentLabel})` : ""}`;

  // Éditabilité
  const canModifyActivity = useCallback(() => {
    if (String(activity.user_id) !== String(userId)) return false;

    const isActivityStatusEditable = ["draft", "rejected"].includes(activity.status);
    if (!isActivityStatusEditable) return false;

    const isCRAActivity = !isPaidLeaveActivity;
    if (isCRAActivity && !isCraEditable) return false;
    if (isPaidLeaveActivity && !isPaidLeaveEditable) return false;

    return true;
  }, [activity, userId, isCraEditable, isPaidLeaveEditable, isPaidLeaveActivity]);

  // Couleurs par type
  const typeColorClass = useMemo(() => {
    if (isPaidLeaveActivity) return "bg-red-200 text-red-800";
    if (activity.is_absence) return "bg-orange-200 text-orange-800";
    if (typeDef?.is_overtime) return "bg-purple-200 text-purple-800";
    // fallback CRA normal
    return "bg-lime-200 text-lime-800";
  }, [isPaidLeaveActivity, activity.is_absence, typeDef?.is_overtime]);

  // Flags de la définition (fallback sur champs DB si fournis)
  const isBillable = (typeDef?.is_billable ?? activity.is_billable) || false;
  const requiresClient = (typeDef?.requires_client ?? activity.requires_client) || false;
  const isOvertime = (typeDef?.is_overtime ?? activity.is_overtime) || false;

  const overrideLabel = activity.override_non_working_day ? " (Dérogation)" : "";

  // Statut visuel
  let statusColorClass = "";
  let statusDisplayChar = "";
  let statusTitle = "";

  switch (activity.status) {
    case "finalized":
      statusColorClass = "bg-green-300 text-green-900";
      statusDisplayChar = "F";
      statusTitle = "Finalisé";
      break;
    case "validated":
      statusColorClass = "bg-purple-300 text-purple-900";
      statusDisplayChar = "V";
      statusTitle = "Validé";
      break;
    case "pending_review":
      statusColorClass = "bg-blue-300 text-blue-900";
      statusDisplayChar = "A";
      statusTitle = "En attente de révision";
      break;
    case "rejected":
      statusColorClass = "bg-red-300 text-red-900";
      statusDisplayChar = "R";
      statusTitle = "Rejeté";
      break;
    default:
      statusColorClass = "bg-gray-300 text-gray-800";
      statusDisplayChar = "";
      statusTitle = "Brouillon";
      break;
  }

  const isActivityLockedVisually = useMemo(
    () => ["finalized", "validated", "pending_review"].includes(activity.status),
    [activity.status]
  );

  const isDraggable = canModifyActivity() && !readOnly;

  return (
    <div
      className={`relative text-xs px-1 py-0.5 rounded-md mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis
                  ${typeColorClass} ${isActivityLockedVisually ? "opacity-70" : ""}
                  ${isDraggable ? "cursor-grab active:cursor-grabbing hover:shadow-md" : "cursor-not-allowed opacity-60"}
                  group cra-activity-item`}
      onClick={(e) => {
        e.stopPropagation();
        if (!readOnly && canModifyActivity()) {
          handleActivityClick(activity);
        } else {
          showMessage?.("Cette activité n'est pas modifiable.", "info");
        }
      }}
      draggable={isDraggable}
      onDragStart={(e) => {
        e.stopPropagation();
        if (isDraggable && onDragStartActivity) {
          onDragStartActivity(e, activity);
        } else {
          e.preventDefault();
        }
      }}
      title={`Client: ${clientLabel}
Type: ${typeLabel}
Temps: ${timeSpentLabel || "N/A"}
Description: ${activity.description_activite || "N/A"}${overrideLabel ? "\nDérogation jour non ouvrable" : ""
        }
Statut: ${statusTitle}
Facturable: ${isBillable ? "Oui" : "Non"}
Client requis: ${requiresClient ? "Oui" : "Non"}
Heures sup: ${isOvertime ? "Oui" : "Non"}
Utilisateur: ${userFirstName || "N/A"}`}
    >
      {/* Label principal */}
      {`${displayLabel} - ${clientLabel}${overrideLabel}`}

      {/* Tick facturable */}
      {isBillable ? (
        <span className="ml-1 text-green-600" title="Facturable">✔</span>
      ) : (
        <span className="ml-1 text-red-600" title="Non facturable">✖</span>
      )}

      {/* Pastille statut */}
      {isActivityLockedVisually && (
        <span
          className={`absolute top-0 right-0 h-full flex items-center justify-center p-1 text-xs font-semibold rounded-tr-md rounded-br-md ${statusColorClass}`}
          title={statusTitle}
        >
          {statusDisplayChar}
        </span>
      )}

      {/* Bouton suppression (si modifiable) */}
      {canModifyActivity() && !readOnly && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            requestDeleteFromCalendar(activity.id, e);
          }}
          className="absolute top-0 right-0 h-full flex items-center justify-center p-1 bg-red-600 hover:bg-red-700 text-white rounded-tr-md rounded-br-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          title="Supprimer l'activité"
          aria-label="Supprimer l'activité"
        >
          &times;
        </button>
      )}
    </div>
  );
}