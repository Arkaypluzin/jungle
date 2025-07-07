// components/ActivityModal.js
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";
// Suppression des imports FontAwesome:
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faSave, faTimes, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';

export default function ActivityModal({
  isOpen,
  onClose,
  date,
  editingActivity,
  clientDefinitions = [],
  activityTypeDefinitions = [],
  onSaveActivity,
  showMessage,
  isHolidayOrWeekend,
  currentUserId,
  craActivities, // Ajouté pour la validation côté client
}) {
  const [description_activite, setDescriptionActivite] = useState("");
  const [temps_passe, setTempsPasse] = useState("");
  const [type_activite, setTypeActivite] = useState(""); // Sera l'ID du type d'activité
  const [client_id, setClientId] = useState(""); // Sera l'ID du client (string)
  const [override_non_working_day, setOverrideNonWorkingDay] = useState(false);
  const [status, setStatus] = useState("draft"); // Par défaut 'draft'
  const [formErrors, setFormErrors] = useState({});

  // Log pour voir les définitions de types d'activité reçues
  useEffect(() => {
    console.log(
      "ActivityModal: >>> Définitions de types d'activité reçues (prop):",
      JSON.stringify(activityTypeDefinitions, null, 2)
    );
  }, [activityTypeDefinitions]);

  // Initialisation du formulaire en mode édition ou ajout
  useEffect(() => {
    if (isOpen) {
      setFormErrors({}); // Réinitialiser les erreurs à l'ouverture

      if (editingActivity) {
        // Mode édition
        setDescriptionActivite(editingActivity.description_activite || "");
        setTempsPasse(editingActivity.temps_passe?.toString() || "");
        setTypeActivite(editingActivity.type_activite || ""); // L'ID du type
        setClientId(editingActivity.client_id || ""); // L'ID du client
        setOverrideNonWorkingDay(
          editingActivity.override_non_working_day || false
        );
        setStatus(editingActivity.status || "draft");
      } else {
        // Mode ajout
        setDescriptionActivite("");
        setTempsPasse("");
        setTypeActivite("");
        setClientId("");
        setOverrideNonWorkingDay(false);
        setStatus("draft");
      }
    }
  }, [isOpen, editingActivity]);

  // Dérive les propriétés du type d'activité sélectionné
  const selectedActivityType = useMemo(() => {
    return activityTypeDefinitions.find(
      (def) => String(def.id) === String(type_activite)
    );
  }, [type_activite, activityTypeDefinitions]);

  // Détermine si le champ client doit être affiché et est requis
  const isClientRequired = useMemo(() => {
    // S'assurer que selectedActivityType existe et que requires_client est vrai
    return selectedActivityType ? selectedActivityType.requires_client : false;
  }, [selectedActivityType]);

  // Détermine si l'activité est une heure supplémentaire
  const isOvertimeActivity = useMemo(() => {
    return selectedActivityType ? selectedActivityType.is_overtime : false;
  }, [selectedActivityType]);

  // Validation du formulaire
  const validateForm = useCallback(() => {
    const errors = {};
    if (!temps_passe || parseFloat(temps_passe) <= 0) {
      errors.temps_passe = "Le temps passé doit être un nombre positif.";
    }
    if (!type_activite) {
      errors.type_activite = "Le type d'activité est requis.";
    }
    if (isClientRequired && !client_id) {
      errors.client_id = "Le client est requis pour ce type d'activité.";
    }

    // Validation du 1 jour maximum
    if (date && currentUserId && !isOvertimeActivity) {
      // Seulement pour les activités non-heures supplémentaires
      const formattedDate = format(date, "yyyy-MM-dd");
      const newTime = parseFloat(temps_passe) || 0;

      const totalTimeForDayExcludingCurrentAndOvertime = craActivities
        .filter(
          (activity) =>
            activity.user_id === currentUserId &&
            activity.date_activite === formattedDate &&
            activity.id !== (editingActivity ? editingActivity.id : null) && // Exclut l'activité en cours d'édition
            activity.is_overtime !== true // Exclut les heures supplémentaires existantes
        )
        .reduce(
          (sum, activity) => sum + (parseFloat(activity.temps_passe) || 0),
          0
        );

      if (totalTimeForDayExcludingCurrentAndOvertime + newTime > 1) {
        errors.temps_passe = `Le temps total pour le ${format(date, "dd MMMM", {
          locale: fr,
        })} dépassera 1 jour (${(
          totalTimeForDayExcludingCurrentAndOvertime + newTime
        ).toFixed(
          2
        )}j). Maximum autorisé pour les activités régulières : 1 jour.`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [
    temps_passe,
    type_activite,
    isClientRequired,
    client_id,
    date,
    currentUserId,
    isOvertimeActivity,
    craActivities,
    editingActivity,
  ]);

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

      if (!date) {
        showMessage("Date de l'activité non définie.", "error");
        return;
      }

      const activityData = {
        date_activite: format(date, "yyyy-MM-dd"),
        temps_passe: parseFloat(temps_passe),
        description_activite,
        type_activite: String(type_activite), // S'assurer que c'est une chaîne
        client_id: client_id === "" ? null : String(client_id), // S'assurer que c'est une chaîne ou null
        override_non_working_day,
        user_id: currentUserId,
        status,
      };

      console.log(
        "ActivityModal: >>> Payload envoyé à onSaveActivity (vers CRAPage):",
        activityData
      );
      await onSaveActivity(activityData);
    },
    [
      validateForm,
      date,
      temps_passe,
      description_activite,
      type_activite,
      client_id,
      override_non_working_day,
      currentUserId,
      status,
      onSaveActivity,
      showMessage,
    ]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl"
          aria-label="Fermer"
        >
          &times; {/* Utilisation d'un caractère X */}
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {editingActivity ? "Modifier l'activité" : "Ajouter une activité"}
        </h2>

        <div className="flex items-center text-gray-600 mb-4">
          <span className="font-semibold">
            Date: {date ? format(date, "dd MMMM", { locale: fr }) : "N/A"}
          </span>
          {isHolidayOrWeekend && (
            <span className="ml-2 text-sm text-red-500 font-medium">
              (Jour non ouvré)
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="type_activite"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Type d'activité:
            </label>
            <select
              id="type_activite"
              value={type_activite}
              onChange={(e) => {
                setTypeActivite(e.target.value);
                setFormErrors((prev) => ({
                  ...prev,
                  type_activite: undefined,
                }));
              }}
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                formErrors.type_activite ? "border-red-500" : ""
              }`}
            >
              <option value="">Sélectionner un type</option>
              {activityTypeDefinitions.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {formErrors.type_activite && (
              <p className="text-red-500 text-xs italic">
                {formErrors.type_activite}
              </p>
            )}
          </div>

          {isClientRequired && (
            <div className="mb-4">
              <label
                htmlFor="client_id"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Client:
              </label>
              <select
                id="client_id"
                value={client_id}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setFormErrors((prev) => ({ ...prev, client_id: undefined }));
                }}
                className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                  formErrors.client_id ? "border-red-500" : ""
                }`}
              >
                <option value="">Sélectionner un client</option>
                {clientDefinitions.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name || client.nom_client}
                  </option>
                ))}
              </select>
              {formErrors.client_id && (
                <p className="text-red-500 text-xs italic">
                  {formErrors.client_id}
                </p>
              )}
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="temps_passe"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Temps passé (jours):
            </label>
            <input
              type="number"
              id="temps_passe"
              value={temps_passe}
              onChange={(e) => {
                setTempsPasse(e.target.value);
                setFormErrors((prev) => ({ ...prev, temps_passe: undefined }));
              }}
              min="0.1"
              step="0.1"
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                formErrors.temps_passe ? "border-red-500" : ""
              }`}
            />
            {formErrors.temps_passe && (
              <p className="text-red-500 text-xs italic">
                {formErrors.temps_passe}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="description_activite"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Description de l'activité:
            </label>
            <textarea
              id="description_activite"
              value={description_activite}
              onChange={(e) => setDescriptionActivite(e.target.value)}
              rows="3"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            ></textarea>
          </div>

          {isHolidayOrWeekend && (
            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                id="override_non_working_day"
                checked={override_non_working_day}
                onChange={(e) => setOverrideNonWorkingDay(e.target.checked)}
                className="mr-2 leading-tight"
              />
              <label
                htmlFor="override_non_working_day"
                className="text-gray-700 text-sm font-bold"
              >
                Dérogation jour non ouvré
              </label>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 flex items-center"
            >
              {editingActivity ? "Modifier" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
