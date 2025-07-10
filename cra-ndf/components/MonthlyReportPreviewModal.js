// components/MonthlyReportPreviewModal.js
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import CraBoard from "./CraBoard"; // Importez le CraBoard

export default function MonthlyReportPreviewModal({
  isOpen,
  onClose,
  reportData, // C'est le tableau des activités snapshotées du rapport mensuel
  year,
  month,
  userName,
  userId, // L'ID de l'utilisateur du CRA
  reportId, // L'ID du rapport mensuel lui-même
  reportStatus, // Le statut actuel du rapport (ex: pending_review, validated, rejected)
  rejectionReason, // Motif de rejet si applicable

  clientDefinitions, // Définitions des clients
  activityTypeDefinitions, // Définitions des types d'activités

  onValidateCra, // Fonction de callback pour valider le CRA
  onRejectCra, // Fonction de callback pour rejeter le CRA
  isAdminOrManager, // Indique si l'utilisateur connecté est admin/manager
}) {
  if (!isOpen) return null;

  const currentMonthDate = new Date(year, month - 1);

  // Fonction pour les messages (simple console.log pour cette modale)
  const showMessage = useCallback((message, type = "info") => {
    console.log(`MonthlyReportPreviewModal Message (${type}): ${message}`);
    // Vous pouvez intégrer un toast ici si vous le souhaitez
  }, []);

  // Fonction factice pour onAddActivity, onUpdateActivity, onDeleteActivity
  // car CraBoard sera en lecture seule dans cette modale.
  const noOp = useCallback(() => {
    showMessage(
      "Opération non autorisée en mode visualisation de CRA.",
      "info"
    );
  }, [showMessage]);

  // Déterminer si les boutons Valider/Rejeter doivent être affichés et actifs
  const canActOnReport = isAdminOrManager && reportStatus === "pending_review";

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-auto p-6 sm:p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 text-2xl font-bold"
          aria-label="Fermer"
        >
          &times;
        </button>

        <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
          CRA de {userName} -{" "}
          {format(currentMonthDate, "MMMM yyyy", { locale: fr })}
        </h2>

        <div className="mb-6 text-center">
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold
            ${reportStatus === "validated" ? "bg-green-100 text-green-800" : ""}
            ${
              reportStatus === "pending_review"
                ? "bg-blue-100 text-blue-800"
                : ""
            }
            ${reportStatus === "rejected" ? "bg-red-100 text-red-800" : ""}
          `}
          >
            Statut:{" "}
            {reportStatus === "validated"
              ? "Validé"
              : reportStatus === "pending_review"
              ? "En attente de révision"
              : reportStatus === "rejected"
              ? "Rejeté"
              : "Inconnu"}
          </span>
          {reportStatus === "rejected" && rejectionReason && (
            <p className="text-red-600 text-sm mt-2">
              Motif du rejet: {rejectionReason}
            </p>
          )}
        </div>

        {/* Intégration du CraBoard */}
        <CraBoard
          activities={reportData} // Les activités snapshotées du rapport
          activityTypeDefinitions={activityTypeDefinitions}
          clientDefinitions={clientDefinitions}
          userId={userId} // L'ID de l'utilisateur du CRA
          userFirstName={userName.split(" ")[0]}
          showMessage={showMessage} // Passe la fonction showMessage
          currentMonth={currentMonthDate}
          onMonthChange={noOp} // Désactive le changement de mois
          onAddActivity={noOp} // Désactive l'ajout d'activité
          onUpdateActivity={noOp} // Désactive la modification d'activité
          onDeleteActivity={noOp} // Désactive la suppression d'activité
          fetchActivitiesForMonth={useCallback(() => {
            // Cette fonction est appelée par CraBoard.
            // En mode lecture seule ici, elle ne doit pas refetcher.
            console.log(
              "CraBoard en mode lecture seule : pas de fetch interne."
            );
          }, [])}
          readOnly={true} // Rend le CraBoard en lecture seule
        />

        {/* Boutons d'action pour le rapport mensuel */}
        {canActOnReport && (
          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={() =>
                onValidateCra({ id: reportId, userName, year, month })
              }
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-300"
            >
              Valider le CRA
            </button>
            <button
              onClick={() =>
                onRejectCra({ id: reportId, userName, year, month })
              }
              className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition duration-300"
            >
              Rejeter le CRA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
