"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format, isValid } from "date-fns";

export default function ActivityForm({ // Renommé de ActivityModal à ActivityForm
  onClose, // Ce onClose sera appelé pour masquer le formulaire dans CraBoard
  onSave,
  onDelete,
  activity,
  initialDate,
  activityTypeDefinitions = [],
  clientDefinitions = [],
  showMessage,
  readOnly = false,
  selectedDaysForMultiAdd = [], // Jours sélectionnés pour l'ajout multiple
  isNonWorkingDay = () => false, // Fonction pour vérifier si un jour est non ouvré
  activitiesByDay, // Reçoit la map des activités par jour
  initialActivityTypeFilter = 'activity', // 'activity' ou 'absence', par défaut 'activity'
  absenceActivityTypeIds = new Set(), // Set des IDs des types d'activité considérés comme des absences
}) {
  console.log(
    "[ActivityForm] Composant ActivityForm rendu. Activity ID:",
    activity?.id || "N/A",
    "Initial Date:",
    initialDate ? format(initialDate, "yyyy-MM-dd") : "N/A",
    "Selected Days for Multi-Add:",
    selectedDaysForMultiAdd.length,
    "Initial Filter (prop):",
    initialActivityTypeFilter
  );

  const isMultiDayAdd = selectedDaysForMultiAdd.length > 1;

  const [formData, setFormData] = useState({
    name: "",
    date_activite: initialDate || new Date(),
    temps_passe: "",
    description_activite: "",
    type_activite: "",
    client_id: "",
    override_non_working_day: false,
    status: "draft",
  });
  const [formErrors, setFormErrors] = useState({});

  const isEditing = useMemo(() => !!activity, [activity]);

  const isActivityLocked = useMemo(() => {
    if (!isEditing || !activity) return false;
    return (
      activity.status === "finalized" ||
      activity.status === "validated" ||
      activity.status === "pending_review"
    );
  }, [isEditing, activity]);

  // Calcul du temps disponible pour le jour/les jours
  const availableTimeForDay = useMemo(() => {
    if (isMultiDayAdd) {
      return 1;
    }

    const targetDate =
      initialDate || (activity ? new Date(activity.date_activite) : null);
    if (!targetDate || !isValid(targetDate)) return 1;

    const dateKey = format(targetDate, "yyyy-MM-dd");
    const activitiesOnTargetDay = activitiesByDay.get(dateKey) || [];

    let totalTimeOnDay = 0;
    if (isEditing) {
      totalTimeOnDay = activitiesOnTargetDay
        .filter((act) => String(act.id) !== String(activity.id))
        .reduce((sum, act) => sum + (parseFloat(act.temps_passe) || 0), 0);
    } else {
      totalTimeOnDay = activitiesOnTargetDay.reduce(
        (sum, act) => sum + (parseFloat(act.temps_passe) || 0),
        0
      );
    }

    const remainingTime = 1 - totalTimeOnDay;
    return Math.max(0, remainingTime);
  }, [initialDate, activity, isEditing, activitiesByDay, isMultiDayAdd]);

  // Filtrer les types d'activité en fonction du filtre initial (ou de l'activité éditée)
  const filteredActivityTypeDefinitions = useMemo(() => {
    let effectiveFilterMode = initialActivityTypeFilter;

    if (!effectiveFilterMode && isEditing && activity) {
        effectiveFilterMode = absenceActivityTypeIds.has(String(activity.type_activite)) ? 'absence' : 'activity';
    } else if (!effectiveFilterMode) {
        effectiveFilterMode = 'activity'; // Default to 'activity' mode if no explicit filter and not editing
    }

    if (effectiveFilterMode === 'absence') {
      return activityTypeDefinitions.filter(type => absenceActivityTypeIds.has(String(type.id)));
    } else { // effectiveFilterMode === 'activity'
      return activityTypeDefinitions.filter(type => !absenceActivityTypeIds.has(String(type.id)));
    }
  }, [activityTypeDefinitions, absenceActivityTypeIds, initialActivityTypeFilter, isEditing, activity]);


  useEffect(() => {
    // Réinitialise le formulaire quand la date initiale ou l'activité change
    if (activity) {
      setFormData({
        name: activity.name || "",
        date_activite: activity.date_activite || new Date(),
        temps_passe: activity.temps_passe || "",
        description_activite: activity.description_activite || "",
        type_activite: activity.type_activite || "",
        client_id: activity.client_id || "",
        override_non_working_day: activity.override_non_working_day || false,
        status: activity.status || "draft",
      });
    } else {
      // Pour une nouvelle activité, initialise avec la date sélectionnée et des valeurs par défaut
      // Tente de pré-sélectionner le premier type d'activité filtré correspondant au mode
      const defaultTypeId = filteredActivityTypeDefinitions.length > 0
        ? filteredActivityTypeDefinitions[0].id
        : '';

      setFormData((prev) => ({
        ...prev,
        date_activite: initialDate || new Date(),
        name: "", // Réinitialise le nom
        temps_passe: isMultiDayAdd ? 1 : availableTimeForDay === 0 ? 0 : 1, // 1 par défaut pour multi-add, ou 1 si dispo, sinon 0
        description_activite: "",
        type_activite: defaultTypeId, // Définit le type filtré par défaut
        client_id: "",
        override_non_working_day: false,
        status: "draft",
      }));
    }
    setFormErrors({}); // Toujours effacer les erreurs lors du changement d'activité/date
  }, [activity, initialDate, isMultiDayAdd, availableTimeForDay, filteredActivityTypeDefinitions, isEditing]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  const handleDateChange = useCallback((e) => {
    const date = new Date(e.target.value);
    setFormData((prev) => ({
      ...prev,
      date_activite: isValid(date) ? date : null,
    }));
  }, []);

  const validateForm = useCallback(() => {
    const errors = {};
    const currentActivityDate = isValid(formData.date_activite)
      ? new Date(formData.date_activite)
      : null;

    // La date est requise seulement si ce n'est PAS une multi-sélection
    if (!currentActivityDate && selectedDaysForMultiAdd.length === 0) {
      errors.date_activite = "La date d'activité est requise.";
    }
    if (!formData.temps_passe || parseFloat(formData.temps_passe) <= 0) {
      errors.temps_passe = "Le temps passé doit être supérieur à 0.";
    }

    // Validation de temps_passe par rapport à availableTimeForDay
    const parsedTempsPasse = parseFloat(formData.temps_passe);
    if (!isMultiDayAdd && parsedTempsPasse > availableTimeForDay) {
      errors.temps_passe = `Le temps passé ne peut pas dépasser ${availableTimeForDay.toFixed(
        1
      )}j pour ce jour.`;
    }
    if (!formData.type_activite) {
      errors.type_activite = "Le type d'activité est requis.";
    }

    // Utilise absenceActivityTypeIds pour vérifier si c'est une absence
    const isAbsence = absenceActivityTypeIds.has(String(formData.type_activite));

    // Le client est requis si ce n'est PAS un type d'activité d'absence
    if (!isAbsence && !formData.client_id) {
      errors.client_id = "Le client est requis pour ce type d'activité.";
    }

    // Validation spécifique pour les jours non ouvrés si ce n'est pas une absence
    // Cette validation s'applique si c'est un ajout/édition sur un seul jour
    if (
      selectedDaysForMultiAdd.length === 0 &&
      currentActivityDate &&
      isNonWorkingDay(currentActivityDate) &&
      !isAbsence && // Vérifie si ce n'est PAS une absence
      !formData.override_non_working_day
    ) {
      errors.date_activite =
        (errors.date_activite || "") +
        " Impossible d'ajouter une activité normale un week-end ou jour férié sans dérogation.";
    }
    // Pour la multi-sélection, la validation des jours non ouvrés est gérée en amont (dans CraBoard)
    // lors de la détermination de `tempSelectedDays`.

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [
    formData,
    absenceActivityTypeIds, // Utilise le nouveau Set
    isNonWorkingDay,
    selectedDaysForMultiAdd,
    isMultiDayAdd,
    availableTimeForDay,
  ]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (readOnly || isActivityLocked) {
        showMessage(
          "Impossible de sauvegarder : le mode est en lecture seule ou l'activité est verrouillée.",
          "info"
        );
        return;
      }

      if (validateForm()) {
        try {
          // onSave est responsable de gérer l'ajout pour un seul jour ou plusieurs jours
          await onSave({ ...formData, id: activity?.id });
          onClose(); // Réinitialise le formulaire après sauvegarde réussie
        } catch (error) {
          console.error("ActivityForm: Erreur lors de la sauvegarde:", error);
        }
      } else {
        showMessage(
          "Veuillez corriger les erreurs dans le formulaire.",
          "error"
        );
      }
    },
    [
      formData,
      validateForm,
      onSave,
      onClose,
      activity,
      showMessage,
      readOnly,
      isActivityLocked,
    ]
  );

  const handleDeleteActivity = useCallback(async () => {
    console.log("[ActivityForm] handleDeleteActivity called.");

    if (readOnly || isActivityLocked) {
      showMessage(
        "Impossible de supprimer : le mode est en lecture seule ou l'activité est verrouillée.",
        "info"
      );
      return;
    }

    if (isEditing && activity && onDelete) {
      console.log(
        `[ActivityForm] Tentative de suppression directe pour l'activité ID: ${activity.id}`
      );
      try {
        await onDelete(activity.id);
        onClose();
      } catch (error) {
        console.error(
          "ActivityForm: Erreur lors de la suppression via bouton 'Supprimer':",
          error
        );
      }
    }
  }, [
    isEditing,
    activity,
    onDelete,
    onClose,
    showMessage,
    readOnly,
    isActivityLocked,
  ]);

  // Détermine si le champ client est requis en fonction du type d'activité sélectionné
  const isClientRequired = useMemo(() => {
    const selectedType = activityTypeDefinitions.find(
      (type) => String(type.id) === String(formData.type_activite)
    );
    // Un client n'est PAS requis si le type sélectionné est un type d'absence
    return selectedType && !absenceActivityTypeIds.has(String(selectedType.id));
  }, [formData.type_activite, activityTypeDefinitions, absenceActivityTypeIds]);

  return (
    // Remplacé l'enveloppe de la modale par une simple div pour l'intégration directe
    <div className="bg-white rounded-xl shadow-xl w-full p-6 sm:p-8 mt-6">
      <div className="flex justify-between items-center mb-4 border-b pb-3">
        <h2 className="text-2xl font-bold text-gray-800">
          {isEditing
            ? "Modifier l'activité"
            : `Ajouter une activité ${
                isMultiDayAdd ? `(${selectedDaysForMultiAdd.length} jours)` : ""
              }`}
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-wrap gap-4 mb-4 items-end">
          {!isMultiDayAdd && ( // Affiche la date seulement si ce n'est PAS une multi-sélection
            <div className="flex-grow mb-4">
              <label
                htmlFor="date_activite"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date:
              </label>
              <input
                type="date"
                id="date_activite"
                name="date_activite"
                value={
                  formData.date_activite
                    ? format(new Date(formData.date_activite), "yyyy-MM-dd")
                    : ""
                }
                onChange={handleDateChange}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={readOnly || isActivityLocked || isMultiDayAdd}
              />
              {formErrors.date_activite && (
                <p className="text-red-500 text-xs mt-1">
                  {formErrors.date_activite}
                </p>
              )}
            </div>
          )}

            <div className="flex-grow mb-4">
              <label
                htmlFor="temps_passe"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Temps passé (jours):
                {!isMultiDayAdd && availableTimeForDay < 1 && (
                  <span className="ml-2 text-gray-500 text-xs">
                    (Max: {availableTimeForDay.toFixed(1)}j)
                  </span>
                )}
              </label>
              <input
                type="number"
                id="temps_passe"
                name="temps_passe"
                step="0.1"
                min="0.1"
                max={isMultiDayAdd ? 1 : availableTimeForDay}
                value={formData.temps_passe}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={
                  readOnly ||
                  isActivityLocked
                }
              />
              {formErrors.temps_passe && (
                <p className="text-red-500 text-xs mt-1">
                  {formErrors.temps_passe}
                </p>
              )}
            </div>
            <div className="flex-grow mb-4">
              <label
                htmlFor="type_activite"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Type d'activité:
              </label>
              <select
                id="type_activite"
                name="type_activite"
                value={formData.type_activite}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={readOnly || isActivityLocked}
              >
                <option value="">Sélectionner un type</option>
                {/* Utilise la liste filtrée des types d'activité */}
                {filteredActivityTypeDefinitions.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {formErrors.type_activite && (
                <p className="text-red-500 text-xs mt-1">
                  {formErrors.type_activite}
                </p>
              )}
            </div>

            {isClientRequired && (
              <div className="flex-grow mb-4">
                <label
                  htmlFor="client_id"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Client:
                </label>
                <select
                  id="client_id"
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required={isClientRequired}
                  disabled={readOnly || isActivityLocked}
                >
                  <option value="">Sélectionner un client</option>
                  {clientDefinitions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom_client}
                    </option>
                  ))}
                </select>
                {formErrors.client_id && (
                  <p className="text-red-500 text-xs mt-1">
                    {formErrors.client_id}
                  </p>
                )}
              </div>
            )}

            {/* Checkbox pour la dérogation des jours non ouvrés */}
            {isValid(formData.date_activite) &&
              isNonWorkingDay(formData.date_activite) &&
              !absenceActivityTypeIds.has(String(formData.type_activite)) && (
                <div className="w-full mb-4 flex items-center">
                  <input
                    type="checkbox"
                    id="override_non_working_day"
                    name="override_non_working_day"
                    checked={formData.override_non_working_day}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={readOnly || isActivityLocked}
                  />
                  <label
                    htmlFor="override_non_working_day"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Dérogation jour non ouvré (pour CRA exceptionnel)
                  </label>
                </div>
              )}

            <div className="w-full mb-6">
              <label
                htmlFor="description_activite"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description:
              </label>
              <textarea
                id="description_activite"
                name="description_activite"
                value={formData.description_activite}
                onChange={handleChange}
                rows="3"
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={readOnly || isActivityLocked}
              ></textarea>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            {isEditing && (
              <button
                type="button"
                onClick={handleDeleteActivity}
                className={`px-4 py-2 bg-red-600 text-white font-semibold rounded-md transition duration-200 ${
                  readOnly || isActivityLocked
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-red-700"
                }`}
                disabled={readOnly || isActivityLocked}
              >
                Supprimer
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-md hover:bg-gray-400 transition duration-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              className={`px-4 py-2 bg-blue-600 text-white font-semibold rounded-md transition duration-200 ${
                readOnly ||
                isActivityLocked ||
                (availableTimeForDay === 0 && !isEditing)
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-blue-700"
              }`}
              disabled={
                readOnly ||
                isActivityLocked ||
                (availableTimeForDay === 0 && !isEditing)
              }
            >
              {isEditing ? "Modifier" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
  );
}
