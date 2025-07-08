// components/SummaryReport.js
"use client";

import React, { useCallback } from "react"; // Ajout de useCallback pour la fonction helper
import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";

export default function SummaryReport({
  activities = [],
  activityTypeDefinitions = [],
  clientDefinitions = [],
  currentMonth, // Reçoit un objet Date
  totalWorkingDaysInMonth,
  totalActivitiesTimeInMonth,
  timeDifference,
  onClose, // La fonction pour fermer le rapport
}) {
  // Vérifier si currentMonth est une date valide avant de l'utiliser
  const displayMonth = isValid(currentMonth)
    ? format(currentMonth, "MMMM YYYY", { locale: fr }) // Format complet avec l'année
    : "Mois inconnu";

  // Fonction helper pour obtenir le nom d'affichage du type d'activité
  const getActivityTypeDisplayName = useCallback(
    (activityItem) => {
      // Priorité 1: Utiliser le nom populé directement du backend (si le lookup fonctionne)
      if (activityItem.activityTypeName) {
        return activityItem.activityTypeName;
      }
      // Priorité 2: Rechercher dans les définitions par ID (fallback)
      const definition = activityTypeDefinitions.find(
        (t) => String(t.id) === String(activityItem.type_activite)
      );
      return definition ? definition.name : "Activité inconnue";
    },
    [activityTypeDefinitions]
  );

  // Fonction helper pour obtenir le nom d'affichage du client
  const getClientDisplayName = useCallback(
    (activityItem) => {
      // Priorité 1: Utiliser le nom populé directement du backend (si le lookup fonctionne)
      if (activityItem.clientName) {
        return activityItem.clientName;
      }
      // Priorité 2: Rechercher dans les définitions par ID (fallback)
      const definition = clientDefinitions.find(
        (c) => String(c.id) === String(activityItem.client_id)
      );
      return definition ? definition.nom_client : "Non attribué";
    },
    [clientDefinitions]
  );

  // Trier les activités par date
  const sortedActivities = [...activities].sort((a, b) => {
    const dateA = isValid(parseISO(a.date_activite))
      ? parseISO(a.date_activite)
      : new Date(0);
    const dateB = isValid(parseISO(b.date_activite))
      ? parseISO(b.date_activite)
      : new Date(0);
    return dateA.getTime() - dateB.getTime();
  });

  // Fonction pour gérer le clic sur le bouton de fermeture
  const handleCloseClick = useCallback(() => {
    console.log(
      "SummaryReport: Le bouton 'Fermer' a été cliqué. Appel de la prop onClose."
    );
    onClose(); // Appelle la fonction onClose passée par le composant parent
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={handleCloseClick} // Le bouton Fermer appellera la fonction interne handleCloseClick
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
          aria-label="Fermer le rapport"
        >
          &times;
        </button>
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Rapport d'activités pour {displayMonth}
        </h2>

        {/* Section Résumé */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6 shadow-sm">
          <h3 className="text-xl font-semibold text-blue-800 mb-3">
            Résumé du mois
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-700">
            <p>
              Jours ouvrés:{" "}
              <span className="font-bold">
                {/* Vérification de sécurité pour totalWorkingDaysInMonth */}
                {typeof totalWorkingDaysInMonth === "number" &&
                !isNaN(totalWorkingDaysInMonth)
                  ? totalWorkingDaysInMonth
                  : "0"}
              </span>
            </p>
            <p>
              Temps déclaré:{" "}
              <span className="font-bold">
                {/* Vérification de sécurité pour totalActivitiesTimeInMonth */}
                {typeof totalActivitiesTimeInMonth === "number" &&
                !isNaN(totalActivitiesTimeInMonth)
                  ? totalActivitiesTimeInMonth.toFixed(2)
                  : "0.00"}{" "}
                j
              </span>
            </p>
            <p>
              Écart:{" "}
              <span
                className={`font-bold ${
                  // timeDifference est déjà une chaîne formatée par toFixed(2), donc parseFloat est sûr ici
                  parseFloat(timeDifference || "0") < 0
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {/* timeDifference est déjà formaté, pas besoin de toFixed ici */}
                {timeDifference || "0.00"} j
              </span>
            </p>
          </div>
        </div>

        {/* Section Détail des Activités */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">
            Détail des activités
          </h3>
          {sortedActivities.length === 0 ? (
            <p className="text-gray-600 italic">
              Aucune activité déclarée pour ce mois.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">
                      Date
                    </th>
                    <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">
                      Type d'activité
                    </th>
                    <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">
                      Client
                    </th>
                    <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">
                      Temps (j)
                    </th>
                    <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">
                      Description
                    </th>
                    <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedActivities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {isValid(parseISO(activity.date_activite))
                          ? format(
                              parseISO(activity.date_activite),
                              "dd/MM/yyyy"
                            )
                          : "Date invalide"}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {getActivityTypeDisplayName(activity)}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {getClientDisplayName(activity)}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {/* Assurez-vous que temps_passe est un nombre avant toFixed */}
                        {typeof activity.temps_passe === "number" &&
                        !isNaN(activity.temps_passe)
                          ? activity.temps_passe.toFixed(1)
                          : "0.0"}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {activity.description_activite || "-"}
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">
                        {activity.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <button
            onClick={handleCloseClick} // Le bouton Fermer appellera la fonction interne handleCloseClick
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
