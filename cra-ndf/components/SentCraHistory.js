// components/SentCraHistory.js
"use client"; // Assurez-vous que c'est un Client Component

import React, { useMemo, useState, useCallback } from "react";
import { format, startOfMonth, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import MonthlyDetailedReport from "./MonthlyDetailedReport"; // Chemin relatif depuis components/SentCraHistory.js

export default function SentCraHistory({
  craActivities,
  clientDefinitions,
  activityTypeDefinitions,
  currentUserId,
  currentUserName,
  showMessage,
  onUpdateCraStatus, // C'est la prop pour valider/rejeter
  onFinalizeMonth, // C'est la prop pour finaliser un mois
}) {
  const [selectedMonthForReport, setSelectedMonthForReport] = useState(null); // Pour le rapport détaillé
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [monthToReject, setMonthToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Groupement des activités par mois et statut
  const groupedActivities = useMemo(() => {
    const groups = {};
    craActivities.forEach((activity) => {
      // Assurez-vous que activity.date_activite est un objet Date valide
      const activityDate = activity.date_activite; // Est déjà un objet Date

      if (isValid(activityDate)) {
        const monthKey = format(activityDate, "yyyy-MM");
        const monthYearFormat = format(activityDate, "MMMM", { locale: fr }); // Format sans l'année pour l'affichage

        if (!groups[monthKey]) {
          groups[monthKey] = {
            monthKey: monthKey, // Ajout de la clé pour faciliter le tri et la référence
            monthYearDisplay: monthYearFormat,
            year: activityDate.getFullYear(),
            month: activityDate.getMonth() + 1, // Mois de 1 à 12
            activities: [],
            status: "draft", // Statut par défaut avant agrégation
            rejectionReason: null,
            rejectedBy: null,
            rejectedAt: null,
          };
        }
        groups[monthKey].activities.push(activity);
      }
    });

    // Déterminer le statut final pour chaque mois
    Object.keys(groups).forEach((monthKey) => {
      const monthGroup = groups[monthKey];
      const statuses = monthGroup.activities.map((a) => a.status);

      if (statuses.every((s) => s === "validated")) {
        monthGroup.status = "validated";
      } else if (statuses.every((s) => s === "finalized")) {
        monthGroup.status = "finalized";
      } else if (statuses.every((s) => s === "draft")) {
        monthGroup.status = "draft";
      } else if (statuses.some((s) => s === "rejected")) {
        monthGroup.status = "rejected";
        // Trouver la raison de rejet et l'auteur/date du rejet si le mois est rejeté
        const rejectedActivity = monthGroup.activities.find(
          (a) => a.status === "rejected"
        );
        if (rejectedActivity) {
          monthGroup.rejectionReason = rejectedActivity.rejection_reason;
          monthGroup.rejectedBy = rejectedActivity.rejected_by;
          monthGroup.rejectedAt = rejectedActivity.rejected_at;
        }
      } else {
        monthGroup.status = "mixed"; // Si un mélange de statuts non homogènes
      }
    });

    // Convertir en tableau et trier par date décroissante
    return Object.values(groups).sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1);
      const dateB = new Date(b.year, b.month - 1);
      return dateB.getTime() - dateA.getTime();
    });
  }, [craActivities]);

  const getStatusColor = (status) => {
    switch (status) {
      case "draft":
        return "bg-blue-100 text-blue-800";
      case "finalized":
        return "bg-yellow-100 text-yellow-800";
      case "validated":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "mixed":
        return "bg-purple-100 text-purple-800"; // Pour les mois avec des statuts mélangés
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewDetailedReport = useCallback(
    (monthGroup) => {
      setSelectedMonthForReport({
        year: monthGroup.year,
        month: monthGroup.month,
        activities: monthGroup.activities.map((activity) => ({
          ...activity,
          // Assurez-vous que date_activite est un objet Date pour le rapport
          date_activite: activity.date_activite, // Est déjà un objet Date
          client_name:
            clientDefinitions.find((c) => c.id === activity.client_id)
              ?.nom_client || "Non attribué",
          activity_type_name_full:
            activityTypeDefinitions.find(
              (at) => at.name === activity.type_activite
            )?.name_full || activity.type_activite,
        })),
      });
      setIsReportModalOpen(true);
    },
    [craActivities, clientDefinitions, activityTypeDefinitions]
  );

  // Renommé pour éviter la confusion avec la prop onFinalizeMonth
  const handleFinalizeClick = useCallback(
    async (monthGroup) => {
      console.log(
        "handleFinalizeClick appelé pour:",
        monthGroup.monthYearDisplay,
        "Statut actuel:",
        monthGroup.status
      );
      if (monthGroup.status !== "draft" && monthGroup.status !== "mixed") {
        showMessage(
          `Le mois est déjà ${monthGroup.status}. Seuls les mois en brouillon ou mélangés peuvent être finalisés.`,
          "warning"
        );
        return;
      }
      // Appel de la prop onFinalizeMonth du parent
      await onFinalizeMonth(currentUserId, monthGroup.year, monthGroup.month);
    },
    [onFinalizeMonth, currentUserId, showMessage]
  );

  const handleValidateMonth = useCallback(
    async (monthGroup) => {
      console.log(
        "handleValidateMonth appelé pour:",
        monthGroup.monthYearDisplay,
        "Statut actuel:",
        monthGroup.status
      );
      if (
        monthGroup.status !== "finalized" &&
        monthGroup.status !== "rejected"
      ) {
        showMessage(
          `Le mois doit être 'finalisé' ou 'rejeté' pour être validé.`,
          "warning"
        );
        return;
      }
      // Appel de la fonction centralisée
      await onUpdateCraStatus(
        currentUserId,
        monthGroup.year,
        monthGroup.month,
        "validated",
        null
      );
    },
    [onUpdateCraStatus, currentUserId, showMessage]
  );

  const handleRejectClick = useCallback((monthGroup) => {
    console.log("handleRejectClick appelé pour:", monthGroup.monthYearDisplay);
    setMonthToReject(monthGroup);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  }, []);

  const confirmReject = useCallback(async () => {
    console.log(
      "confirmReject appelé pour:",
      monthToReject.monthYearDisplay,
      "Raison:",
      rejectionReason
    );
    if (!rejectionReason.trim()) {
      showMessage("La raison du rejet ne peut pas être vide.", "error");
      return;
    }
    // Appel de la fonction centralisée
    await onUpdateCraStatus(
      currentUserId,
      monthToReject.year,
      monthToReject.month,
      "rejected",
      rejectionReason
    );
    setIsRejectModalOpen(false);
    setMonthToReject(null);
    setRejectionReason("");
  }, [
    monthToReject,
    rejectionReason,
    onUpdateCraStatus,
    currentUserId,
    showMessage,
  ]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Historique des CRAs envoyés
      </h2>

      {groupedActivities.length === 0 ? (
        <p className="text-center text-gray-600 py-8">
          Aucun CRA envoyé pour l'instant.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mois
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Motif Rejet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rejeté par
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Rejet
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groupedActivities.map((group, index) => (
                <tr key={group.monthKey} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {group.monthYearDisplay}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        group.status
                      )}`}
                    >
                      {group.status === "draft"
                        ? "Brouillon"
                        : group.status === "finalized"
                        ? "Finalisé"
                        : group.status === "validated"
                        ? "Validé"
                        : group.status === "rejected"
                        ? "Rejeté"
                        : "Mélangé"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {group.rejectionReason || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {group.rejectedBy || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {group.rejectedAt
                      ? format(new Date(group.rejectedAt), "dd/MM/yyyy HH:mm", {
                          locale: fr,
                        })
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleViewDetailedReport(group)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Voir le rapport
                    </button>
                    {group.status === "draft" || group.status === "mixed" ? (
                      <button
                        onClick={() => handleFinalizeClick(group)} // Utilise handleFinalizeClick
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Finaliser
                      </button>
                    ) : null}
                    {group.status === "finalized" && (
                      <>
                        <button
                          onClick={() => handleValidateMonth(group)}
                          className="text-green-600 hover:text-green-900 mr-4"
                        >
                          Valider
                        </button>
                        <button
                          onClick={() => handleRejectClick(group)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Rejeter
                        </button>
                      </>
                    )}
                    {group.status === "validated" && (
                      <button
                        onClick={() => handleRejectClick(group)} // Permettre de rejeter un mois validé
                        className="text-red-600 hover:text-red-900 mr-4"
                      >
                        Rejeter
                      </button>
                    )}
                    {group.status === "rejected" && (
                      <button
                        onClick={() => handleValidateMonth(group)} // Permettre de re-valider un mois rejeté
                        className="text-green-600 hover:text-green-900 mr-4"
                      >
                        Re-valider
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal INLINE pour le rapport détaillé */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative p-6">
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition duration-200"
              aria-label="Fermer le rapport"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2">
              Rapport détaillé pour{" "}
              {selectedMonthForReport
                ? selectedMonthForReport.monthYearDisplay
                : ""}
            </h2>
            {selectedMonthForReport && (
              <MonthlyDetailedReport
                reportData={selectedMonthForReport.activities}
                userId={currentUserId}
                year={selectedMonthForReport.year}
                month={selectedMonthForReport.month}
                userName={currentUserName}
              />
            )}
          </div>
        </div>
      )}

      {/* Modal INLINE pour le rejet */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative p-6">
            <button
              onClick={() => setIsRejectModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition duration-200"
              aria-label="Fermer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Rejeter le CRA
            </h2>
            <div className="p-4">
              <p className="mb-4">
                Voulez-vous rejeter le CRA pour{" "}
                {monthToReject ? monthToReject.monthYearDisplay : ""} ? Veuillez
                indiquer la raison du rejet :
              </p>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-md mb-4"
                rows="4"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Activités non conformes, temps passé incorrect..."
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Confirmer le rejet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
