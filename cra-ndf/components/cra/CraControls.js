// components/cra/CraControls.js
import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function CraControls({
  currentMonth,
  userFirstName,
  // Use specific report statuses for more accurate badge display
  craReportStatus,
  paidLeaveReportStatus,
  readOnly,
  goToPreviousMonth,
  goToNextMonth,
  handleToggleSummaryReport,
  showSummaryReport,
  requestSendCRA,
  requestSendPaidLeaves,
  requestResetMonth,
  craDraftsCount,
  paidLeaveDraftsCount,
}) {
  let statusBadge = null;
  let badgeClass = "ml-3 text-sm font-bold px-2 py-1 rounded-full";

  // Prioritize status display: Rejected > Validated > Pending Review > Mixed > Draft/Empty
  if (craReportStatus === "rejected" || paidLeaveReportStatus === "rejected") {
    statusBadge = (
      <span className={`${badgeClass} text-red-700 bg-red-100`}>REJETÉ</span>
    );
  } else if (
    craReportStatus === "validated" ||
    paidLeaveReportStatus === "validated"
  ) {
    statusBadge = (
      <span className={`${badgeClass} text-green-700 bg-green-100`}>
        VALIDÉ
      </span>
    );
  } else if (
    craReportStatus === "pending_review" ||
    paidLeaveReportStatus === "pending_review"
  ) {
    statusBadge = (
      <span className={`${badgeClass} text-blue-700 bg-blue-100`}>
        ENVOYÉ (EN ATTENTE DE RÉVISION)
      </span>
    );
  } else if (craReportStatus === "mixed" || paidLeaveReportStatus === "mixed") {
    // If one is mixed, show mixed
    statusBadge = (
      <span className={`${badgeClass} text-purple-700 bg-purple-100`}>
        PARTIEL
      </span>
    );
  } else if (craReportStatus === "draft" || paidLeaveReportStatus === "draft") {
    statusBadge = null; // No badge for draft, it's the default editable state
  } else {
    statusBadge = null; // No badge for empty
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4 p-4 bg-blue-100 rounded-lg shadow-md">
        <button
          onClick={goToPreviousMonth}
          className={`p-2 rounded-full bg-blue-500 text-white transition duration-300 ${
            readOnly ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"
          }`}
          aria-label="Mois précédent"
          disabled={readOnly}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="flex flex-col items-center">
          <h3 className="text-xl font-semibold text-blue-700 mb-1">
            {userFirstName}
          </h3>
          <h2 className="text-2xl font-semibold text-blue-800 flex items-center">
            {format(currentMonth, "MMMM ", { locale: fr })}
            <span className="ml-1">{format(currentMonth, "yyyy")}</span>
            {statusBadge}
          </h2>
        </div>
        <button
          onClick={goToNextMonth}
          className={`p-2 rounded-full bg-blue-500 text-white transition duration-300 ${
            readOnly ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"
          }`}
          aria-label="Mois suivant"
          disabled={readOnly}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {!readOnly && (
        <div className="flex justify-center space-x-4 mb-8 flex-wrap gap-2">
          <button
            onClick={handleToggleSummaryReport}
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-300"
          >
            {showSummaryReport ? "Masquer le rapport" : "Afficher le rapport"}
          </button>

          {/* Buttons for CRAs (work activities) - DIRECT SEND */}
          <button
            onClick={requestSendCRA}
            className={`px-6 py-3 font-semibold rounded-lg shadow-md transition duration-300
              ${
                craDraftsCount === 0 ||
                readOnly ||
                ["pending_review", "validated", "rejected"].includes(
                  craReportStatus
                )
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-purple-600 text-white hover:bg-purple-700"
              }`}
            disabled={
              craDraftsCount === 0 ||
              readOnly ||
              ["pending_review", "validated", "rejected"].includes(
                craReportStatus
              )
            }
          >
            Envoyer les CRAs
          </button>

          {/* Buttons for Paid Leaves - DIRECT SEND */}
          <button
            onClick={requestSendPaidLeaves}
            className={`px-6 py-3 font-semibold rounded-lg shadow-md transition duration-300
              ${
                paidLeaveDraftsCount === 0 ||
                readOnly ||
                ["pending_review", "validated", "rejected"].includes(
                  paidLeaveReportStatus
                )
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-teal-600 text-white hover:bg-teal-700"
              }`}
            disabled={
              paidLeaveDraftsCount === 0 ||
              readOnly ||
              ["pending_review", "validated", "rejected"].includes(
                paidLeaveReportStatus
              )
            }
          >
            Envoyer les congés
          </button>

          <button
            onClick={requestResetMonth}
            className={`px-6 py-3 font-semibold rounded-lg shadow-md transition duration-300
              ${
                // Reset is only possible if NEITHER report is validated, rejected, or pending_review
                readOnly ||
                ["validated", "rejected", "pending_review"].includes(
                  craReportStatus
                ) ||
                ["validated", "rejected", "pending_review"].includes(
                  paidLeaveReportStatus
                )
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-orange-600 text-white hover:bg-orange-700"
              }`}
            disabled={
              readOnly ||
              ["validated", "rejected", "pending_review"].includes(
                craReportStatus
              ) ||
              ["validated", "rejected", "pending_review"].includes(
                paidLeaveReportStatus
              )
            }
          >
            Réinitialiser le mois
          </button>
        </div>
      )}
    </>
  );
}
