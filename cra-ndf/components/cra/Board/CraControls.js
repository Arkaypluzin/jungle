// components/cra/CraControls.js
"use client";

import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function CraControls({
  currentMonth,
  userFirstName,
  craReportStatus,
  paidLeaveReportStatus,
  readOnly, // Cette prop est la lecture seule globale du calendrier (passée depuis CraBoard)
  goToPreviousMonth,
  goToNextMonth,
  handleToggleSummaryReport,
  showSummaryReport,
  requestSendCRA,
  requestSendPaidLeaves,
  requestResetMonth,
  craDraftsCount,
  paidLeaveDraftsCount,
  multiSelectType, // 'activity' ou 'paid_leave'
  onCycleMultiSelectMode,
  isCraEditable, // Spécifique à l'éditabilité du rapport CRA
  isPaidLeaveEditable, // Spécifique à l'éditabilité du rapport Congé Payé
}) {
  let statusBadge = null;
  let badgeClass = "ml-3 text-sm font-bold px-2 py-1 rounded-full";

  // Déterminer le statut global pour le badge
  const overallReportStatus = (() => {
    if (
      craReportStatus === "validated" ||
      paidLeaveReportStatus === "validated"
    )
      return "validated";
    if (
      craReportStatus === "pending_review" ||
      paidLeaveReportStatus === "pending_review"
    )
      return "pending_review";
    if (craReportStatus === "rejected" || paidLeaveReportStatus === "rejected")
      return "rejected";
    if (craReportStatus === "draft" || paidLeaveReportStatus === "draft")
      return "draft";
    return "empty";
  })();

  if (overallReportStatus === "rejected") {
    statusBadge = (
      <span className={`${badgeClass} text-red-700 bg-red-100`}>REJETÉ</span>
    );
  } else if (overallReportStatus === "validated") {
    statusBadge = (
      <span className={`${badgeClass} text-green-700 bg-green-100`}>
        VALIDÉ
      </span>
    );
  } else if (overallReportStatus === "pending_review") {
    statusBadge = (
      <span className={`${badgeClass} text-blue-700 bg-blue-100`}>
        ENVOYÉ (EN ATTENTE DE RÉVISION)
      </span>
    );
  } else if (overallReportStatus === "draft") {
    statusBadge = null; // Pas de badge pour le statut brouillon
  } else {
    statusBadge = null; // Pas de badge pour le statut vide
  }

  // Logique du bouton pour basculer entre les deux modes
  let buttonText = "";
  let buttonClass = "";

  if (multiSelectType === "activity") {
    buttonText = "Passer en mode Congé";
    buttonClass = "bg-blue-600 text-white hover:bg-blue-700";
  } else if (multiSelectType === "paid_leave") {
    buttonText = "Passer en mode Activité";
    buttonClass = "bg-yellow-600 text-white hover:bg-yellow-700";
  } else {
    buttonText = "Activer Sélection Multiple";
    buttonClass = "bg-gray-200 text-gray-700 hover:bg-gray-300";
  }

  const handleClickCycleMode = () => {
    if (typeof onCycleMultiSelectMode === "function") {
      onCycleMultiSelectMode();
    } else {
      console.error(
        "[CraControls] Erreur: onCycleMultiSelectMode n'est pas une fonction.",
        onCycleMultiSelectMode
      );
    }
  };

  // Déterminer l'état des boutons basé sur la prop globale `readOnly`
  // Le bouton de mode multi-sélection est désactivé si `readOnly` est vrai.
  const isMultiSelectToggleDisabled = readOnly;

  // Le bouton de réinitialisation est désactivé si `readOnly` est vrai (calendrier verrouillé)
  // OU si AUCUN des rapports n'est éditable (c'est-à-dire, les deux sont validés/en attente).
  const isResetButtonDisabled =
    readOnly || (!isCraEditable && !isPaidLeaveEditable);

  // Les boutons d'envoi sont désactivés si `readOnly` est vrai (calendrier verrouillé)
  // OU si le rapport spécifique n'est pas éditable OU s'il n'y a pas d'activités à envoyer.
  const isSendCRADisabled = readOnly || !isCraEditable || craDraftsCount === 0;
  const isSendPaidLeavesDisabled =
    readOnly || !isPaidLeaveEditable || paidLeaveDraftsCount === 0;

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

      {/* Action Buttons - Always rendered, but individual buttons disabled based on specific conditions */}
      <div className="flex justify-center space-x-4 mb-8 flex-wrap gap-2">
        {/* Bouton de mode de sélection multiple - Désactivé si readOnly est vrai */}
        <button
          onClick={handleClickCycleMode}
          className={`px-6 py-3 font-semibold rounded-lg shadow-md transition duration-300 ${buttonClass} ${
            isMultiSelectToggleDisabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title="Cliquez pour changer le mode de sélection multiple des jours"
          disabled={isMultiSelectToggleDisabled}
        >
          {buttonText}
        </button>

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
              isSendCRADisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
          disabled={isSendCRADisabled}
        >
          Envoyer les CRAs ({craDraftsCount})
        </button>

        {/* Buttons for Paid Leaves - DIRECT SEND */}
        <button
          onClick={requestSendPaidLeaves}
          className={`px-6 py-3 font-semibold rounded-lg shadow-md transition duration-300
            ${
              isSendPaidLeavesDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-teal-600 text-white hover:bg-teal-700"
            }`}
          disabled={isSendPaidLeavesDisabled}
        >
          Envoyer les congés ({paidLeaveDraftsCount})
        </button>

        <button
          onClick={requestResetMonth}
          className={`px-6 py-3 font-semibold rounded-lg shadow-md transition duration-300
            ${
              isResetButtonDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-orange-600 text-white hover:bg-orange-700"
            }`}
          disabled={isResetButtonDisabled}
        >
          Réinitialiser le mois
        </button>
      </div>
    </>
  );
}
