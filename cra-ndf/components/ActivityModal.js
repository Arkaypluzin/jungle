// components/ActivityModal.js
import React, { useState, useEffect } from "react";
import { format, isWeekend } from "date-fns";
import { fr } from "date-fns/locale";

export default function ActivityModal({
  isOpen,
  onClose,
  selectedDate,
  activityTypeDefinitions = [],
  // clientDefinitions n'est plus une prop pertinente ici pour les activités CRA
  editingActivity,
  onSave,
  isHolidayOrWeekendSelected,
  showMessage,
}) {
  const [tempsPasse, setTempsPasse] = useState("");
  const [typeActivite, setTypeActivite] = useState("");
  const [descriptionActivite, setDescriptionActivite] = useState("");
  // const [clientId, setClientId] = useState(""); // Supprimé
  const [overrideNonWorkingDay, setOverrideNonWorkingDay] = useState(false);

  useEffect(() => {
    if (editingActivity) {
      setTempsPasse(editingActivity.temps_passe || "");
      setTypeActivite(editingActivity.type_activite || "");
      setDescriptionActivite(editingActivity.description_activite || "");
      // setClientId(editingActivity.client_id ? String(editingActivity.client_id) : ""); // Supprimé
      setOverrideNonWorkingDay(editingActivity.override_non_working_day === 1);
    } else {
      setTempsPasse("");
      setTypeActivite("");
      setDescriptionActivite("");
      // setClientId(""); // Supprimé
      setOverrideNonWorkingDay(false);
    }
  }, [editingActivity]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !selectedDate ||
      !(selectedDate instanceof Date) ||
      isNaN(selectedDate.getTime())
    ) {
      showMessage(
        "Erreur interne : La date sélectionnée est invalide. Veuillez réessayer.",
        "error"
      );
      console.error(
        "ActivityModal: selectedDate invalide au moment de la soumission",
        selectedDate
      );
      return;
    }

    if (!tempsPasse || !typeActivite) {
      showMessage(
        "Veuillez remplir le temps passé et le type d'activité.",
        "error"
      );
      return;
    }

    if (parseFloat(tempsPasse) <= 0 || parseFloat(tempsPasse) > 1) {
      showMessage("Le temps passé doit être entre 0.1 et 1 jour.", "error");
      return;
    }

    const activityTypeText = activityTypeDefinitions.find(
      (def) => def.name === typeActivite
    )?.name;
    const isAbsence = activityTypeText?.includes("Absence");

    const isSelectedDateWeekend =
      selectedDate && isWeekend(selectedDate, { weekStartsOn: 1 });

    if (isHolidayOrWeekendSelected && !isAbsence && !overrideNonWorkingDay) {
      showMessage(
        "Vous essayez d'ajouter une activité un jour non ouvrable (week-end ou jour férié). Cochez 'Dérogation' ou sélectionnez un type d'activité 'Absence'.",
        "warning"
      );
      return;
    }

    if (parseFloat(tempsPasse) % 0.1 !== 0) {
      showMessage(
        "Le temps passé doit être un multiple de 0.1 (ex: 0.5, 0.8, 1.0).",
        "error"
      );
      return;
    }

    const activityData = {
      date: format(selectedDate, "yyyy-MM-dd"),
      tempsPasse: parseFloat(tempsPasse),
      typeActivite,
      descriptionActivite,
      // clientId est supprimé de activityData
      overrideNonWorkingDay,
    };

    onSave(
      editingActivity ? { ...editingActivity, ...activityData } : activityData
    );
    onClose();
  };

  const activityTypeText = activityTypeDefinitions.find(
    (def) => def.name === typeActivite
  )?.name;
  const isAbsence = activityTypeText?.includes("Absence");

  const isWeekendDay =
    selectedDate && isWeekend(selectedDate, { weekStartsOn: 1 });
  const isHoliday = isHolidayOrWeekendSelected && !isWeekendDay;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
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
        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">
          {editingActivity ? "Modifier l'activité" : "Ajouter une activité"}{" "}
          pour le{" "}
          {selectedDate instanceof Date && !isNaN(selectedDate.getTime())
            ? format(selectedDate, "dd MMMM 'yyyy'", { locale: fr })
            : "date inconnue ou invalide"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="tempsPasse"
              className="block text-sm font-medium text-gray-700"
            >
              Temps passé (en jours, ex: 0.5, 1)
            </label>
            <input
              type="number"
              id="tempsPasse"
              step="0.1"
              min="0.1"
              max="1"
              value={tempsPasse}
              onChange={(e) => setTempsPasse(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="typeActivite"
              className="block text-sm font-medium text-gray-700"
            >
              Type d'activité
            </label>
            <select
              id="typeActivite"
              value={typeActivite}
              onChange={(e) => setTypeActivite(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Sélectionner un type</option>
              {activityTypeDefinitions.map((typeDef) => (
                <option key={typeDef.id} value={typeDef.name}>
                  {typeDef.name}
                </option>
              ))}
            </select>
          </div>

          {/* Le champ client est supprimé car client_id n'existe plus dans cra_activities */}
          {/* <div>
            <label
              htmlFor="clientId"
              className="block text-sm font-medium text-gray-700"
            >
              Client (facultatif)
            </label>
            <select
              id="clientId"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sélectionner un client</option>
              {clientDefinitions.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nom_client}
                </option>
              ))}
            </select>
          </div> */}

          <div>
            <label
              htmlFor="descriptionActivite"
              className="block text-sm font-medium text-gray-700"
            >
              Description (facultatif)
            </label>
            <textarea
              id="descriptionActivite"
              value={descriptionActivite}
              onChange={(e) => setDescriptionActivite(e.target.value)}
              rows="3"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            ></textarea>
          </div>

          {isHolidayOrWeekendSelected && !isAbsence && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="overrideNonWorkingDay"
                checked={overrideNonWorkingDay}
                onChange={(e) => setOverrideNonWorkingDay(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="overrideNonWorkingDay"
                className="ml-2 block text-sm font-medium text-gray-700"
              >
                Dérogation (jour{" "}
                {isWeekendDay && isHoliday
                  ? "férié et week-end"
                  : isWeekendDay
                  ? "de week-end"
                  : "férié"}
                )
              </label>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-200"
            >
              {editingActivity ? "Modifier" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
