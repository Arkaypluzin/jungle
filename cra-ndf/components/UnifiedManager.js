// components/UnifiedManager.js
"use client";
import React, { useState, useCallback } from "react";
import { format } from "date-fns"; // Importez format de date-fns

// Styles pour le gestionnaire
const managerStyles = {
  container:
    "font-sans mx-auto w-full max-w-5xl lg:max-w-6xl p-4 sm:p-8 bg-gray-50 shadow-xl rounded-xl border border-gray-100 mt-8",
  tabContainer: "flex border-b border-gray-200 mb-6",
  tabButton: (isActive) =>
    `px-6 py-3 text-sm font-medium ${
      isActive
        ? "border-b-2 border-blue-600 text-blue-600"
        : "text-gray-600 hover:text-blue-500"
    } focus:outline-none transition-colors duration-200`,
  header:
    "text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800 border-b pb-3 text-center",
  form: "mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-100 rounded-lg flex flex-col sm:flex-row gap-4 sm:gap-6 items-center justify-center sm:items-center",
  input:
    "px-4 py-2.5 h-10 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 shadow-sm w-full flex-grow text-sm",
  textarea:
    "px-4 py-2.5 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 shadow-sm w-full flex-grow text-sm",
  select:
    "px-4 py-2.5 h-10 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 shadow-sm appearance-none cursor-pointer bg-white w-full sm:w-auto text-sm",
  button:
    "px-6 py-2.5 h-10 text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg font-semibold bg-blue-600 text-white w-full sm:w-auto",
  list: "bg-white rounded-lg border border-gray-200 shadow-md p-3 sm:p-4",
  listItem:
    "flex flex-wrap justify-between items-center p-2 sm:p-3 border-b border-gray-100 last:border-b-0 gap-2",
  itemName: "font-medium text-gray-800 flex-grow text-sm sm:text-base",
  itemDetail: "text-gray-600 text-sm",
  editInput:
    "px-4 py-2.5 h-10 border border-blue-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 flex-grow text-sm",
  editTextarea:
    "px-4 py-2.5 border border-blue-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 flex-grow text-sm",
  editSelect:
    "px-4 py-2.5 h-10 border border-blue-300 rounded-md text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 text-sm",
  buttonGroup: "flex flex-wrap space-x-4 ml-auto",
  actionButton:
    "px-6 py-2.5 h-10 text-sm rounded-md transition-colors duration-150",
  saveButton: "bg-green-500 text-white hover:bg-green-600",
  cancelButton: "bg-gray-300 text-gray-800 hover:bg-gray-400",
  editButton: "bg-blue-500 text-white hover:bg-blue-600",
  deleteButton: "bg-red-500 text-white hover:bg-red-600",
  errorText: "text-red-500 text-xs mt-1",
};

