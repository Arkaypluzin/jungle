"use client";

/**
 * CraControls
 * -----------
 * En-tête du calendrier : navigation mois, statut global, bascule de mode
 * (activité ↔ congé), ouverture du rapport, envoi CRA / CP et réinitialisation.
 *
 * Optimisations :
 * - Toutes les dérivations (statut global, libellés, états disabled) sont mémoïsées.
 * - Composant mémoïsé avec comparaison personnalisée (limite les re-renders).
 * - Pas de console.log ni de calculs dans le rendu.
 */

import React, { useMemo, useCallback } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/* ──────────────────────────────────────────────────────────────────────────────
 * Utilitaires d'affichage
 * ──────────────────────────────────────────────────────────────────────────────*/

/** Détermine le statut global (fusion CRA + Congés) pour l’affichage d’un badge. */
function computeOverallStatus(craStatus, cpStatus) {
  if (craStatus === "validated" || cpStatus === "validated") return "validated";
  if (craStatus === "pending_review" || cpStatus === "pending_review") return "pending_review";
  if (craStatus === "rejected" || cpStatus === "rejected") return "rejected";
  if (craStatus === "draft" || cpStatus === "draft") return "draft";
  return "empty";
}

/** Petit composant badge de statut (compact, pur). */
const StatusBadge = React.memo(function StatusBadge({ status }) {
  const base = "ml-3 text-sm font-bold px-2 py-1 rounded-full";
  if (status === "validated") return <span className={`${base} text-green-700 bg-green-100`}>VALIDÉ</span>;
  if (status === "pending_review") return <span className={`${base} text-blue-700 bg-blue-100`}>ENVOYÉ (EN ATTENTE DE RÉVISION)</span>;
  if (status === "rejected") return <span className={`${base} text-red-700 bg-red-100`}>REJETÉ</span>;
  return null; // pas de badge pour 'draft' ou 'empty'
});

/* ──────────────────────────────────────────────────────────────────────────────
 * Composant principal
 * ──────────────────────────────────────────────────────────────────────────────*/

