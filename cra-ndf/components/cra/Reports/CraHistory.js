"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { format, parseISO, isValid as isValidDateFns } from "date-fns";
import { fr } from "date-fns/locale";
import CraBoard from "@/components/cra/Board/CraBoard";

export default function CraHistory({
  userFirstName,
  showMessage,
  clientDefinitions,
  activityTypeDefinitions,
}) {
  const { data: session, status } = useSession();
  // Forcer à utiliser uniquement l’ID de la session (utilisateur connecté)
  const currentUserId = session?.user?.id;
  const currentUserName = userFirstName || session?.user?.name?.split(" ")[0] || "Utilisateur";

  const [monthlyReports, setMonthlyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCraBoardModal, setShowCraBoardModal] = useState(false);
  const [craBoardReportData, setCraBoardReportData] = useState(null);

  const fetchSentMonthlyReports = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({ userId: currentUserId });
      const response = await fetch(
        `/api/monthly_cra_reports?${queryParams.toString()}`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            "Échec de la récupération de l'historique des rapports."
        );
      }
      const data = await response.json();
      console.log("CraHistory: Rapports mensuels envoyés récupérés:", data);

      if (data && Array.isArray(data.data)) {
        setMonthlyReports(data.data);
      } else {
        console.warn(
          "CraHistory: La réponse API ne contient pas un tableau valide dans 'data.data'. Réponse:",
          data
        );
        setMonthlyReports([]);
      }
    } catch (err) {
      console.error(
        "CraHistory: Erreur lors de la récupération de l'historique des rapports:",
        err
      );
      setError(err.message);
      showMessage(
        `Erreur lors du chargement de l'historique: ${err.message}`,
        "error"
      );
      setMonthlyReports([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, showMessage]);

  useEffect(() => {
    if (status === "authenticated" && currentUserId) {
      fetchSentMonthlyReports();
    }
  }, [status, currentUserId, fetchSentMonthlyReports]);

  const handleViewDetails = useCallback(
    async (report) => {
      console.log("[CraHistory] handleViewDetails appelé avec le rapport:", report);
      try {
        const response = await fetch(`/api/monthly_cra_reports/${report.id}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Échec de la récupération du CRA détaillé."
          );
        }
        const detailedReport = await response.json();

        console.log("[CraHistory] detailedReport reçu:", detailedReport);

        if (!detailedReport) {
          console.error("[CraHistory] detailedReport est nul ou indéfini.");
          showMessage("Erreur: Rapport détaillé non trouvé.", "error");
          return;
        }

        const reportYear = parseInt(detailedReport.year);
        const reportMonth = parseInt(detailedReport.month);

        let craBoardCurrentMonth;
        if (
          !isNaN(reportYear) &&
          !isNaN(reportMonth) &&
          reportMonth >= 1 &&
          reportMonth <= 12
        ) {
          craBoardCurrentMonth = new Date(reportYear, reportMonth - 1, 1);
        } else {
          console.warn(
            `[CraHistory] Année (${detailedReport.year}) ou mois (${detailedReport.month}) invalide(s) trouvé(s) dans le rapport détaillé. Utilisation de la date actuelle par défaut.`
          );
          craBoardCurrentMonth = new Date();
        }

        // Gestion des activités : si activities_snapshot contient uniquement des IDs, on fetch les détails
        let activitiesToPass = [];
        if (
          detailedReport.activities_snapshot &&
          Array.isArray(detailedReport.activities_snapshot)
        ) {
          // Check si le premier élément est une string (id) ou un objet
          const firstElem = detailedReport.activities_snapshot[0];
          if (typeof firstElem === "string" || typeof firstElem === "number") {
            // Ce sont des IDs, on récupère chaque activité en détail
            try {
              const activitiesDetails = await Promise.all(
                detailedReport.activities_snapshot.map(async (activityId) => {
                  const res = await fetch(`/api/activities/${activityId}`);
                  if (!res.ok) {
                    console.warn(`Erreur chargement activité ${activityId}`);
                    return null;
                  }
                  return res.json();
                })
              );
              // Filtrer les activités nulles (en cas d'erreur fetch)
              activitiesToPass = activitiesDetails.filter((a) => a !== null);
            } catch (err) {
              console.error("Erreur lors du fetch des activités détaillées:", err);
              showMessage("Erreur lors du chargement des activités détaillées.", "error");
            }
          } else {
            // On a déjà les objets activités complets
            activitiesToPass = detailedReport.activities_snapshot;
          }
        }

        // Formattage robuste des activités
        const formattedActivities = activitiesToPass
          .map((activity) => {
            let dateObj = null;
            if (typeof activity.date_activite === "string") {
              dateObj = parseISO(activity.date_activite);
            } else if (activity.date_activite) {
              dateObj = new Date(activity.date_activite);
            }
            return {
              ...activity,
              date_activite: isValidDateFns(dateObj) ? dateObj : null,
              client_id: String(activity.client_id),
              type_activite: String(activity.type_activite),
              id: activity.id || activity._id?.toString(),
            };
          })
          .filter(
            (activity) =>
              activity.date_activite !== null &&
              isValidDateFns(activity.date_activite)
          );

        setCraBoardReportData({
          userId: detailedReport.user_id,
          userFirstName: detailedReport.userName,
          currentMonth: craBoardCurrentMonth,
          activities: formattedActivities,
          rejectionReason:
            detailedReport.status === "rejected"
              ? detailedReport.rejectionReason
              : null,
          monthlyReports: monthlyReports,
          reportStatus: detailedReport.status,
        });
        setShowCraBoardModal(true);
      } catch (err) {
        console.error("CraHistory: Erreur lors de la récupération du CRA détaillé:", err);
        showMessage(`Erreur: ${err.message}`, "error");
      }
    },
    [showMessage, monthlyReports]
  );

  const handleCloseCraBoardModal = useCallback(() => {
    setShowCraBoardModal(false);
    setCraBoardReportData(null);
  }, []);

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center h-64 text-xl text-gray-700">
        Chargement de l'historique...
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="text-red-500 text-center py-8 text-lg">
        Vous devez être connecté pour voir votre historique.
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-8 text-lg">
        Erreur: {error}
      </div>
    );
  }

  // Filtrer les rapports pour ne garder que ceux de l'utilisateur connecté (sécurité supplémentaire)
  const filteredReports = monthlyReports.filter(
    (report) => report.user_id === currentUserId
  );

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 w-full mt-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Historique de mes rapports envoyés
      </h2>

      {filteredReports.length === 0 ? (
        <div className="text-gray-600 text-center py-8 text-lg">
          Aucun rapport envoyé trouvé.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Mois
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Année
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Statut
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Envoyé le
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Révisé le
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr
                  key={report.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 text-sm text-gray-800">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        report.report_type === "paid_leave"
                          ? "bg-teal-100 text-teal-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {report.report_type === "paid_leave"
                        ? "Congés Payés"
                        : "CRA"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-800">
                    {format(new Date(report.year, report.month - 1), "MMMM", {
                      locale: fr,
                    })}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-800">{report.year}</td>
                  <td className="py-3 px-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        report.status === "pending_review"
                          ? "bg-blue-100 text-blue-800"
                          : report.status === "validated"
                          ? "bg-green-100 text-green-800"
                          : report.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {report.status === "pending_review"
                        ? "En attente"
                        : report.status === "validated"
                        ? "Validé"
                        : "Rejeté"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-800">
                    {report.submittedAt
                      ? format(parseISO(report.submittedAt), "dd/MM/yyyy HH:mm", {
                          locale: fr,
                        })
                      : "N/A"}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-800">
                    {report.reviewedAt
                      ? format(parseISO(report.reviewedAt), "dd/MM/yyyy HH:mm", {
                          locale: fr,
                        })
                      : "N/A"}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <button
                      onClick={() => handleViewDetails(report)}
                      className="px-3 py-1 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition duration-200 text-xs"
                    >
                      Voir les détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCraBoardModal && craBoardReportData && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800">
                Détails du rapport pour {craBoardReportData.userFirstName} -{" "}
                {format(craBoardReportData.currentMonth, "MMMM yyyy", {
                  locale: fr,
                })}
              </h3>
              <button
                onClick={handleCloseCraBoardModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
              <CraBoard
                userId={craBoardReportData.userId}
                userFirstName={craBoardReportData.userFirstName}
                activities={craBoardReportData.activities}
                activityTypeDefinitions={activityTypeDefinitions}
                clientDefinitions={clientDefinitions}
                monthlyReports={craBoardReportData.monthlyReports}
                currentMonth={craBoardReportData.currentMonth}
                rejectionReason={craBoardReportData.rejectionReason}
                reportStatus={craBoardReportData.reportStatus}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
