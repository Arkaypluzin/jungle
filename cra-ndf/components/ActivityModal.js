// components/ActivityModal.js
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";

export default function ActivityModal({
  isOpen,
  onClose, // This is called by the 'x' button, and will now ONLY close the modal
  onSave,
  onDelete, // This onDelete will be the direct deletion function from CraBoard
  activity, // Existing activity object if editing
  initialDate, // Initial date for new activity
  activityTypeDefinitions,
  clientDefinitions,
  showMessage, // Passed from parent for displaying messages
  readOnly = false, // Added readOnly prop
}) {
  const [formData, setFormData] = useState({
    date_activite: initialDate || new Date(),
    temps_passe: "",
    description_activite: "", // Description is now optional
    type_activite: "",
    client_id: "",
    override_non_working_day: false,
    status: "draft", // Default status for new activities
  });
  const [formErrors, setFormErrors] = useState({});

  const isEditing = useMemo(() => !!activity, [activity]);

  // Determine if the activity (if editing) is in a non-editable state
  const isActivityLocked = useMemo(() => {
    if (!isEditing || !activity) return false;
    return (
      activity.status === "finalized" ||
      activity.status === "validated" ||
      activity.status === "pending_review"
    );
  }, [isEditing, activity]);

  useEffect(() => {
    if (isOpen) {
      if (activity) {
        // When editing an existing activity
        setFormData({
          date_activite: activity.date_activite || new Date(),
          temps_passe: activity.temps_passe || "",
          description_activite: activity.description_activite || "",
          type_activite: activity.type_activite || "",
          client_id: activity.client_id || "",
          override_non_working_day: activity.override_non_working_day || false,
          status: activity.status || "draft", // Keep existing status
        });
      } else {
        // When adding a new activity
        setFormData({
          date_activite: initialDate || new Date(),
          temps_passe: 1, // Default to 1 day for new activities
          description_activite: "",
          type_activite: "",
          client_id: "",
          override_non_working_day: false,
          status: "draft",
        });
      }
      setFormErrors({}); // Clear errors on modal open/activity change
    }
  }, [isOpen, activity, initialDate]);

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
    if (!formData.date_activite || !isValid(new Date(formData.date_activite))) {
      errors.date_activite = "La date d'activité est requise.";
    }
    if (!formData.temps_passe || parseFloat(formData.temps_passe) <= 0) {
      errors.temps_passe = "Le temps passé doit être supérieur à 0.";
    }
    if (!formData.type_activite) {
      errors.type_activite = "Le type d'activité est requis.";
    }
    // Client ID is only required for non-paid leave activities
    const paidLeaveType = activityTypeDefinitions.find(
      (t) => t.name && t.name.toLowerCase().includes("congé payé")
    );
    const isPaidLeave =
      paidLeaveType &&
      String(formData.type_activite) === String(paidLeaveType.id);

    if (!isPaidLeave && !formData.client_id) {
      errors.client_id = "Le client est requis pour ce type d'activité.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, activityTypeDefinitions]);

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
          await onSave({ ...formData, id: activity?.id }); // Pass ID for update
          onClose(); // Close modal on successful save
        } catch (error) {
          console.error("ActivityModal: Erreur lors de la sauvegarde:", error);
          // showMessage will be handled by the parent component (CraBoard)
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

  // This function is now ONLY for deleting the activity from within the modal
  const handleDeleteActivity = useCallback(async () => {
    console.log("[ActivityModal] handleDeleteActivity called.");

    if (readOnly || isActivityLocked) {
      showMessage(
        "Impossible de supprimer : le mode est en lecture seule ou l'activité est verrouillée.",
        "info"
      );
      return;
    }

    if (isEditing && activity && onDelete) {
      console.log(
        `[ActivityModal] Attempting direct delete for activity ID: ${activity.id}`
      );
      try {
        await onDelete(activity.id); // Direct deletion
        onClose(); // Close modal after successful deletion
      } catch (error) {
        console.error(
          "ActivityModal: Erreur lors de la suppression via bouton 'Supprimer':",
          error
        );
        // showMessage is handled by parent CraBoard after onDelete
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

  if (!isOpen) return null;

  const isClientRequired = useMemo(() => {
    const selectedType = activityTypeDefinitions.find(
      (type) => String(type.id) === String(formData.type_activite)
    );
    return (
      selectedType && !selectedType.name.toLowerCase().includes("congé payé")
    );
  }, [formData.type_activite, activityTypeDefinitions]);

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4 font-inter">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h2 className="text-2xl font-bold text-gray-800">
            {isEditing ? "Modifier l'activité" : "Ajouter une activité"}
          </h2>
          {/* The 'x' button now ONLY calls onClose */}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            title="Fermer"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
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
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={readOnly || isActivityLocked}
            />
            {formErrors.date_activite && (
              <p className="text-red-500 text-xs mt-1">
                {formErrors.date_activite}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="temps_passe"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Temps passé (jours):
            </label>
            <input
              type="number"
              id="temps_passe"
              name="temps_passe"
              step="0.5"
              min="0.5"
              max="1" // Assuming max 1 day per activity as per "jours" in label
              value={formData.temps_passe}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={readOnly || isActivityLocked}
            />
            {formErrors.temps_passe && (
              <p className="text-red-500 text-xs mt-1">
                {formErrors.temps_passe}
              </p>
            )}
          </div>

          <div className="mb-4">
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
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={readOnly || isActivityLocked}
            >
              <option value="">Sélectionner un type</option>
              {activityTypeDefinitions.map((type) => (
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
            <div className="mb-4">
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
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
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

          <div className="mb-6">
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
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              // No 'required' attribute here, description is optional
              disabled={readOnly || isActivityLocked}
            ></textarea>
            {/* No error message for description if it's optional */}
          </div>

          <div className="flex justify-end space-x-3">
            {isEditing && ( // Show delete button only when editing an existing activity
              <button
                type="button"
                onClick={handleDeleteActivity} // Calls the dedicated delete function
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
              type="submit"
              className={`px-4 py-2 bg-blue-600 text-white font-semibold rounded-md transition duration-200 ${
                readOnly || isActivityLocked
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-blue-700"
              }`}
              disabled={readOnly || isActivityLocked}
            >
              {isEditing ? "Modifier" : "Ajouter"}
            </button>
            <button
              type="button"
              onClick={onClose} // This button still just closes without deletion
              className="px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-md hover:bg-gray-400 transition duration-200"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
