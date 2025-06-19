"use client";
import React from "react";

// Styles pour le gestionnaire (inchangés)
const managerStyles = {
  container:
    "font-sans mx-auto w-full max-w-5xl lg:max-w-6xl p-4 sm:p-8 bg-gray-50 shadow-xl rounded-xl border border-gray-100 mt-8",
  tabContainer: "flex justify-center mb-6 border-b border-gray-200",
  tabButton:
    "px-6 py-3 text-lg font-semibold text-gray-600 border-b-2 border-transparent hover:border-blue-500 hover:text-blue-700 transition-colors duration-200 focus:outline-none",
  tabButtonActive: "text-blue-700 border-blue-500",
  header:
    "text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800 border-b pb-3 text-center",
  form: "mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-100 rounded-lg flex flex-col sm:flex-row gap-4 sm:gap-6 items-center justify-center sm:items-center",
  input:
    "px-4 py-2.5 h-10 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 shadow-sm w-full flex-grow text-sm",
  select:
    "px-4 py-2.5 h-10 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 shadow-sm appearance-none cursor-pointer bg-white w-full sm:w-auto text-sm",
  button:
    "px-6 py-2.5 h-10 text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg font-semibold bg-blue-600 text-white w-full sm:w-auto",
  list: "bg-white rounded-lg border border-gray-200 shadow-md p-3 sm:p-4",
  listItem:
    "flex flex-wrap justify-between items-center p-2 sm:p-3 border-b border-gray-100 last:border-b-0 gap-2",
  itemName: "font-medium text-gray-800 flex-grow text-sm sm:text-base",
  editInput:
    "px-4 py-2.5 h-10 border border-blue-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 flex-grow text-sm",
  editSelect:
    "px-4 py-2.5 h-10 border border-blue-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 text-sm",
  buttonGroup: "flex flex-wrap space-x-4 ml-auto",
  actionButton:
    "px-6 py-2.5 h-10 text-sm rounded-md transition-colors duration-150",
  saveButton: "bg-green-500 text-white hover:bg-green-600",
  cancelButton: "bg-gray-300 text-gray-800 hover:bg-gray-400",
  editButton: "bg-blue-500 text-white hover:bg-blue-600",
  deleteButton: "bg-red-500 text-white hover:bg-red-600",
};

// Options pour le sélecteur de type d'activité/absence (inchangées)
const ACTIVITY_TYPES_OPTIONS = [
  { value: "activity", label: "Activité" },
  { value: "absence", label: "Absence" },
];

// Composant de modale de confirmation personnalisée (inchangé)
const ConfirmModal = ({ show, message, onConfirm, onCancel }) => {
  if (!show) return null;

  return React.createElement(
    "div",
    {
      className:
        "fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50",
    },
    React.createElement(
      "div",
      {
        className:
          "bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center",
      },
      React.createElement(
        "p",
        { className: "text-lg font-semibold mb-4" },
        message
      ),
      React.createElement(
        "div",
        { className: "flex justify-around gap-4" },
        React.createElement(
          "button",
          {
            onClick: onConfirm,
            className:
              "flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200",
          },
          "Confirmer"
        ),
        React.createElement(
          "button",
          {
            onClick: onCancel,
            className:
              "flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors duration-200",
          },
          "Annuler"
        )
      )
    )
  );
};

