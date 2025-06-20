"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, isWeekend, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export default function ActivityModal({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  onDelete,
  initialDate,
  editingActivity,
  activityTypeDefinitions = [],
  clientDefinitions = [],
  showMessage,
  isHolidayOrWeekend,
  publicHolidays = [],
  craActivities = [],
}) {
  const [dateActivite, setDateActivite] = useState("");
  const [clientName, setClientName] = useState("");
  const [typeActivite, setTypeActivite] = useState("");
  const [tempsPasse, setTempsPasse] = useState("");
  const [descriptionActivite, setDescriptionActivite] = useState("");
  const [overrideNonWorkingDay, setOverrideNonWorkingDay] = useState(false);
  const [isDayFull, setIsDayFull] = useState(false);

  const isCurrentDateNonWorking = useCallback(() => {
    if (!dateActivite) return false;
    const dateObj = parseISO(dateActivite);
    const isWeekendDay = isWeekend(dateObj, { weekStartsOn: 1 });
    const isPublicHolidayDay = publicHolidays.includes(
      format(dateObj, "yyyy-MM-dd")
    );
    return isWeekendDay || isPublicHolidayDay;
  }, [dateActivite, publicHolidays]);

  useEffect(() => {
    if (isOpen) {
      if (editingActivity) {
        setDateActivite(
          format(new Date(editingActivity.date_activite), "yyyy-MM-dd")
        );
        setClientName(editingActivity.client_name || "");
        setTypeActivite(editingActivity.type_activite || "");
        setTempsPasse(editingActivity.temps_passe?.toString() || "");
        setDescriptionActivite(editingActivity.description_activite || "");
        setOverrideNonWorkingDay(
          editingActivity.override_non_working_day || false
        );
      } else {
        setDateActivite(format(initialDate || new Date(), "yyyy-MM-dd"));
        setClientName("");
        setTypeActivite("");
        setTempsPasse("");
        setDescriptionActivite("");
        setOverrideNonWorkingDay(isHolidayOrWeekend);
      }
    }
  }, [isOpen, editingActivity, initialDate, isHolidayOrWeekend]);

  useEffect(() => {
    if (dateActivite) {
      const activitiesOnSelectedDay = craActivities.filter(
        (activity) =>
          isSameDay(parseISO(activity.date_activite), parseISO(dateActivite)) &&
          activity.id !== (editingActivity ? editingActivity.id : null)
      );
      const totalTimeForDay = activitiesOnSelectedDay.reduce(
        (sum, activity) => sum + parseFloat(activity.temps_passe),
        0
      );
      setIsDayFull(totalTimeForDay >= 1.0);
    }
  }, [dateActivite, craActivities, editingActivity]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !dateActivite ||
      !typeActivite ||
      tempsPasse === "" ||
      isNaN(parseFloat(tempsPasse))
    ) {
      showMessage("Date, Type et Temps passé (numérique) sont requis.");
      return;
    }

    if (!typeActivite.includes("Absence") && clientName.trim() === "") {
      showMessage("Veuillez sélectionner un client pour ce type d'activité.");
      return;
    }

    const parsedTempsPasse = parseFloat(tempsPasse);

    const activitiesOnSelectedDay = craActivities.filter(
      (activity) =>
        isSameDay(parseISO(activity.date_activite), parseISO(dateActivite)) &&
        activity.id !== (editingActivity ? editingActivity.id : null)
    );

    const totalTimeForDayExcludingCurrent = activitiesOnSelectedDay.reduce(
      (sum, activity) => sum + parseFloat(activity.temps_passe),
      0
    );
    const newTotalTime = totalTimeForDayExcludingCurrent + parsedTempsPasse;

    if (!editingActivity && newTotalTime > 1.0) {
      showMessage(
        `Le temps total pour cette journée (${format(
          parseISO(dateActivite),
          "dd/MM/yyyy"
        )}) dépasserait 1 jour. Temps déjà enregistré: ${totalTimeForDayExcludingCurrent}j. Tentative d'ajout: ${parsedTempsPasse}j. Total: ${newTotalTime}j.`
      );
      return;
    } else if (editingActivity && newTotalTime > 1.0) {
      showMessage(
        `La modification de cette activité ferait dépasser le temps total pour cette journée (${format(
          parseISO(dateActivite),
          "dd/MM/yyyy"
        )}) au-delà de 1 jour. Temps déjà enregistré (hors cette activité): ${totalTimeForDayExcludingCurrent}j. Temps de cette activité: ${parsedTempsPasse}j. Total: ${newTotalTime}j.`
      );
      return;
    }

    const requiresOverride = isCurrentDateNonWorking();
    if (requiresOverride && !overrideNonWorkingDay) {
      showMessage(
        "Veuillez cocher 'Dérogation' pour enregistrer une activité un week-end ou jour férié."
      );
      return;
    }

    const activityData = {
      dateCra: dateActivite,
      clientName: typeActivite.includes("Absence") ? null : clientName.trim(),
      typeActivite: typeActivite.trim(),
      tempsPasse: parsedTempsPasse,
      descriptionActivite: descriptionActivite.trim() || "", // Changed from null to ''
      overrideNonWorkingDay: requiresOverride ? overrideNonWorkingDay : false,
    };

    try {
      if (editingActivity) {
        await onUpdate(editingActivity.id, activityData);
        showMessage("Activité CRA mise à jour avec succès !");
      } else {
        await onSave(activityData);
        showMessage("Activité CRA ajoutée avec succès !");
      }
      onClose();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde/mise à jour:", error);
      showMessage(`Erreur: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    if (
      editingActivity &&
      confirm("Êtes-vous sûr de vouloir supprimer cette activité ?")
    ) {
      try {
        await onDelete(editingActivity.id);
        showMessage("Activité CRA supprimée avec succès !");
        onClose();
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        showMessage(`Erreur: ${error.message}`);
      }
    }
  };

  const currentSelectedDateIsNonWorking = isCurrentDateNonWorking();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-4">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          {editingActivity
            ? "Modifier l'Activité CRA"
            : "Ajouter une Activité CRA"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="dateActivite"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Date:
            </label>
            <input
              type="date"
              id="dateActivite"
              value={dateActivite}
              onChange={(e) => setDateActivite(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="typeActivite"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Type d'activité:
            </label>
            <select
              id="typeActivite"
              value={typeActivite}
              onChange={(e) => {
                setTypeActivite(e.target.value);
                if (e.target.value.includes("Absence")) {
                  setClientName("");
                }
              }}
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">Sélectionner un type</option>
              {activityTypeDefinitions.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label
              htmlFor="clientName"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Client:
            </label>
            <select
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className={`shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                typeActivite.includes("Absence")
                  ? "bg-gray-200 cursor-not-allowed"
                  : ""
              }`}
              required={!typeActivite.includes("Absence")}
              disabled={typeActivite.includes("Absence")}
            >
              <option value="">Sélectionner un client</option>
              {clientDefinitions.map((client) => (
                <option key={client.id} value={client.nom_client}>
                  {client.nom_client}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label
              htmlFor="tempsPasse"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Temps passé (jours, ex: 0.5, 1, 2.5):
            </label>
            <input
              type="number"
              id="tempsPasse"
              value={tempsPasse}
              onChange={(e) => setTempsPasse(e.target.value)}
              step="0.1"
              min="0"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="descriptionActivite"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Description de l'activité (optionnel):
            </label>
            <textarea
              id="descriptionActivite"
              value={descriptionActivite}
              onChange={(e) => setDescriptionActivite(e.target.value)}
              rows="3"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Décrivez l'activité, par ex: 'Fin de la phase de test du module de connexion.'"
            ></textarea>
          </div>

          {currentSelectedDateIsNonWorking && (
            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                id="overrideNonWorkingDay"
                checked={overrideNonWorkingDay}
                onChange={(e) => setOverrideNonWorkingDay(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="overrideNonWorkingDay"
                className="text-gray-700 text-sm font-bold"
              >
                Dérogation: Enregistrer cette activité un week-end / jour férié.
              </label>
            </div>
          )}

          <div className="flex items-center justify-between">
            {editingActivity && (
              <button
                type="button"
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-200"
              >
                Supprimer
              </button>
            )}
            <div className="flex-grow"></div>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2 transition duration-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!editingActivity && isDayFull}
              className={`font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-200 ${
                !editingActivity && isDayFull
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-700 text-white"
              }`}
            >
              {editingActivity ? "Mettre à jour" : "Ajouter"}
            </button>
          </div>
          {!editingActivity && isDayFull && (
            <p className="text-red-500 text-sm mt-2 text-center">
              Le temps total pour cette journée atteint 1.0 jour. Vous ne pouvez
              plus ajouter d'activités, seulement modifier ou supprimer celles
              existantes.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
