// components/ActivityModal.js
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format, parseISO, isValid, isWeekend } from "date-fns";
import { fr } from "date-fns/locale";

export default function ActivityModal({
  isOpen,
  onClose,
  date, // This is a Date object from CraBoard
  editingActivity,
  clientDefinitions,
  activityTypeDefinitions,
  onSaveActivity, // This prop now receives the full activity object
  showMessage,
  isHolidayOrWeekend,
  currentUserId,
}) {
  const [formData, setFormData] = useState({
    date_activite: "", // Initialize as string or null
    client_id: "",
    activityType: "", // Stores the name of the activity type
    temps_passe: "",
    description_activite: "",
    is_billable: 0,
    override_non_working_day: 0,
    user_id: currentUserId,
    status: "draft", // Default status for new activities
  });

  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (editingActivity) {
      // When editing, parse date and find the activity type name
      const typeName =
        activityTypeDefinitions.find(
          (type) => type.id === editingActivity.type_activite // Assuming DB stores type_activite as ID
        )?.name || editingActivity.type_activite; // Fallback to existing value if name not found or if it's already a name

      setFormData({
        ...editingActivity,
        date_activite: editingActivity.date_activite
          ? parseISO(editingActivity.date_activite)
          : null,
        is_billable: editingActivity.is_billable === 1 ? 1 : 0,
        override_non_working_day:
          editingActivity.override_non_working_day === 1 ? 1 : 0,
        user_id: editingActivity.user_id || currentUserId,
        activityType: typeName, // Set the name of the activity type
        client_id: editingActivity.client_id || "", // Ensure client_id is correctly set
      });
    } else if (date) {
      // When adding a new activity
      setFormData({
        date_activite: date, // Pass the Date object directly for internal form state
        client_id: "",
        activityType: "", // Reset activityType to empty for new entries
        temps_passe: "",
        description_activite: "",
        is_billable: 0,
        override_non_working_day: 0,
        user_id: currentUserId,
        status: "draft",
      });
    } else {
      // Reset form if no activity or date is provided
      setFormData({
        date_activite: null,
        client_id: "",
        activityType: "",
        temps_passe: "",
        description_activite: "",
        is_billable: 0,
        override_non_working_day: 0,
        user_id: currentUserId,
        status: "draft",
      });
    }
    setValidationErrors({}); // Clear errors on modal open/activity change
  }, [isOpen, editingActivity, date, currentUserId, activityTypeDefinitions]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    }));
  }, []);

  const validateForm = useCallback(() => {
    const errors = {};
    if (!formData.date_activite || !isValid(formData.date_activite)) {
      errors.date_activite = "La date d'activité est requise.";
    }
    // Validation for client_id should check if it's required based on activity type
    // This requires having `activityTypeDefinitions` and `formData.activityType` in scope here
    const selectedType = activityTypeDefinitions.find(
      (t) => t.name === formData.activityType
    );
    if (selectedType?.requires_client && !formData.client_id) {
      errors.client_id = "Le client est requis pour ce type d'activité.";
    } else if (!selectedType?.requires_client && formData.client_id) {
      // Optional: If client is provided but not required
      // errors.client_id = "Le client ne doit pas être défini pour ce type d'activité.";
    }

    if (!formData.activityType) {
      errors.activityType = "Le type d'activité est requis.";
    }
    if (!formData.temps_passe || parseFloat(formData.temps_passe) <= 0) {
      errors.temps_passe = "Le temps passé doit être un nombre positif.";
    }
    if (isHolidayOrWeekend && formData.override_non_working_day === 0) {
      errors.override_non_working_day =
        "Vous devez cocher 'Dérogation' pour les jours non ouvrés.";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, isHolidayOrWeekend, activityTypeDefinitions]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!validateForm()) {
        showMessage(
          "Veuillez corriger les erreurs dans le formulaire.",
          "error"
        );
        return;
      }

      // Prepare data for saving - ensure names match page.js's handleAddCraActivity
      const dataToSave = {
        ...formData,
        // Convert Date object to ISO string for API
        date_activite: format(formData.date_activite, "yyyy-MM-dd"),
        temps_passe: parseFloat(formData.temps_passe),
        user_id: currentUserId, // Ensure user ID is always explicitly set on save
        // Pass activityType as type_activite for the API payload
        type_activite: formData.activityType, // This sends the NAME of the activity type
      };

      // Remove the original 'activityType' from dataToSave if it's no longer needed in the final payload
      delete dataToSave.activityType; // This cleans up the property name for the API

      console.log(
        "ActivityModal dataToSave before onSaveActivity:",
        dataToSave
      ); // Debug log

      try {
        await onSaveActivity(dataToSave); // Call the parent's function with the prepared data
        onClose(); // Close modal on success
      } catch (error) {
        // showMessage will be handled by the parent component's onSaveActivity
        console.error("Failed to save activity:", error);
      }
    },
    [
      formData,
      validateForm,
      onSaveActivity,
      onClose,
      showMessage,
      currentUserId,
    ]
  );

  if (!isOpen) return null;

  const modalTitle = editingActivity
    ? "Modifier l'activité"
    : `Ajouter une activité pour le ${date ? format(date, "dd/MM/yyyy") : ""}`;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">{modalTitle}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="date_activite"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Date
            </label>
            <input
              type="text"
              id="date_activite"
              name="date_activite"
              value={
                formData.date_activite
                  ? format(formData.date_activite, "dd/MM/yyyy")
                  : ""
              }
              readOnly
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-100 cursor-not-allowed"
            />
            {validationErrors.date_activite && (
              <p className="text-red-500 text-xs italic">
                {validationErrors.date_activite}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="client_id"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Client
            </label>
            <select
              id="client_id"
              name="client_id"
              value={formData.client_id}
              onChange={handleChange}
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="">Sélectionner un client</option>
              {clientDefinitions.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name || client.nom_client}
                </option>
              ))}
            </select>
            {validationErrors.client_id && (
              <p className="text-red-500 text-xs italic">
                {validationErrors.client_id}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="activityType" // Use "activityType"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Type d'activité
            </label>
            <select
              id="activityType" // Use "activityType"
              name="activityType" // Use "activityType"
              value={formData.activityType}
              onChange={handleChange}
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="">Sélectionner un type</option>
              {activityTypeDefinitions.map((type) => (
                <option key={type.id} value={type.name || type.libelle}>
                  {type.name || type.libelle}
                </option>
              ))}
            </select>
            {validationErrors.activityType && (
              <p className="text-red-500 text-xs italic">
                {validationErrors.activityType}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="temps_passe"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Temps passé (jours)
            </label>
            <input
              type="number"
              id="temps_passe"
              name="temps_passe"
              value={formData.temps_passe}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            {validationErrors.temps_passe && (
              <p className="text-red-500 text-xs italic">
                {validationErrors.temps_passe}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="description_activite"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Description (optionnel)
            </label>
            <textarea
              id="description_activite"
              name="description_activite"
              value={formData.description_activite}
              onChange={handleChange}
              rows="3"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            ></textarea>
          </div>

          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="is_billable"
              name="is_billable"
              checked={formData.is_billable === 1}
              onChange={handleChange}
              className="mr-2 leading-tight"
            />
            <label
              htmlFor="is_billable"
              className="text-sm text-gray-700 font-bold"
            >
              Facturable
            </label>
          </div>

          {isHolidayOrWeekend && (
            <div className="mb-4 flex items-center p-3 border border-yellow-400 bg-yellow-50 rounded">
              <input
                type="checkbox"
                id="override_non_working_day"
                name="override_non_working_day"
                checked={formData.override_non_working_day === 1}
                onChange={handleChange}
                className="mr-2 leading-tight"
              />
              <label
                htmlFor="override_non_working_day"
                className="text-sm text-yellow-800 font-bold"
              >
                Dérogation (jour non ouvré)
              </label>
            </div>
          )}
          {validationErrors.override_non_working_day && (
            <p className="text-red-500 text-xs italic">
              {validationErrors.override_non_working_day}
            </p>
          )}

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-300 text-gray-800 font-semibold hover:bg-gray-400 transition duration-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition duration-300"
            >
              {editingActivity ? "Modifier l'activité" : "Ajouter l'activité"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
