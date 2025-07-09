// components/SentCraHistory.js
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format, parseISO, isValid, isSameMonth } from "date-fns";
import { fr } from "date-fns/locale";

export default function SentCraHistory({
  craActivities,
  clientDefinitions,
  activityTypeDefinitions,
  onAddCraActivity, // Probablement pas utilisé ici mais gardé pour consistance
  currentUserId,
  currentUserName,
  showMessage,
  onUpdateCraStatus, // Cette fonction est utilisée pour la finalisation/validation/rejet
}) {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false); // Nouvel état pour suivre le chargement des scripts

  // Chargement des bibliothèques html2canvas et jspdf via CDN
  useEffect(() => {
    const loadScript = (src, id, callback) => {
      if (!document.getElementById(id)) {
        const script = document.createElement("script");
        script.src = src;
        script.id = id;
        script.onload = () => {
          console.log(`${id} loaded.`);
          callback();
        };
        script.onerror = () => {
          console.error(`Failed to load script: ${src}`);
          // Gérer l'erreur de chargement si nécessaire
        };
        document.head.appendChild(script);
      } else {
        console.log(`${id} already loaded.`);
        callback(); // Already loaded, just call callback
      }
    };

    let html2canvasLoaded = false;
    let jspdfLoaded = false;

    const checkAllLoaded = () => {
      if (html2canvasLoaded && jspdfLoaded) {
        setScriptsLoaded(true);
      }
    };

    // Load html2canvas first
    loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
      "html2canvas-script-history",
      () => {
        html2canvasLoaded = true;
        checkAllLoaded();
      }
    );
    // Then load jspdf
    loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "jspdf-script-history",
      () => {
        jspdfLoaded = true;
        checkAllLoaded();
      }
    );

    return () => {
      // Cleanup is generally not needed for global CDN scripts in single-page apps like this,
      // but good practice for more complex scenarios.
    };
  }, []); // Le tableau de dépendances vide signifie que cet effet ne s'exécute qu'une fois au montage

  const activitiesByMonth = useMemo(() => {
    return craActivities.reduce((acc, activity) => {
      // S'assurer que activity.date_activite est un objet Date valide
      const activityDate =
        activity.date_activite instanceof Date &&
        isValid(activity.date_activite)
          ? activity.date_activite
          : parseISO(activity.date_activite);

      if (!isValid(activityDate)) {
        console.warn(
          "Activité avec date invalide ignorée dans SentCraHistory:",
          activity
        );
        return acc;
      }

      const monthYear = format(activityDate, "MMMM", { locale: fr });
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      acc[monthYear].push(activity);
      return acc;
    }, {});
  }, [craActivities]);

  const sortedMonths = useMemo(() => {
    return Object.keys(activitiesByMonth).sort((a, b) => {
      // Tri par mois, du plus récent au plus ancien
      // Convertir les chaînes "Mois Année" en objets Date pour le tri
      const dateA = parseISO(
        format(
          new Date(
            a.split(" ")[1],
            fr.localize.month(a.split(" ")[0], { width: "wide" }),
            1
          ),
          "yyyy-MM-dd"
        )
      );
      const dateB = parseISO(
        format(
          new Date(
            b.split(" ")[1],
            fr.localize.month(b.split(" ")[0], { width: "wide" }),
            1
          ),
          "yyyy-MM-dd"
        )
      );
      return dateB.getTime() - dateA.getTime();
    });
  }, [activitiesByMonth]);

  const getClientName = useCallback(
    (clientId) => {
      // Correction: utiliser String(c.id) pour la comparaison d'ID
      const client = clientDefinitions.find(
        (c) => String(c.id) === String(clientId)
      );
      return client ? client.nom_client : "N/A";
    },
    [clientDefinitions]
  );

  const getActivityTypeName = useCallback(
    (activityTypeId) => {
      // Renommé pour plus de clarté
      // Correction: utiliser String(t.id) pour la comparaison d'ID
      const type = activityTypeDefinitions.find(
        (t) => String(t.id) === String(activityTypeId)
      );
      return type ? type.name : activityTypeId; // Retourne l'ID brut si non trouvé
    },
    [activityTypeDefinitions]
  );

  const filteredActivities = useMemo(() => {
    return Object.entries(activitiesByMonth)
      .filter(([month]) => selectedMonth === "" || month === selectedMonth)
      .flatMap(([, activities]) => activities)
      .filter((activity) => {
        const matchesSearch =
          searchTerm === "" ||
          (activity.description_activite &&
            activity.description_activite
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (activity.client_id &&
            getClientName(activity.client_id)
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (activity.type_activite &&
            getActivityTypeName(activity.type_activite)
              .toLowerCase()
              .includes(searchTerm.toLowerCase()));

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "finalized" && activity.status === "finalized") ||
          (statusFilter === "pending_review" &&
            activity.status === "pending_review") || // Nouveau filtre
          (statusFilter === "validated" && activity.status === "validated") ||
          (statusFilter === "rejected" && activity.status === "rejected") ||
          // Le filtre 'pending' original doit maintenant exclure 'pending_review' si on veut une distinction
          (statusFilter === "pending" &&
            (activity.status === "draft" || activity.status === "mixed")); // Ou tout autre statut non finalisé/validé/rejeté/pending_review

        return matchesSearch && matchesStatus;
      });
  }, [
    activitiesByMonth,
    selectedMonth,
    searchTerm,
    statusFilter,
    getClientName,
    getActivityTypeName,
  ]);

  // Fonction pour exporter le rapport en PDF
  const handleExportPdf = useCallback(async () => {
    if (
      !scriptsLoaded ||
      typeof window.html2canvas === "undefined" ||
      typeof window.jspdf === "undefined"
    ) {
      console.error("Bibliothèques html2canvas ou jspdf non chargées.");
      showMessage(
        "Veuillez patienter, les bibliothèques d'exportation PDF sont en cours de chargement. Réessayez dans un instant.",
        "info"
      );
      return;
    }

    setIsGeneratingPdf(true);
    // Nous allons exporter le contenu principal de l'historique
    const input = document.getElementById("sent-cra-history-content");

    if (!input) {
      console.error(
        "Élément 'sent-cra-history-content' non trouvé pour l'exportation PDF."
      );
      showMessage(
        "Erreur: Impossible de trouver le contenu à exporter en PDF.",
        "error"
      );
      setIsGeneratingPdf(false);
      return;
    }

    try {
      const canvas = await window.html2canvas(input, {
        scale: 2, // Augmente la résolution pour une meilleure qualité
        useCORS: true, // Important si vous avez des images ou des polices externes
        // Ignorer les éléments qui ne sont pas nécessaires pour le PDF, comme les boutons d'action
        ignoreElements: (element) => {
          return element.classList.contains("no-pdf-export");
        },
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new window.jspdf.jsPDF({
        orientation: "p", // 'p' pour portrait, 'l' pour landscape
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // Largeur A4 en mm
      const pageHeight = 297; // Hauteur A4 en mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Historique_CRA_${format(new Date(), "yyyy_MM_dd_HHmmss")}.pdf`);
      showMessage("Rapport PDF exporté avec succès !", "success");
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      showMessage(
        `Une erreur est survenue lors de la génération du PDF: ${error.message}`,
        "error"
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [scriptsLoaded, showMessage]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Historique des CRAs envoyés
      </h2>
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="monthFilter"
            className="block text-sm font-medium text-gray-700"
          >
            Filtrer par mois:
          </label>
          <select
            id="monthFilter"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
          >
            <option value="">Tous les mois</option>
            {sortedMonths.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="statusFilter"
            className="block text-sm font-medium text-gray-700"
          >
            Filtrer par statut:
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente (Brouillon)</option>{" "}
            {/* Renommé pour plus de clarté */}
            <option value="finalized">Finalisé</option>
            <option value="pending_review">En attente de révision</option>{" "}
            {/* Nouveau statut */}
            <option value="validated">Validé</option>
            <option value="rejected">Rejeté</option>
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="search"
            className="block text-sm font-medium text-gray-700"
          >
            Rechercher:
          </label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par description, client, type..."
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleExportPdf}
            className="px-6 py-2 bg-red-600 text-white font-semibold rounded-md shadow-sm hover:bg-red-700 transition duration-300 flex items-center justify-center"
            disabled={
              isGeneratingPdf ||
              !scriptsLoaded ||
              filteredActivities.length === 0
            }
          >
            {isGeneratingPdf ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Génération...
              </>
            ) : (
              "Exporter en PDF"
            )}
          </button>
        </div>
      </div>
      <div id="sent-cra-history-content">
        {" "}
        {/* Conteneur pour l'exportation PDF */}
        {filteredActivities.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            Aucune activité trouvée pour les critères sélectionnés.
          </p>
        ) : (
          <div className="space-y-6">
            {sortedMonths.map((monthYear) => {
              const activitiesInMonth = activitiesByMonth[monthYear].filter(
                (activity) => {
                  const matchesSearch =
                    searchTerm === "" ||
                    (activity.description_activite &&
                      activity.description_activite
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())) ||
                    (activity.client_id &&
                      getClientName(activity.client_id)
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())) ||
                    (activity.type_activite &&
                      getActivityTypeName(activity.type_activite)
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()));

                  const matchesStatus =
                    statusFilter === "all" ||
                    (statusFilter === "finalized" &&
                      activity.status === "finalized") ||
                    (statusFilter === "pending_review" &&
                      activity.status === "pending_review") ||
                    (statusFilter === "validated" &&
                      activity.status === "validated") ||
                    (statusFilter === "rejected" &&
                      activity.status === "rejected") ||
                    (statusFilter === "pending" && // Pour le statut "En attente (Brouillon)"
                      activity.status !== "finalized" &&
                      activity.status !== "validated" &&
                      activity.status !== "rejected" &&
                      activity.status !== "pending_review");

                  return matchesSearch && matchesStatus;
                }
              );

              if (activitiesInMonth.length === 0) {
                return null; // Ne pas afficher le mois s'il n'y a pas d'activités filtrées
              }

              return (
                <div
                  key={monthYear}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    {monthYear}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Client
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Temps Passé (j)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Statut
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider no-pdf-export">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {activitiesInMonth.map((activity) => (
                          <tr key={activity.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {isValid(parseISO(activity.date_activite))
                                ? format(
                                    parseISO(activity.date_activite),
                                    "dd/MM/yyyy"
                                  )
                                : "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {getClientName(activity.client_id) ||
                                activity.client_name ||
                                "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {getActivityTypeName(activity.type_activite)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {activity.temps_passe}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {activity.description_activite}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  activity.status === "finalized"
                                    ? "bg-green-100 text-green-800"
                                    : activity.status === "validated"
                                    ? "bg-blue-100 text-blue-800"
                                    : activity.status === "rejected"
                                    ? "bg-red-100 text-red-800"
                                    : activity.status === "pending_review" // Nouveau statut
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-yellow-100 text-yellow-800" // Default for 'draft' or 'pending'
                                }`}
                              >
                                {activity.status === "pending_review"
                                  ? "En attente de révision"
                                  : activity.status || "En attente"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium no-pdf-export">
                              {/* Les actions sont désormais conditionnelles au statut */}
                              {activity.status === "pending_review" && (
                                <span className="text-gray-500 italic">
                                  En attente de validation
                                </span>
                              )}
                              {activity.status === "finalized" && (
                                <button
                                  onClick={
                                    () =>
                                      onUpdateCraStatus(
                                        activity.id,
                                        "pending_review"
                                      ) // Permet de renvoyer si besoin, ou de changer d'avis avant validation
                                  }
                                  className="text-indigo-600 hover:text-indigo-900 mr-2"
                                >
                                  Renvoyer
                                </button>
                              )}
                              {activity.status === "draft" && (
                                <>
                                  <button
                                    onClick={() =>
                                      showMessage(
                                        "Fonctionnalité d'édition à implémenter",
                                        "info"
                                      )
                                    }
                                    className="text-blue-600 hover:text-blue-900 mr-2"
                                  >
                                    Éditer
                                  </button>
                                  <button
                                    onClick={() =>
                                      showMessage(
                                        "Fonctionnalité de suppression à implémenter",
                                        "info"
                                      )
                                    }
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Supprimer
                                  </button>
                                </>
                              )}
                              {/* Si le statut est validé ou rejeté, aucune action n'est généralement disponible pour l'utilisateur ici */}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>{" "}
      {/* Fin de #sent-cra-history-content */}
    </div>
  );
}
