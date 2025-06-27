// components/ActivityModal.js
import React, { useState, useEffect } from "react";
import { format, isWeekend } from "date-fns";
import { fr } from "date-fns/locale";

export default function ActivityModal({
  isOpen,
  onClose,
  selectedDate,
  activityTypeDefinitions = [],
  clientDefinitions = [],
  editingActivity,
  onSave,
  isHolidayOrWeekendSelected,
  showMessage,
}) {
  const [tempsPasse, setTempsPasse] = useState("");
  const [typeActivite, setTypeActivite] = useState("");
  const [descriptionActivite, setDescriptionActivite] = useState("");
  const [clientId, setClientId] = useState("");
  const [overrideNonWorkingDay, setOverrideNonWorkingDay] = useState(false);
  const [isBillable, setIsBillable] = useState(true); // Réintroduit l'état local pour isBillable

  // Effet pour initialiser les champs du formulaire
  useEffect(() => {
    if (editingActivity) {
      setTempsPasse(editingActivity.temps_passe || "");
      setTypeActivite(editingActivity.type_activite || "");
      setDescriptionActivite(editingActivity.description_activite || "");
      setClientId(
        editingActivity.client_id ? String(editingActivity.client_id) : ""
      );
      setOverrideNonWorkingDay(editingActivity.override_non_working_day === 1);
      setIsBillable(editingActivity.is_billable === 1); // Charger la valeur existante de l'activité
    } else {
      setTempsPasse("");
      setTypeActivite("");
      setDescriptionActivite("");
      setClientId("");
      setOverrideNonWorkingDay(false);
      setIsBillable(true); // Valeur par défaut pour une nouvelle activité (sera ajustée par le type)
    }
  }, [editingActivity]);

  // Effet pour mettre à jour isBillable lorsque le type d'activité change
  useEffect(() => {
    const selectedTypeDef = activityTypeDefinitions.find(
      (def) => def.name === typeActivite
    );
    if (selectedTypeDef) {
      setIsBillable(selectedTypeDef.is_billable === 1);
    } else if (typeActivite === "Heure supplémentaire") {
      // Cas spécial pour "Heure supplémentaire" si non défini dans activityTypeDefinitions
      setIsBillable(true); // Supposons que les heures supplémentaires sont facturables par défaut
    } else {
      setIsBillable(true); // Par défaut facturable si le type n'est pas trouvé
    }
  }, [typeActivite, activityTypeDefinitions]);

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

    const parsedTempsPasse = parseFloat(tempsPasse);

    // Ensure individual activity time is within bounds
    if (parsedTempsPasse <= 0 || parsedTempsPasse > 1) {
      showMessage("Le temps passé doit être entre 0.1 et 1 jour.", "error");
      return;
    }

    // Validate against specific allowed values
    const allowedValues = [0.25, 0.5, 0.75, 1.0];
    // Check if the parsedTempsPasse is in the allowedValues, considering potential floating point inaccuracies by rounding
    if (
      !allowedValues.some((val) => Math.abs(val - parsedTempsPasse) < 0.001)
    ) {
      showMessage("Le temps passé doit être 0.25, 0.5, 0.75 ou 1.", "error");
      return;
    }

    const activityTypeDefinition = activityTypeDefinitions.find(
      (def) => def.name === typeActivite
    );
    const isAbsence = activityTypeDefinition?.name?.includes("Absence");
    const isHeureSupp = typeActivite === "Heure supplémentaire"; // Check for "Heure supplémentaire"
    // isBillable est maintenant un état local, déjà mis à jour par l'effet ci-dessus

    const isSelectedDateWeekend =
      selectedDate && isWeekend(selectedDate, { weekStartsOn: 1 });

    // Rule for non-working days, apply only if not an Absence AND not an "Heure supplémentaire"
    if (
      isHolidayOrWeekendSelected &&
      !isAbsence &&
      !isHeureSupp &&
      !overrideNonWorkingDay
    ) {
      showMessage(
        "Vous essayez d'ajouter une activité un jour non ouvrable (week-end ou jour férié). Cochez 'Dérogation' ou sélectionnez un type d'activité 'Absence' ou 'Heure supplémentaire'.",
        "warning"
      );
      return;
    }

    const activityData = {
      date: format(selectedDate, "yyyy-MM-dd"),
      tempsPasse: parsedTempsPasse, // Use the parsed float value
      typeActivite,
      descriptionActivite,
      // Client ID is null for Absence and Heure supplémentaire
      clientId:
        isAbsence || isHeureSupp
          ? null
          : clientId === ""
          ? null
          : parseInt(clientId),
      overrideNonWorkingDay,
      isBillable: isBillable, // Utiliser la valeur de l'état local isBillable
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
  const isHeureSupp = typeActivite === "Heure supplémentaire";

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
            ? format(selectedDate, "dd MMMM", { locale: fr })
            : "date inconnue ou invalide"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="tempsPasse"
              className="block text-sm font-medium text-gray-700"
            >
              Temps passé (en jours, ex: 0.25, 0.5, 0.75, 1)
            </label>
            <input
              type="number"
              id="tempsPasse"
              step="0.25" // Adjust step for 0.25 increments
              min="0.25"
              max="1"
              value={tempsPasse}
              onChange={(e) => setTempsPasse(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              required
              list="tempsPasseOptions" // Add datalist attribute
            />
            <datalist id="tempsPasseOptions">
              <option value="0.25" />
              <option value="0.50" />
              <option value="0.75" />
              <option value="1.00" />
            </datalist>
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
              <option value="Heure supplémentaire">Heure supplémentaire</option>{" "}
              {/* Added new option */}
            </select>
          </div>

          {!isAbsence &&
            !isHeureSupp && ( // Client field hidden for Absence and Heure supplémentaire
              <div>
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
              </div>
            )}

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

          {/* Champ pour définir si l'activité est facturable (désactivé) */}
          <div>
            <label
              htmlFor="isBillable"
              className="block text-sm font-medium text-gray-700 flex items-center"
            >
              <input
                type="checkbox"
                id="isBillable"
                checked={isBillable}
                disabled // Rendre la case à cocher désactivée
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              Activité facturable (dépend du type d'activité)
            </label>
          </div>

          {isHolidayOrWeekendSelected &&
            !isAbsence &&
            !isHeureSupp && ( // Override checkbox hidden for Absence and Heure supplémentaire
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
