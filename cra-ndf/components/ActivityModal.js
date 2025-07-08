// components/ActivityModal.js
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";

const ActivityModal = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  activity,
  initialDate,
  activityTypeDefinitions,
  clientDefinitions,
  showMessage, // showMessage est maintenant une prop
}) => {
  const getFormattedDate = useCallback((dateValue) => {
    let dateObj;
    if (dateValue instanceof Date) {
      dateObj = dateValue;
    } else if (typeof dateValue === "string") {
      dateObj = parseISO(dateValue);
    } else {
      dateObj = new Date();
    }
    return isValid(dateObj)
      ? format(dateObj, "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd");
  }, []);

  const [formData, setFormData] = useState({
    date_activite: getFormattedDate(initialDate),
    temps_passe: "",
    description_activite: "",
    type_activite: "",
    client_id: "",
    override_non_working_day: false,
    status: "draft",
  });
  const [selectedActivityType, setSelectedActivityType] = useState(null);
  const [isClientRequired, setIsClientRequired] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    console.log(
      "ActivityModal (Log 0): onSave prop reçue:",
      typeof onSave === "function" ? "OK" : "ERREUR (non fonction)"
    );
  }, [onSave]);

  useEffect(() => {
    console.log("ActivityModal (Log 1): Modal ouvert?", isOpen);
    console.log(
      "ActivityModal (Log 2): ActivityTypeDefinitions reçues:",
      JSON.stringify(activityTypeDefinitions, null, 2)
    );
    console.log(
      "ActivityModal (Log 3): ClientDefinitions reçues (au montage/ouverture):",
      JSON.stringify(clientDefinitions, null, 2)
    );

    const debugInitialDateValid = initialDate
      ? initialDate instanceof Date
        ? isValid(initialDate)
        : isValid(parseISO(initialDate))
      : false;
    console.log(
      "ActivityModal (Log Debug): initialDate prop:",
      initialDate,
      "isValid(initialDate):",
      debugInitialDateValid
    );

    if (activity) {
      const debugActivityDateValid = activity.date_activite
        ? isValid(parseISO(activity.date_activite))
        : false;
      console.log(
        "ActivityModal (Log Debug): activity prop:",
        JSON.stringify(activity, null, 2)
      );
      console.log(
        "ActivityModal (Log Debug): activity.date_activite:",
        activity.date_activite,
        "isValid(parseISO(activity.date_activite)):",
        debugActivityDateValid
      );
    }

    if (isOpen) {
      setErrors({});

      if (activity) {
        setFormData({
          date_activite: getFormattedDate(activity.date_activite),
          temps_passe: activity.temps_passe?.toString() || "",
          description_activite: activity.description_activite || "",
          type_activite: activity.type_activite || "",
          client_id: activity.client_id ? String(activity.client_id) : "",
          override_non_working_day: activity.override_non_working_day ?? false,
          status: activity.status || "draft",
        });
      } else {
        setFormData({
          date_activite: getFormattedDate(initialDate),
          temps_passe: "",
          description_activite: "",
          type_activite: "",
          client_id: "",
          override_non_working_day: false,
          status: "draft",
        });
      }
    }
  }, [
    isOpen,
    activity,
    initialDate,
    activityTypeDefinitions,
    clientDefinitions,
    getFormattedDate,
  ]);

  useEffect(() => {
    const currentType = activityTypeDefinitions.find(
      (type) => String(type.id) === String(formData.type_activite)
    );

    console.log(
      "ActivityModal (Log 4): Type d'activité sélectionné (ID):",
      formData.type_activite
    );
    console.log(
      "ActivityModal (Log 5): Type d'activité sélectionné (Objet):",
      JSON.stringify(currentType, null, 2)
    );

    if (currentType) {
      setSelectedActivityType(currentType);
      setIsClientRequired(currentType.requires_client);
    } else {
      setSelectedActivityType(null);
      setIsClientRequired(false);
    }
  }, [formData.type_activite, activityTypeDefinitions]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.date_activite)
      newErrors.date_activite = "La date est requise.";
    if (!formData.temps_passe || parseFloat(formData.temps_passe) <= 0)
      newErrors.temps_passe = "Le temps passé doit être un nombre positif.";
    if (!formData.type_activite)
      newErrors.type_activite = "Le type d'activité est requis.";
    if (isClientRequired && (!formData.client_id || formData.client_id === ""))
      newErrors.client_id = "Le client est requis pour ce type d'activité.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isClientRequired]);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (validateForm()) {
        const payload = {
          ...formData,
          temps_passe: parseFloat(formData.temps_passe),
          // S'assurer que client_id est null si vide, sinon stringifié
          client_id:
            formData.client_id === "" ? null : String(formData.client_id),
        };
        console.log(
          "ActivityModal (Debug): Appel de onSave avec payload:",
          payload
        );
        if (typeof onSave === "function") {
          onSave(payload);
        } else {
          console.error(
            "ActivityModal (Erreur): onSave n'est pas une fonction ou est undefined.",
            "onSave value:",
            onSave
          );
          showMessage(
            "Erreur interne: Impossible de sauvegarder l'activité (onSave manquant).",
            "error"
          );
        }
      } else {
        showMessage(
          "Veuillez corriger les erreurs dans le formulaire.",
          "error"
        );
      }
    },
    [formData, onSave, validateForm, showMessage]
  );

  const handleClientSelectChange = useCallback((e) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      client_id: value,
    }));
    setErrors((prev) => ({ ...prev, client_id: "" }));
  }, []);

  if (!isOpen) return null;

  console.log(
    "ActivityModal (Render): clientDefinitions pour le select (avant map):",
    JSON.stringify(clientDefinitions, null, 2)
  );

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {activity ? "Modifier l'Activité" : "Ajouter une Activité"}
        </h2>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-3xl leading-none"
          aria-label="Fermer"
        >
          &times;
        </button>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="date_activite"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Date de l'activité:
            </label>
            <input
              type="date"
              id="date_activite"
              name="date_activite"
              value={formData.date_activite}
              onChange={handleChange}
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                errors.date_activite ? "border-red-500" : ""
              }`}
            />
            {errors.date_activite && (
              <p className="text-red-500 text-xs italic">
                {errors.date_activite}
              </p>
            )}
          </div>

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
              name="temps_passe"
              step="0.01"
              value={formData.temps_passe}
              onChange={handleChange}
              placeholder="Ex: 0.5 (pour une demi-journée)"
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                errors.temps_passe ? "border-red-500" : ""
              }`}
            />
            {errors.temps_passe && (
              <p className="text-red-500 text-xs italic">
                {errors.temps_passe}
              </p>
            )}
          </div>
          <div className="mb-4">
            <label
              htmlFor="type_activite"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Type d'activité:
            </label>
            <select
              id="type_activite"
              name="type_activite"
              value={formData.type_activite}
              onChange={handleChange}
              className={`shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white ${
                errors.type_activite ? "border-red-500" : ""
              }`}
            >
              <option value="">Sélectionner un type</option>
              {activityTypeDefinitions.map((type) => (
                <option
                  key={type.id || type._id?.toString()}
                  value={type.id || type._id?.toString()}
                >
                  {type.name} {type.is_billable}
                </option>
              ))}
            </select>
            {errors.type_activite && (
              <p className="text-red-500 text-xs italic">
                {errors.type_activite}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="client_id"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Client:
            </label>
            <select
              id="client_id"
              name="client_id"
              value={formData.client_id}
              onChange={handleClientSelectChange}
              className={`shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white ${
                errors.client_id ? "border-red-500" : ""
              }`}
            >
              <option value="">Sélectionner un client </option>
              {clientDefinitions.length > 0 ? (
                clientDefinitions.map((client) => {
                  const clientKey = client.id || client._id?.toString();
                  console.log(
                    `ActivityModal (Render): Option client - key: "${clientKey}", value: "${clientKey}", name: "${client.nom_client}"`
                  ); // NOUVEAU LOG CLÉ
                  return (
                    <option key={clientKey} value={clientKey}>
                      {client.nom_client}{" "}
                      {/* Utilisez client.nom_client pour l'affichage */}
                    </option>
                  );
                })
              ) : (
                <option disabled>Aucun client disponible</option>
              )}
            </select>
            {errors.client_id && (
              <p className="text-red-500 text-xs italic">{errors.client_id}</p>
            )}
          </div>
          <div className="mb-4">
            <label
              htmlFor="description_activite"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Description:
            </label>
            <textarea
              id="description_activite"
              name="description_activite"
              value={formData.description_activite || ""}
              onChange={handleChange}
              rows="3"
              placeholder="Détails de l'activité (optionnel)"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline resize-y"
            ></textarea>
          </div>
          {selectedActivityType &&
            (selectedActivityType.is_overtime ||
              selectedActivityType.is_billable) && (
              <div className="mb-4">
                <label
                  htmlFor="override_non_working_day"
                  className="flex items-center text-gray-700 text-sm font-bold"
                >
                  <input
                    type="checkbox"
                    id="override_non_working_day"
                    name="override_non_working_day"
                    checked={formData.override_non_working_day}
                    onChange={handleChange}
                    className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  Reporter cette activité même si c'est un jour non travaillé
                  (weekend, jour férié)
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Utile pour les heures supplémentaires ou les urgences.
                </p>
              </div>
            )}
          <div className="flex justify-between mt-6">
            {activity && (
              <button
                type="button"
                onClick={() => onDelete(activity.id)}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-200"
              >
                Supprimer
              </button>
            )}
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-200"
              >
                {activity
                  ? "Sauvegarder les modifications"
                  : "Ajouter l'activité"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActivityModal;
