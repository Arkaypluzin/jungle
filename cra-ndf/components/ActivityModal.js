// components/ActivityModal.js
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import ConfirmationModal from "./ConfirmationModal"; // ADDED: Import ConfirmationModal

export default function ActivityModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  activity, // Existing activity object if editing
  initialDate, // Initial date for new activity
  activityTypeDefinitions,
  clientDefinitions,
  showMessage,
  readOnly = false, // Added readOnly prop
}) {
  const [date, setDate] = useState("");
  const [timeSpent, setTimeSpent] = useState("");
  const [description, setDescription] = useState("");
  const [activityType, setActivityType] = useState("");
  const [client, setClient] = useState(""); // Stores client ID
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        // activity.date_activite should already be a Date object here
        const debugActivityDateValid = activity.date_activite
          ? isValid(activity.date_activite) // Check if it's a valid Date object
          : false;
        console.log(
          "ActivityModal (Log Debug): activity prop:",
          activity,
          "date_activite type:",
          typeof activity.date_activite,
          "isValid(activity.date_activite):",
          debugActivityDateValid
        );

        setDate(
          activity.date_activite && isValid(activity.date_activite)
            ? format(activity.date_activite, "yyyy-MM-dd")
            : ""
        );
        setTimeSpent(activity.temps_passe || "");
        setDescription(activity.description_activite || "");
        setActivityType(activity.type_activite || "");
        setClient(activity.client_id || "");
      } else {
        // When adding a new activity
        setDate(initialDate ? format(initialDate, "yyyy-MM-dd") : "");
        setTimeSpent(1); // Default to 1 day for new activities
        setDescription("");
        setActivityType("");
        setClient("");
      }
    }
  }, [isOpen, activity, initialDate]);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();

      if (readOnly || isActivityLocked) {
        showMessage(
          "Impossible de sauvegarder : le mode est en lecture seule ou l'activité est verrouillée.",
          "info"
        );
        return;
      }

      if (!date || !timeSpent || !activityType) {
        showMessage("Veuillez remplir tous les champs obligatoires.", "error");
        return;
      }

      const activityDate = parseISO(date); // This is fine, 'date' state is always a string
      if (!isValid(activityDate)) {
        showMessage("Date d'activité invalide.", "error");
        return;
      }

      const selectedActivityType = activityTypeDefinitions.find(
        (type) => String(type.id) === String(activityType)
      );
      if (!selectedActivityType) {
        showMessage("Type d'activité sélectionné invalide.", "error");
        return;
      }

      // If activity type is 'Congé Payé', client_id must be null
      const isPaidLeave = selectedActivityType.name
        .toLowerCase()
        .includes("congé payé");
      const finalClientId = isPaidLeave ? null : client || null;

      const activityData = {
        date_activite: activityDate, // Pass as Date object to parent for consistency
        temps_passe: parseFloat(timeSpent),
        description_activite: description,
        type_activite: activityType,
        client_id: finalClientId,
        status: activity?.status || "draft", // Retain existing status or set to 'draft'
      };

      try {
        onSave(activityData);
      } catch (error) {
        console.error("ActivityModal: Erreur lors de la sauvegarde:", error);
        // showMessage will be handled by the parent component (CraBoard)
      }
    },
    [
      date,
      timeSpent,
      description,
      activityType,
      client,
      onSave,
      activity,
      showMessage,
      activityTypeDefinitions,
      readOnly,
      isActivityLocked,
    ]
  );

  const handleDeleteClick = useCallback(() => {
    if (readOnly || isActivityLocked) {
      showMessage(
        "Impossible de supprimer : le mode est en lecture seule ou l'activité est verrouillée.",
        "info"
      );
      return;
    }
    setShowDeleteConfirm(true);
  }, [onDelete, activity, showMessage, readOnly, isActivityLocked]);

  const confirmDelete = useCallback(() => {
    if (activity && onDelete) {
      onDelete(activity.id); // onDelete will handle showing message
    }
    setShowDeleteConfirm(false);
    onClose();
  }, [activity, onDelete, onClose]);

  const cancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  if (!isOpen) return null;

  const isClientRequired = useMemo(() => {
    const selectedType = activityTypeDefinitions.find(
      (type) => String(type.id) === String(activityType)
    );
    return (
      selectedType && !selectedType.name.toLowerCase().includes("congé payé")
    );
  }, [activityType, activityTypeDefinitions]);

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h2 className="text-2xl font-bold text-gray-800">
            {isEditing ? "Modifier l'activité" : "Ajouter une activité"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date:
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={readOnly || isActivityLocked}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="timeSpent"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Temps passé (jours):
            </label>
            <input
              type="number"
              id="timeSpent"
              step="0.5"
              min="0.5"
              max="1"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={readOnly || isActivityLocked}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="activityType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Type d'activité:
            </label>
            <select
              id="activityType"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
          </div>

          {isClientRequired && (
            <div className="mb-4">
              <label
                htmlFor="client"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Client:
              </label>
              <select
                id="client"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
            </div>
          )}

          <div className="mb-6">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description:
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={readOnly || isActivityLocked}
            ></textarea>
          </div>

          <div className="flex justify-end space-x-3">
            {!readOnly && !isActivityLocked && (
              <>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="px-4 py-2 bg-red-500 text-white font-semibold rounded-md hover:bg-red-600 transition duration-200"
                  >
                    Supprimer
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition duration-200"
                >
                  {isEditing ? "Modifier" : "Ajouter"}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-md hover:bg-gray-400 transition duration-200"
            >
              Annuler
            </button>
          </div>
        </form>

        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          message="Êtes-vous sûr de vouloir supprimer cette activité ? Cette action est irréversible."
        />
      </div>
    </div>
  );
}
