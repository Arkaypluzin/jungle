// components/cra/CraActivityItem.js
"use client";

import React, { useCallback } from "react";

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
}) {
  const client = clientDefinitions.find(
    (c) => String(c.id) === String(activity.client_id)
  );
  const clientLabel = client ? client.nom_client : "Non attribué";

  const activityTypeObj = activityTypeDefinitions.find(
    (type) => String(type.id) === String(activity.type_activite)
  );
  const activityTypeLabel = activityTypeObj
    ? activityTypeObj.name
    : "Activité inconnue";

  const timeSpentLabel = activity.temps_passe
    ? `${parseFloat(activity.temps_passe)}j`
    : "";
  const displayLabel = `${activityTypeLabel}${
    timeSpentLabel ? ` (${timeSpentLabel})` : ""
  }`;

  const canModifyActivity = useCallback(() => {
    if (String(activity.user_id) !== String(userId)) {
      return false;
    }
    const isActivityStatusEditable = ["draft", "rejected"].includes(
      activity.status
    );
    if (!isActivityStatusEditable) {
      return false;
    }

    const isCRAActivity =
      String(activity.type_activite) !== String(paidLeaveTypeId);
    const isPaidLeaveActivity =
      String(activity.type_activite) === String(paidLeaveTypeId);

    if (isCRAActivity && !isCraEditable) {
      return false;
    }
    if (isPaidLeaveActivity && !isPaidLeaveEditable) {
      return false;
    }
    return true;
  }, [activity, userId, isCraEditable, isPaidLeaveEditable, paidLeaveTypeId]);

  const typeColorClass =
    String(activity.type_activite) === String(paidLeaveTypeId)
      ? "bg-lime-200 text-lime-800"
      : activityTypeLabel.toLowerCase().includes("absence")
      ? "bg-red-200 text-red-800"
      : activityTypeLabel.toLowerCase().includes("heure supplémentaire") ||
        activityTypeObj?.is_overtime
      ? "bg-purple-200 text-purple-800"
      : "bg-blue-200 text-blue-800";

  const overrideLabel = activity.override_non_working_day
    ? " (Dérogation)"
    : "";

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

  const isActivityLockedVisually = [
    "finalized",
    "validated",
    "pending_review",
    "rejected",
  ].includes(activity.status);

  return (
    <div
      className={`relative text-xs px-1 py-0.5 rounded-md mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis
                  ${typeColorClass} ${
        isActivityLockedVisually ? "opacity-70" : ""
      }
                  ${
                    canModifyActivity() && !readOnly
                      ? "cursor-pointer hover:shadow-md"
                      : "cursor-not-allowed opacity-60"
                  }
                  group cra-activity-item`}
      onClick={(e) => {
        e.stopPropagation(); // Empêche le clic sur l'activité de remonter à CraDayCell
        if (!readOnly && canModifyActivity()) {
          handleActivityClick(activity);
        } else {
          showMessage("Cette activité n'est pas modifiable.", "info");
        }
      }}
      title={`Client: ${clientLabel}\nType: ${activityTypeLabel}\nTemps: ${timeSpentLabel}\nDescription: ${
        activity.description_activite || "N/A"
      }${
        overrideLabel ? "\nDérogation jour non ouvrable" : ""
      }\nStatut: ${statusTitle}\nFacturable: ${
        activityTypeObj?.is_billable ? "Oui" : "Non"
      }\nClient requis: ${
        activityTypeObj?.requires_client ? "Oui" : "Non"
      }\nHeures sup: ${
        activityTypeObj?.is_overtime ? "Oui" : "Non"
      }\nUtilisateur: ${userFirstName}`}
    >
      {`${displayLabel} - ${clientLabel}${overrideLabel}`}
      {activityTypeObj?.is_billable ? (
        <span className="ml-1 text-green-600" title="Facturable">
          ✔
        </span>
      ) : (
        <span className="ml-1 text-red-600" title="Non facturable">
          ✖
        </span>
      )}
      {isActivityLockedVisually && (
        <span
          className={`absolute top-0 right-0 h-full flex items-center justify-center p-1 text-xs font-semibold rounded-tr-md rounded-br-md ${statusColorClass}`}
          title={statusTitle}
        >
          {statusDisplayChar}
        </span>
      )}
      {canModifyActivity() &&
        !readOnly && ( // Afficher la croix de suppression seulement si modifiable
          <button
            onClick={(e) => {
              e.stopPropagation(); // Empêche le clic sur le bouton de remonter à l'activité ET à CraDayCell
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