// Composant de modale de confirmation personnalisée
const ConfirmModal = ({ show, message, onConfirm, onCancel }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
        <p className="text-lg font-semibold mb-4">{message}</p>
        <div className="flex justify-around gap-4">
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Confirmer
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

// Le composant fonctionnel UnifiedManager
function UnifiedManager({
  clientDefinitions = [],
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  // PROPS POUR LA GESTION DES TYPES D'ACTIVITÉS (table activity_type)
  activityTypeDefinitions = [], // Reçoit les définitions des types d'activité depuis la DB
  onAddActivityType,
  onUpdateActivityType,
  onDeleteActivityType,
}) {
  const [activeTab, setActiveTab] = useState("clients"); // 'clients' ou 'activityTypes'

  // --- États pour les formulaires d'ajout de client ---
  const [newClientName, setNewClientName] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmailError, setNewClientEmailError] = useState("");
  const [newClientPhoneError, setNewClientPhoneError] = useState("");

  // --- États pour les formulaires d'édition de client ---
  const [editingClientId, setEditingClientId] = useState(null);
  const [editingClientName, setEditingClientName] = useState("");
  const [editingClientAddress, setEditingClientAddress] = useState("");
  const [editingClientEmail, setEditingClientEmail] = useState("");
  const [editingClientPhone, setEditingClientPhone] = useState("");
  const [editingClientEmailError, setEditingClientEmailError] = useState("");
  const [editingClientPhoneError, setEditingClientPhoneError] = useState("");

  // --- États pour les formulaires d'ajout de type d'activité (activity_type) ---
  const [newActivityTypeName, setNewActivityTypeName] = useState("");

  // --- États pour les formulaires d'édition de type d'activité (activity_type) ---
  const [editingActivityTypeId, setEditingActivityTypeId] = useState(null);
  const [editingActivityTypeName, setEditingActivityTypeName] = useState("");

  // --- États pour la modale de confirmation ---
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  // --- Fonctions de validation ---
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email && !emailRegex.test(email)
      ? "Format d'email invalide (ex: exemple@domaine.com)."
      : "";
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phone && !phoneRegex.test(phone)
      ? "Le numéro de téléphone doit contenir exactement 10 chiffres (0-9)."
      : "";
  };

  // --- Logique de gestion des Clients ---
  const handleAddClientClick = useCallback(async () => {
    const emailError = validateEmail(newClientEmail);
    const phoneError = validatePhone(newClientPhone);

    setNewClientEmailError(emailError);
    setNewClientPhoneError(phoneError);

    if (newClientName.trim() === "" || newClientAddress.trim() === "") {
      alert("Le nom et l'adresse du client ne peuvent pas être vides.");
      return;
    }
    if (emailError || phoneError) {
      return;
    }

    const clientData = {
      nom_client: newClientName.trim(),
      adresse: newClientAddress.trim(),
      contact_email: newClientEmail.trim(),
      telephone: newClientPhone.trim(),
    };

    try {
      await onAddClient(clientData);
      setNewClientName("");
      setNewClientAddress("");
      setNewClientEmail("");
      setNewClientPhone("");
    } catch (error) {
      console.error("Error adding client:", error);
      alert(`Erreur d'ajout de client: ${error.message}`);
    }
  }, [
    newClientName,
    newClientAddress,
    newClientEmail,
    newClientPhone,
    onAddClient,
  ]);

  const handleEditClientClick = useCallback((client) => {
    setEditingClientId(client.id);
    setEditingClientName(client.nom_client);
    setEditingClientAddress(client.adresse || "");
    setEditingClientEmail(client.contact_email || "");
    setEditingClientPhone(client.telephone || "");
    setEditingClientEmailError("");
    setEditingClientPhoneError("");
  }, []);

  const handleSaveClientEdit = useCallback(async () => {
    const emailError = validateEmail(editingClientEmail);
    const phoneError = validatePhone(editingClientPhone);

    setEditingClientEmailError(emailError);
    setEditingClientPhoneError(phoneError);

    if (editingClientName.trim() === "" || editingClientAddress.trim() === "") {
      alert(
        "Le nom et l'adresse du client ne peuvent pas être vides pour la modification."
      );
      return;
    }
    if (emailError || phoneError) {
      return;
    }

    const updatedData = {
      nom_client: editingClientName.trim(),
      adresse: editingClientAddress.trim(),
      contact_email: editingClientEmail.trim(),
      telephone: editingClientPhone.trim(),
    };

    try {
      await onUpdateClient(editingClientId, updatedData);
      setEditingClientId(null);
      setEditingClientName("");
      setEditingClientAddress("");
      setEditingClientEmail("");
      setEditingClientPhone("");
    } catch (error) {
      console.error("Error updating client:", error);
      alert(`Erreur de mise à jour client: ${error.message}`);
    }
  }, [
    editingClientId,
    editingClientName,
    editingClientAddress,
    editingClientEmail,
    editingClientPhone,
    onUpdateClient,
  ]);

  const handleCancelClientEdit = useCallback(() => {
    setEditingClientId(null);
    setEditingClientName("");
    setEditingClientAddress("");
    setEditingClientEmail("");
    setEditingClientPhone("");
    setEditingClientEmailError("");
    setEditingClientPhoneError("");
  }, []);

  const handleDeleteClientClick = useCallback(
    (idToDelete) => {
      setConfirmMessage(
        "Êtes-vous sûr de vouloir supprimer ce client ? Cela affectera toutes les activités CRA qui lui sont liées."
      );
      setConfirmAction(() => async () => {
        try {
          await onDeleteClient(idToDelete);
          setShowConfirm(false);
        } catch (error) {
          console.error("Error deleting client:", error);
          alert(`Erreur de suppression client: ${error.message}`);
          setShowConfirm(false);
        }
      });
      setShowConfirm(true);
    },
    [onDeleteClient]
  );

  // --- Logique de gestion des Types d'Activités (activity_type) ---
  const handleAddActivityTypeClick = useCallback(async () => {
    if (newActivityTypeName.trim() === "") {
      alert("Le nom du type d'activité ne peut pas être vide.");
      return;
    }
    const activityTypeData = {
      name: newActivityTypeName.trim(),
    };
    try {
      await onAddActivityType(activityTypeData);
      setNewActivityTypeName("");
    } catch (error) {
      alert(`Erreur d'ajout de type d'activité: ${error.message}`);
    }
  }, [newActivityTypeName, onAddActivityType]);

  const handleEditActivityTypeClick = useCallback((activityType) => {
    setEditingActivityTypeId(activityType.id);
    setEditingActivityTypeName(activityType.name);
  }, []);

  const handleSaveActivityTypeEdit = useCallback(async () => {
    if (editingActivityTypeName.trim() === "") {
      alert(
        "Le nom du type d'activité ne peut pas être vide pour la modification."
      );
      return;
    }
    const updatedData = {
      name: editingActivityTypeName.trim(),
    };
    try {
      await onUpdateActivityType(editingActivityTypeId, updatedData);
      setEditingActivityTypeId(null);
      setEditingActivityTypeName("");
    } catch (error) {
      alert(`Erreur de mise à jour de type d'activité: ${error.message}`);
    }
  }, [editingActivityTypeId, editingActivityTypeName, onUpdateActivityType]);

  const handleCancelActivityTypeEdit = useCallback(() => {
    setEditingActivityTypeId(null);
    setEditingActivityTypeName("");
  }, []);

  const handleDeleteActivityTypeClick = useCallback(
    (idToDelete) => {
      setConfirmMessage(
        "Êtes-vous sûr de vouloir supprimer ce type d'activité ? Cela pourrait affecter les activités existantes."
      );
      setConfirmAction(() => async () => {
        try {
          await onDeleteActivityType(idToDelete);
          setShowConfirm(false);
        } catch (error) {
          alert(`Erreur de suppression de type d'activité: ${error.message}`);
          setShowConfirm(false);
        }
      });
      setShowConfirm(true);
    },
    [onDeleteActivityType]
  );

  // Rendu du composant
  return (
    <div className={managerStyles.container}>
      {/* Boutons de navigation des onglets */}
      <div className={managerStyles.tabContainer}>
        <button
          onClick={() => setActiveTab("clients")}
          className={managerStyles.tabButton(activeTab === "clients")}
        >
          Gestion Clients
        </button>
        <button
          onClick={() => setActiveTab("activityTypes")}
          className={managerStyles.tabButton(activeTab === "activityTypes")}
        >
          Gestion Types d'Activité
        </button>
      </div>

      {activeTab === "clients" && (
        <>
          <h2 className={managerStyles.header}>Gestion des Clients</h2>
          {/* Formulaire d'ajout de client */}
          <div className={managerStyles.form}>
            <input
              type="text"
              placeholder="Nom du client"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              className={managerStyles.input}
              required
            />
            <input
              type="text"
              placeholder="Adresse"
              value={newClientAddress}
              onChange={(e) => setNewClientAddress(e.target.value)}
              className={managerStyles.input}
              required
            />
            <input
              type="email"
              placeholder="Email (optionnel)"
              value={newClientEmail}
              onChange={(e) => {
                setNewClientEmail(e.target.value);
                setNewClientEmailError(validateEmail(e.target.value));
              }}
              className={managerStyles.input}
            />
            {newClientEmailError && (
              <p className={managerStyles.errorText}>{newClientEmailError}</p>
            )}
            <input
              type="tel"
              placeholder="Téléphone (10 chiffres, optionnel)"
              value={newClientPhone}
              onChange={(e) => {
                setNewClientPhone(e.target.value);
                setNewClientPhoneError(validatePhone(e.target.value));
              }}
              className={managerStyles.input}
            />
            {newClientPhoneError && (
              <p className={managerStyles.errorText}>{newClientPhoneError}</p>
            )}
            <button
              onClick={handleAddClientClick}
              className={managerStyles.button}
            >
              Ajouter Client
            </button>
          </div>

          {/* Liste des clients existants */}
          <div className={managerStyles.list}>
            {Array.isArray(clientDefinitions) &&
            clientDefinitions.length > 0 ? (
              clientDefinitions.map((client) => (
                <div key={client.id} className={managerStyles.listItem}>
                  {editingClientId === client.id ? (
                    // Mode édition client
                    <>
                      <input
                        type="text"
                        value={editingClientName}
                        onChange={(e) => setEditingClientName(e.target.value)}
                        className={managerStyles.editInput}
                        required
                      />
                      <input
                        type="text"
                        value={editingClientAddress}
                        onChange={(e) =>
                          setEditingClientAddress(e.target.value)
                        }
                        className={managerStyles.editInput}
                        required
                      />
                      <input
                        type="email"
                        value={editingClientEmail}
                        onChange={(e) => {
                          setEditingClientEmail(e.target.value);
                          setEditingClientEmailError(
                            validateEmail(e.target.value)
                          );
                        }}
                        className={managerStyles.editInput}
                      />
                      {editingClientEmailError && (
                        <p className={managerStyles.errorText}>
                          {editingClientEmailError}
                        </p>
                      )}
                      <input
                        type="tel"
                        value={editingClientPhone}
                        onChange={(e) => {
                          setEditingClientPhone(e.target.value);
                          setEditingClientPhoneError(
                            validatePhone(e.target.value)
                          );
                        }}
                        className={managerStyles.editInput}
                      />
                      {editingClientPhoneError && (
                        <p className={managerStyles.errorText}>
                          {editingClientPhoneError}
                        </p>
                      )}
                      <div className={managerStyles.buttonGroup}>
                        <button
                          onClick={handleSaveClientEdit}
                          className={`${managerStyles.actionButton} ${managerStyles.saveButton}`}
                        >
                          Sauver
                        </button>
                        <button
                          onClick={handleCancelClientEdit}
                          className={`${managerStyles.actionButton} ${managerStyles.cancelButton}`}
                        >
                          Annuler
                        </button>
                      </div>
                    </>
                  ) : (
                    // Mode affichage client
                    <>
                      <div className="flex flex-col flex-grow">
                        <span className={managerStyles.itemName}>
                          {client.nom_client}
                        </span>
                        <span className={managerStyles.itemDetail}>
                          {client.adresse}
                        </span>
                        {client.contact_email && (
                          <span className={managerStyles.itemDetail}>
                            {client.contact_email}
                          </span>
                        )}
                        {client.telephone && (
                          <span className={managerStyles.itemDetail}>
                            {client.telephone}
                          </span>
                        )}
                      </div>
                      <div className={managerStyles.buttonGroup}>
                        <button
                          onClick={() => handleEditClientClick(client)}
                          className={`${managerStyles.actionButton} ${managerStyles.editButton}`}
                        >
                          Éditer
                        </button>
                        <button
                          onClick={() => handleDeleteClientClick(client.id)}
                          className={`${managerStyles.actionButton} ${managerStyles.deleteButton}`}
                        >
                          Supprimer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">
                Aucun client enregistré.
              </p>
            )}
          </div>
        </>
      )}

      {activeTab === "activityTypes" && (
        <>
          <h2 className={managerStyles.header}>Gestion des Types d'Activité</h2>
          {/* Formulaire d'ajout de type d'activité (simple: seulement le nom) */}
          <div className={managerStyles.form}>
            <input
              type="text"
              placeholder="Nom du type d'activité"
              value={newActivityTypeName}
              onChange={(e) => setNewActivityTypeName(e.target.value)}
              className={managerStyles.input}
              required
            />
            <button
              onClick={handleAddActivityTypeClick}
              className={managerStyles.button}
            >
              Ajouter Type
            </button>
          </div>

          {/* Liste des types d'activité existants */}
          <div className={managerStyles.list}>
            {Array.isArray(activityTypeDefinitions) &&
            activityTypeDefinitions.length > 0 ? (
              activityTypeDefinitions.map((activityType) => (
                <div key={activityType.id} className={managerStyles.listItem}>
                  {editingActivityTypeId === activityType.id ? (
                    // Mode édition type d'activité
                    <>
                      <input
                        type="text"
                        value={editingActivityTypeName}
                        onChange={(e) =>
                          setEditingActivityTypeName(e.target.value)
                        }
                        className={managerStyles.editInput}
                        required
                      />
                      <div className={managerStyles.buttonGroup}>
                        <button
                          onClick={handleSaveActivityTypeEdit}
                          className={`${managerStyles.actionButton} ${managerStyles.saveButton}`}
                        >
                          Sauver
                        </button>
                        <button
                          onClick={handleCancelActivityTypeEdit}
                          className={`${managerStyles.actionButton} ${managerStyles.cancelButton}`}
                        >
                          Annuler
                        </button>
                      </div>
                    </>
                  ) : (
                    // Mode affichage type d'activité
                    <>
                      <span className={managerStyles.itemName}>
                        {activityType.name}
                      </span>
                      <div className={managerStyles.buttonGroup}>
                        <button
                          onClick={() =>
                            handleEditActivityTypeClick(activityType)
                          }
                          className={`${managerStyles.actionButton} ${managerStyles.editButton}`}
                        >
                          Éditer
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteActivityTypeClick(activityType.id)
                          }
                          className={`${managerStyles.actionButton} ${managerStyles.deleteButton}`}
                        >
                          Supprimer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">
                Aucun type d'activité enregistré.
              </p>
            )}
          </div>
        </>
      )}

      <ConfirmModal
        show={showConfirm}
        message={confirmMessage}
        onConfirm={() => {
          if (confirmAction) confirmAction();
          setShowConfirm(false);
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

export default UnifiedManager;