// Le composant fonctionnel UnifiedManager
function UnifiedManager({
  activityTypes,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  clientTypes,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  activeTab,
  setActiveTab,
}) {
  // États pour les formulaires d'ajout d'activité
  const [newActivityName, setNewActivityName] = React.useState("");
  const [newActivityType, setNewActivityType] = React.useState("activity");

  // États pour les formulaires d'ajout de client
  const [newClientName, setNewClientName] = React.useState("");
  const [newClientAddress, setNewClientAddress] = React.useState("");
  const [newClientEmail, setNewClientEmail] = React.useState("");
  const [newClientPhone, setNewClientPhone] = React.useState("");
  // NOUVEAUX ÉTATS POUR LES MESSAGES D'ERREUR DE VALIDATION
  const [newClientEmailError, setNewClientEmailError] = React.useState("");
  const [newClientPhoneError, setNewClientPhoneError] = React.useState("");

  // États pour les formulaires d'édition d'activité
  const [editingActivityId, setEditingActivityId] = React.useState(null);
  const [editingActivityName, setEditingActivityName] = React.useState("");
  const [editingActivityType, setEditingActivityType] = React.useState("");

  // États pour les formulaires d'édition de client
  const [editingClientId, setEditingClientId] = React.useState(null);
  const [editingClientName, setEditingClientName] = React.useState("");
  const [editingClientAddress, setEditingClientAddress] = React.useState("");
  const [editingClientEmail, setEditingClientEmail] = React.useState("");
  const [editingClientPhone, setEditingClientPhone] = React.useState("");
  // NOUVEAUX ÉTATS POUR LES MESSAGES D'ERREUR DE VALIDATION EN ÉDITION
  const [editingClientEmailError, setEditingClientEmailError] =
    React.useState("");
  const [editingClientPhoneError, setEditingClientPhoneError] =
    React.useState("");

  // États pour la modale de confirmation
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [confirmMessage, setConfirmMessage] = React.useState("");
  const [confirmAction, setConfirmAction] = React.useState(null);

  // --- Fonctions de validation (ajoutées pour les emails et téléphones) ---
  const validateEmail = (email) => {
    // Regex simple pour l'email. Plus robuste nécessaire pour des cas extrêmes.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email)
      ? ""
      : "Format d'email invalide (ex: exemple@domaine.com).";
  };

  const validatePhone = (phone) => {
    // Permet uniquement 10 chiffres numériques.
    const phoneRegex = /^[0-9]{10}$/;
    if (phone.trim() === "") return ""; // Permet le champ vide si non requis
    return phoneRegex.test(phone)
      ? ""
      : "Le numéro de téléphone doit contenir exactement 10 chiffres (0-9).";
  };

  // --- Logique de gestion des Activités (inchangée, car la demande ne les concerne pas) ---
  const handleAddActivityClick = React.useCallback(async () => {
    if (newActivityName.trim() === "") {
      console.error("Le nom de l'activité ne peut pas être vide.");
      return;
    }

    const activityData = {
      description_activite: newActivityName.trim(),
      type_activite: newActivityType,
      temps_passe: 1, // Valeur par défaut temporaire pour passer la validation
      date_activite: new Date().toISOString().split("T")[0], // Date du jour
      cra_id: 1, // PLACEHOLDER : IMPORTANT! C'est la cause de l'erreur de clé étrangère si CRA 1 n'existe pas.
    };

    console.log("Données d'activité envoyées à la DB:", activityData);

    const success = await onAddActivity(activityData);
    if (success) {
      setNewActivityName("");
      setNewActivityType("activity");
    } else {
      console.error(
        "Échec de l'ajout de l'activité. Vérifiez les logs côté serveur pour plus de détails."
      );
    }
  }, [newActivityName, newActivityType, onAddActivity]);

  const handleEditActivityClick = React.useCallback((activity) => {
    setEditingActivityId(activity.id);
    setEditingActivityName(activity.description_activite);
    setEditingActivityType(activity.type_activite);
  }, []);

  const handleSaveActivityEdit = React.useCallback(async () => {
    if (editingActivityName.trim() === "") {
      console.error("Le nom de l'activité ne peut pas être vide.");
      return;
    }
    const updatedData = {
      description_activite: editingActivityName.trim(),
      type_activite: editingActivityType,
    };
    const success = await onUpdateActivity(editingActivityId, updatedData);
    if (success) {
      setEditingActivityId(null);
      setEditingActivityName("");
      setEditingActivityType("");
    } else {
      console.error(
        "Échec de la mise à jour de l'activité. Vérifiez les logs."
      );
    }
  }, [
    editingActivityId,
    editingActivityName,
    editingActivityType,
    onUpdateActivity,
  ]);

  const handleCancelActivityEdit = React.useCallback(() => {
    setEditingActivityId(null);
    setEditingActivityName("");
    setEditingActivityType("");
  }, []);

  const handleDeleteActivityClick = React.useCallback(
    (idToDelete) => {
      setConfirmMessage(
        "Êtes-vous sûr de vouloir supprimer ce type d'activité ? Toutes les données associées seront perdues."
      );
      setConfirmAction(() => async () => {
        const success = await onDeleteActivity(idToDelete);
        if (success) {
          setShowConfirm(false);
        } else {
          console.error(
            "Échec de la suppression de l'activité. Vérifiez les logs."
          );
        }
      });
      setShowConfirm(true);
    },
    [onDeleteActivity]
  );

  // --- Logique de gestion des Clients (MODIFIÉE pour la validation en temps réel) ---
  const handleAddClientClick = React.useCallback(async () => {
    // Exécute la validation avant la soumission
    const emailError = validateEmail(newClientEmail);
    const phoneError = validatePhone(newClientPhone);

    if (newClientName.trim() === "" || newClientAddress.trim() === "") {
      console.error("Le nom et l'adresse du client ne peuvent pas être vides.");
      setNewClientEmailError(emailError); // Met à jour l'erreur email pour affichage
      setNewClientPhoneError(phoneError); // Met à jour l'erreur téléphone pour affichage
      return;
    }
    if (emailError) {
      setNewClientEmailError(emailError);
      setNewClientPhoneError(phoneError); // Met à jour l'erreur téléphone au cas où
      return;
    }
    if (phoneError) {
      setNewClientPhoneError(phoneError);
      setNewClientEmailError(emailError); // Met à jour l'erreur email au cas où
      return;
    }

    // Réinitialise les erreurs si toutes les validations passent
    setNewClientEmailError("");
    setNewClientPhoneError("");

    const clientData = {
      nom_client: newClientName.trim(),
      adresse: newClientAddress.trim(),
      contact_email: newClientEmail.trim(),
      telephone: newClientPhone.trim(),
    };
    console.log("Données client envoyées à la DB:", clientData);
    const success = await onAddClient(clientData);
    if (success) {
      setNewClientName("");
      setNewClientAddress("");
      setNewClientEmail("");
      setNewClientPhone("");
      setActiveTab("clients");
    } else {
      console.error("Échec de l'ajout du client. Vérifiez les logs.");
    }
  }, [
    newClientName,
    newClientAddress,
    newClientEmail,
    newClientPhone,
    onAddClient,
    setActiveTab,
  ]);

  const handleEditClientClick = React.useCallback((client) => {
    setEditingClientId(client.id);
    setEditingClientName(client.nom_client);
    setEditingClientAddress(client.adresse || "");
    setEditingClientEmail(client.contact_email || "");
    setEditingClientPhone(client.telephone || "");
    // Réinitialiser les erreurs lors de l'ouverture du mode édition
    setEditingClientEmailError("");
    setEditingClientPhoneError("");
  }, []);

  const handleSaveClientEdit = React.useCallback(async () => {
    // Exécute la validation avant la soumission
    const emailError = validateEmail(editingClientEmail);
    const phoneError = validatePhone(editingClientPhone);

    if (editingClientName.trim() === "" || editingClientAddress.trim() === "") {
      console.error(
        "Le nom et l'adresse du client ne peuvent pas être vides pour la modification."
      );
      setEditingClientEmailError(emailError); // Met à jour l'erreur email pour affichage
      setEditingClientPhoneError(phoneError); // Met à jour l'erreur téléphone pour affichage
      return;
    }
    if (emailError) {
      setEditingClientEmailError(emailError);
      setEditingClientPhoneError(phoneError); // Met à jour l'erreur téléphone au cas où
      return;
    }
    if (phoneError) {
      setEditingClientPhoneError(phoneError);
      setEditingClientEmailError(emailError); // Met à jour l'erreur email au cas où
      return;
    }

    // Réinitialise les erreurs si toutes les validations passent
    setEditingClientEmailError("");
    setEditingClientPhoneError("");

    const updatedData = {
      nom_client: editingClientName.trim(),
      adresse: editingClientAddress.trim(),
      contact_email: editingClientEmail.trim(),
      telephone: editingClientPhone.trim(),
    };
    const success = await onUpdateClient(editingClientId, updatedData);
    if (success) {
      setEditingClientId(null);
      setEditingClientName("");
      setEditingClientAddress("");
      setEditingClientEmail("");
      setEditingClientPhone("");
      setActiveTab("clients");
    } else {
      console.error("Échec de la mise à jour du client. Vérifiez les logs.");
    }
  }, [
    editingClientId,
    editingClientName,
    editingClientAddress,
    editingClientEmail,
    editingClientPhone,
    onUpdateClient,
    setActiveTab,
  ]);

  const handleCancelClientEdit = React.useCallback(() => {
    setEditingClientId(null);
    setEditingClientName("");
    setEditingClientAddress("");
    setEditingClientEmail("");
    setEditingClientPhone("");
    // Réinitialise les messages d'erreur lors de l'annulation
    setEditingClientEmailError("");
    setEditingClientPhoneError("");
  }, []);

  const handleDeleteClientClick = React.useCallback(
    (idToDelete) => {
      setConfirmMessage(
        "Êtes-vous sûr de vouloir supprimer ce client ? Cela pourrait affecter les activités qui lui sont liées."
      );
      setConfirmAction(() => async () => {
        const success = await onDeleteClient(idToDelete);
        if (success) {
          setShowConfirm(false);
          setActiveTab("clients");
        } else {
          console.error(
            "Échec de la suppression du client. Vérifiez les logs."
          );
        }
      });
      setShowConfirm(true);
    },
    [onDeleteClient, setActiveTab]
  );

  // Rendu du composant
  return React.createElement(
    "div",
    { className: managerStyles.container },
    // Boutons de navigation entre les onglets
    React.createElement(
      "div",
      { className: managerStyles.tabContainer },
      React.createElement(
        "button",
        {
          onClick: () => setActiveTab("activities"),
          className: `${managerStyles.tabButton} ${
            activeTab === "activities" ? managerStyles.tabButtonActive : ""
          }`,
        },
        "Gérer les Activités"
      ),
      React.createElement(
        "button",
        {
          onClick: () => setActiveTab("clients"),
          className: `${managerStyles.tabButton} ${
            activeTab === "clients" ? managerStyles.tabButtonActive : ""
          }`,
        },
        "Gérer les Clients"
      )
    ),

    // Contenu affiché en fonction de l'onglet actif
    activeTab === "activities" &&
      React.createElement(
        "div",
        null,
        React.createElement(
          "h2",
          { className: managerStyles.header },
          "Gestion des types d'activités/absences"
        ),
        // Formulaire d'ajout d'activité/absence
        React.createElement(
          "div",
          { className: managerStyles.form },
          React.createElement("input", {
            type: "text",
            placeholder: "Nom de l'activité/absence",
            value: newActivityName,
            onChange: (e) => setNewActivityName(e.target.value),
            className: managerStyles.input,
          }),
          React.createElement(
            "select",
            {
              value: newActivityType,
              onChange: (e) => setNewActivityType(e.target.value),
              className: managerStyles.select,
            },
            ACTIVITY_TYPES_OPTIONS.map((option) =>
              React.createElement(
                "option",
                { key: option.value, value: option.value },
                option.label
              )
            )
          ),
          React.createElement(
            "button",
            {
              onClick: handleAddActivityClick,
              className: managerStyles.button,
            },
            "Ajouter Activité"
          )
        ),

        // Liste des activités/absences existantes
        React.createElement(
          "div",
          { className: managerStyles.list },
          Array.isArray(activityTypes) && activityTypes.length > 0
            ? activityTypes.map((activity) =>
                React.createElement(
                  "div",
                  { key: activity.id, className: managerStyles.listItem },
                  editingActivityId === activity.id
                    ? // Mode édition activité
                      React.createElement(
                        React.Fragment,
                        null,
                        React.createElement("input", {
                          type: "text",
                          value: editingActivityName,
                          onChange: (e) =>
                            setEditingActivityName(e.target.value),
                          className: managerStyles.editInput,
                        }),
                        React.createElement(
                          "select",
                          {
                            value: editingActivityType,
                            onChange: (e) =>
                              setEditingActivityType(e.target.value),
                            className: managerStyles.editSelect,
                          },
                          ACTIVITY_TYPES_OPTIONS.map((option) =>
                            React.createElement(
                              "option",
                              { key: option.value, value: option.value },
                              option.label
                            )
                          )
                        ),
                        React.createElement(
                          "div",
                          { className: managerStyles.buttonGroup },
                          React.createElement(
                            "button",
                            {
                              onClick: handleSaveActivityEdit,
                              className: `${managerStyles.actionButton} ${managerStyles.saveButton}`,
                            },
                            "Sauver"
                          ),
                          React.createElement(
                            "button",
                            {
                              onClick: handleCancelActivityEdit,
                              className: `${managerStyles.actionButton} ${managerStyles.cancelButton}`,
                            },
                            "Annuler"
                          )
                        )
                      )
                    : // Mode affichage activité
                      React.createElement(
                        React.Fragment,
                        null,
                        React.createElement(
                          "span",
                          { className: managerStyles.itemName },
                          `${activity.description_activite} (${
                            activity.type_activite === "activity"
                              ? "Activité"
                              : "Absence"
                          })`
                        ),
                        React.createElement(
                          "div",
                          { className: managerStyles.buttonGroup },
                          React.createElement(
                            "button",
                            {
                              onClick: () => handleEditActivityClick(activity),
                              className: `${managerStyles.actionButton} ${managerStyles.editButton}`,
                            },
                            "Éditer"
                          ),
                          React.createElement(
                            "button",
                            {
                              onClick: () =>
                                handleDeleteActivityClick(activity.id),
                              className: `${managerStyles.actionButton} ${managerStyles.deleteButton}`,
                            },
                            "Supprimer"
                          )
                        )
                      )
                )
              )
            : React.createElement(
                "p",
                { className: "text-gray-500 text-center p-4" },
                "Aucun type d'activité/absence défini."
              )
        )
      ),

    activeTab === "clients" &&
      React.createElement(
        "div",
        null,
        React.createElement(
          "h2",
          { className: managerStyles.header },
          "Gestion des Clients"
        ),
        // Formulaire d'ajout de nouveau client
        React.createElement(
          "div",
          { className: managerStyles.form },
          React.createElement("input", {
            type: "text",
            placeholder: "Nom du nouveau client",
            value: newClientName,
            onChange: (e) => setNewClientName(e.target.value),
            className: managerStyles.input,
          }),
          React.createElement("input", {
            type: "text",
            placeholder: "Adresse du client",
            value: newClientAddress,
            onChange: (e) => setNewClientAddress(e.target.value),
            className: managerStyles.input,
          }),
          // CHAMPS EMAIL AVEC VALIDATION EN TEMPS RÉEL ET AFFICHAGE D'ERREUR
          React.createElement("input", {
            type: "email",
            placeholder: "exemple@domaine.com",
            value: newClientEmail,
            onChange: (e) => {
              setNewClientEmail(e.target.value);
              setNewClientEmailError(validateEmail(e.target.value));
            },
            className: `${managerStyles.input} ${
              newClientEmailError ? "border-red-500" : ""
            }`,
          }),
          newClientEmailError &&
            React.createElement(
              "p",
              { className: "text-red-500 text-xs w-full sm:w-auto" },
              newClientEmailError
            ),
          // CHAMPS TÉLÉPHONE AVEC VALIDATION EN TEMPS RÉEL ET AFFICHAGE D'ERREUR
          React.createElement("input", {
            type: "tel",
            placeholder: "0123456789",
            pattern: "[0-9]{10}",
            title:
              "Veuillez entrer un numéro de téléphone à 10 chiffres (ex: 0123456789)",
            value: newClientPhone,
            onChange: (e) => {
              setNewClientPhone(e.target.value);
              setNewClientPhoneError(validatePhone(e.target.value));
            },
            className: `${managerStyles.input} ${
              newClientPhoneError ? "border-red-500" : ""
            }`,
          }),
          newClientPhoneError &&
            React.createElement(
              "p",
              { className: "text-red-500 text-xs w-full sm:w-auto" },
              newClientPhoneError
            ),
          React.createElement(
            "button",
            { onClick: handleAddClientClick, className: managerStyles.button },
            "Ajouter Client"
          )
        ),

        // Liste des clients existants
        React.createElement(
          "div",
          { className: managerStyles.list },
          Array.isArray(clientTypes) && clientTypes.length > 0
            ? clientTypes.map((client) =>
                React.createElement(
                  "div",
                  { key: client.id, className: managerStyles.listItem },
                  editingClientId === client.id
                    ? // Mode édition client
                      React.createElement(
                        React.Fragment,
                        null,
                        React.createElement("input", {
                          type: "text",
                          value: editingClientName,
                          onChange: (e) => setEditingClientName(e.target.value),
                          className: managerStyles.editInput,
                        }),
                        React.createElement("input", {
                          type: "text",
                          value: editingClientAddress,
                          onChange: (e) =>
                            setEditingClientAddress(e.target.value),
                          className: managerStyles.editInput,
                        }),
                        // CHAMPS EMAIL ÉDITION AVEC VALIDATION EN TEMPS RÉEL ET AFFICHAGE D'ERREUR
                        React.createElement("input", {
                          type: "email",
                          placeholder: "exemple@domaine.com",
                          value: editingClientEmail,
                          onChange: (e) => {
                            setEditingClientEmail(e.target.value);
                            setEditingClientEmailError(
                              validateEmail(e.target.value)
                            );
                          },
                          className: `${managerStyles.editInput} ${
                            editingClientEmailError ? "border-red-500" : ""
                          }`,
                        }),
                        editingClientEmailError &&
                          React.createElement(
                            "p",
                            {
                              className:
                                "text-red-500 text-xs w-full sm:w-auto",
                            },
                            editingClientEmailError
                          ),
                        // CHAMPS TÉLÉPHONE ÉDITION AVEC VALIDATION EN TEMPS RÉEL ET AFFICHAGE D'ERREUR
                        React.createElement("input", {
                          type: "tel",
                          placeholder: "0123456789",
                          pattern: "[0-9]{10}",
                          title:
                            "Veuillez entrer un numéro de téléphone à 10 chiffres (ex: 0123456789)",
                          value: editingClientPhone,
                          onChange: (e) => {
                            setEditingClientPhone(e.target.value);
                            setEditingClientPhoneError(
                              validatePhone(e.target.value)
                            );
                          },
                          className: `${managerStyles.editInput} ${
                            editingClientPhoneError ? "border-red-500" : ""
                          }`,
                        }),
                        editingClientPhoneError &&
                          React.createElement(
                            "p",
                            {
                              className:
                                "text-red-500 text-xs w-full sm:w-auto",
                            },
                            editingClientPhoneError
                          ),
                        React.createElement(
                          "div",
                          { className: managerStyles.buttonGroup },
                          React.createElement(
                            "button",
                            {
                              onClick: handleSaveClientEdit,
                              className: `${managerStyles.actionButton} ${managerStyles.saveButton}`,
                            },
                            "Sauver"
                          ),
                          React.createElement(
                            "button",
                            {
                              onClick: handleCancelClientEdit,
                              className: `${managerStyles.actionButton} ${managerStyles.cancelButton}`,
                            },
                            "Annuler"
                          )
                        )
                      )
                    : // Mode affichage client
                      React.createElement(
                        React.Fragment,
                        null,
                        React.createElement(
                          "span",
                          { className: managerStyles.itemName },
                          // MISE À JOUR ICI : Ajout du numéro de téléphone
                          `${client.nom_client} (${client.adresse}, ${
                            client.contact_email
                          }, ${client.telephone || "N/A"})`
                        ),
                        React.createElement(
                          "div",
                          { className: managerStyles.buttonGroup },
                          React.createElement(
                            "button",
                            {
                              onClick: () => handleEditClientClick(client),
                              className: `${managerStyles.actionButton} ${managerStyles.editButton}`,
                            },
                            "Éditer"
                          ),
                          React.createElement(
                            "button",
                            {
                              onClick: () => handleDeleteClientClick(client.id),
                              className: `${managerStyles.actionButton} ${managerStyles.deleteButton}`,
                            },
                            "Supprimer"
                          )
                        )
                      )
                )
              )
            : React.createElement(
                "p",
                { className: "text-gray-500 text-center p-4" },
                "Aucun client défini."
              )
        )
      ),
    // Modale de confirmation
    React.createElement(ConfirmModal, {
      show: showConfirm,
      message: confirmMessage,
      onConfirm: confirmAction,
      onCancel: () => setShowConfirm(false),
    })
  );
}

export default UnifiedManager;