function CraControlsBase({
  currentMonth,
  userFirstName,
  craReportStatus,
  paidLeaveReportStatus,
  readOnly,                 // lecture seule globale (verrouille l'UI)
  goToPreviousMonth,
  goToNextMonth,
  handleToggleSummaryReport,
  showSummaryReport,
  requestSendCRA,
  requestSendPaidLeaves,
  requestResetMonth,
  craDraftsCount,
  paidLeaveDraftsCount,
  multiSelectType,          // 'activity' | 'paid_leave' | 'none'
  onCycleMultiSelectMode,
  isCraEditable,
  isPaidLeaveEditable,
}) {
  /* ────────────────────────────────────────────────────────────────────────
   * Dérivations mémoïsées
   * ────────────────────────────────────────────────────────────────────────*/

  // Mois / année affichés (évite de refaire format à chaque render)
  const { monthLabel, yearLabel } = useMemo(
    () => ({
      monthLabel: format(currentMonth, "MMMM ", { locale: fr }),
      yearLabel: format(currentMonth, "yyyy"),
    }),
    [currentMonth]
  );

  // Statut global pour le badge
  const overallStatus = useMemo(
    () => computeOverallStatus(craReportStatus, paidLeaveReportStatus),
    [craReportStatus, paidLeaveReportStatus]
  );

  // Texte / style du bouton de mode (activité ↔ congé)
  const { modeButtonText, modeButtonClass } = useMemo(() => {
    if (multiSelectType === "activity") {
      return { modeButtonText: "Passer en mode Congé", modeButtonClass: "bg-blue-600 text-white hover:bg-blue-700" };
    }
    if (multiSelectType === "paid_leave") {
      return { modeButtonText: "Passer en mode Activité", modeButtonClass: "bg-yellow-600 text-white hover:bg-yellow-700" };
    }
    return { modeButtonText: "Activer Sélection Multiple", modeButtonClass: "bg-gray-200 text-gray-700 hover:bg-gray-300" };
  }, [multiSelectType]);

  // États disabled (toutes les conditions regroupées ici)
  const {
    isMultiSelectToggleDisabled,
    isResetButtonDisabled,
    isSendCRADisabled,
    isSendPaidLeavesDisabled,
  } = useMemo(
    () => ({
      isMultiSelectToggleDisabled: readOnly,
      isResetButtonDisabled: readOnly || (!isCraEditable && !isPaidLeaveEditable),
      isSendCRADisabled: readOnly || !isCraEditable || craDraftsCount === 0,
      isSendPaidLeavesDisabled: readOnly || !isPaidLeaveEditable || paidLeaveDraftsCount === 0,
    }),
    [readOnly, isCraEditable, isPaidLeaveEditable, craDraftsCount, paidLeaveDraftsCount]
  );

  // Wrapper stable pour la bascule du mode (évite de recréer la fonction)
  const handleCycleMode = useCallback(() => {
    if (typeof onCycleMultiSelectMode === "function") onCycleMultiSelectMode();
  }, [onCycleMultiSelectMode]);

  /* ────────────────────────────────────────────────────────────────────────
   * Rendu
   * ────────────────────────────────────────────────────────────────────────*/
  return (
    <>
      {/* Bandeau navigation + en-tête */}
      <div className="flex justify-between items-center mb-4 p-4 bg-blue-100 rounded-lg shadow-md">
        <button
          onClick={goToPreviousMonth}
          className={`p-2 rounded-full bg-blue-500 text-white transition duration-300 ${readOnly ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"}`}
          aria-label="Mois précédent"
          disabled={readOnly}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex flex-col items-center">
          <h3 className="text-xl font-semibold text-blue-700 mb-1">{userFirstName}</h3>
          <h2 className="text-2xl font-semibold text-blue-800 flex items-center">
            {monthLabel}<span className="ml-1">{yearLabel}</span>
            <StatusBadge status={overallStatus} />
          </h2>
        </div>

        <button
          onClick={goToNextMonth}
          className={`p-2 rounded-full bg-blue-500 text-white transition duration-300 ${readOnly ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"}`}
          aria-label="Mois suivant"
          disabled={readOnly}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Actions */}
      <div className="flex justify-center space-x-4 mb-8 flex-wrap gap-2">
        {/* Bascule mode multi-sélection */}
        <button
          onClick={handleCycleMode}
          className={`px-6 py-3 font-semibold rounded-lg shadow-md transition duration-300 ${modeButtonClass} ${isMultiSelectToggleDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
          title="Changer le mode de sélection multiple des jours"
          disabled={isMultiSelectToggleDisabled}
        >
          {modeButtonText}
        </button>

        {/* Afficher/Masquer le rapport récap */}
        <button
          onClick={handleToggleSummaryReport}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-300"
        >
          {showSummaryReport ? "Masquer le rapport" : "Afficher le rapport"}
        </button>

        {/* Envoi CRA */}
        <button
          onClick={requestSendCRA}
          className={`px-6 py-3 font-semibold rounded-lg shadow-md transition duration-300 ${isSendCRADisabled ? "bg-gray-400 cursor-not-allowed" : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
          disabled={isSendCRADisabled}
        >
          Envoyer les CRAs ({craDraftsCount})
        </button>

        {/* Envoi Congés Payés */}
        <button
          onClick={requestSendPaidLeaves}
          className={`px-6 py-3 font-semibold rounded-lg shadow-md transition duration-300 ${isSendPaidLeavesDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-teal-600 text-white hover:bg-teal-700"
            }`}
          disabled={isSendPaidLeavesDisabled}
        >
          Envoyer les congés ({paidLeaveDraftsCount})
        </button>

        {/* Réinitialisation du mois */}
        <button
          onClick={requestResetMonth}
          className={`px-6 py-3 font-semibold rounded-lg shadow-md transition duration-300 ${isResetButtonDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-orange-600 text-white hover:bg-orange-700"
            }`}
          disabled={isResetButtonDisabled}
        >
          Réinitialiser le mois
        </button>
      </div>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
 * Mémoïsation du composant :
 *  - Compare uniquement les props qui ont un impact visuel/interaction.
 *  - On considère que les callbacks parents sont stabilisés via useCallback.
 * ──────────────────────────────────────────────────────────────────────────────*/
const areEqual = (prev, next) => {
  // Mois affiché (comparaison année/mois pour éviter les re-renders au sein du même mois)
  const prevYM = `${new Date(prev.currentMonth).getFullYear()}-${new Date(prev.currentMonth).getMonth()}`;
  const nextYM = `${new Date(next.currentMonth).getFullYear()}-${new Date(next.currentMonth).getMonth()}`;
  if (prevYM !== nextYM) return false;

  // Statuts rapports
  if (prev.craReportStatus !== next.craReportStatus) return false;
  if (prev.paidLeaveReportStatus !== next.paidLeaveReportStatus) return false;

  // Flags & compteurs
  if (prev.readOnly !== next.readOnly) return false;
  if (prev.isCraEditable !== next.isCraEditable) return false;
  if (prev.isPaidLeaveEditable !== next.isPaidLeaveEditable) return false;
  if (prev.craDraftsCount !== next.craDraftsCount) return false;
  if (prev.paidLeaveDraftsCount !== next.paidLeaveDraftsCount) return false;
  if (prev.multiSelectType !== next.multiSelectType) return false;
  if (prev.showSummaryReport !== next.showSummaryReport) return false;

  // Contexte
  if (prev.userFirstName !== next.userFirstName) return false;

  return true;
};

export default React.memo(CraControlsBase, areEqual);