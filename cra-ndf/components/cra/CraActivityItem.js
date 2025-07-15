// components/cra/CraActivityItem.js
import React from "react";

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

  const typeColorClass = activityTypeLabel.toLowerCase().includes("congé payé")
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
  if (activity.status === "finalized") {
    statusColorClass = "bg-green-300 text-green-900";
  } else if (activity.status === "validated") {
    statusColorClass = "bg-purple-300 text-purple-900";
  } else if (activity.status === "pending_review") {
    statusColorClass = "bg-blue-300 text-blue-900";
  } else {
    statusColorClass = "bg-gray-300 text-gray-800";
  }

  const isActivityFinalizedOrValidated =
    activity.status === "finalized" ||
    activity.status === "validated" ||
    activity.status === "pending_review" ||
    activity.status === "rejected";

  return (
    <div
      className={`relative text-xs px-1 py-0.5 rounded-md mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis
                  ${typeColorClass} ${
        isActivityFinalizedOrValidated ? "opacity-70" : ""
      } group`}
      onClick={(e) => {
        e.stopPropagation();
        if (!readOnly) handleActivityClick(activity);
        else
          showMessage(
            "Modification d'activité désactivée en mode lecture seule.",
            "info"
          );
      }}
      title={`Client: ${clientLabel}\nType: ${activityTypeLabel}\nTemps: ${timeSpentLabel}\nDescription: ${
        activity.description_activite || "N/A"
      }${overrideLabel ? "\nDérogation jour non ouvrable" : ""}\nStatut: ${
        activity.status === "validated"
          ? "Validé"
          : activity.status === "finalized"
          ? "Finalisé"
          : activity.status === "pending_review"
          ? "En attente de révision"
          : activity.status === "rejected"
          ? "Rejeté"
          : "Brouillon"
      }\nFacturable: ${
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
      {isActivityFinalizedOrValidated && (
        <span
          className={`absolute top-0 right-0 h-full flex items-center justify-center p-1 text-xs font-semibold rounded-tr-md rounded-br-md ${statusColorClass}`}
          title={
            activity.status === "validated"
              ? "V"
              : activity.status === "finalized"
              ? "F"
              : activity.status === "pending_review"
              ? "A"
              : activity.status === "rejected"
              ? "R"
              : ""
          }
        >
          {activity.status === "validated"
            ? "V"
            : activity.status === "finalized"
            ? "F"
            : activity.status === "pending_review"
            ? "A"
            : activity.status === "rejected"
            ? "R"
            : ""}
        </span>
      )}
      {!isActivityFinalizedOrValidated && !readOnly && (
        <button
          onClick={(e) => requestDeleteFromCalendar(activity.id, e)}
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
