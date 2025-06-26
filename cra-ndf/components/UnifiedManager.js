// components/UnifiedManager.js
"use client";
import React, { useState, useCallback } from "react";
// Pas besoin d'importer format de date-fns ici car non utilisé directement dans ce composant
// Pas besoin d'importer ConfirmationModal si elle est gérée au niveau de la page parente

export default function UnifiedManager({
  clientDefinitions = [],
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  // PROPS POUR LA GESTION DES TYPES D'ACTIVITÉS (table activity_type)
  activityTypeDefinitions = [], // Reçoit les définitions des types d'activité depuis la DB
  onAddActivityType,
  onUpdateActivityType,
  onDeleteActivityType,
  showMessage, // Passé depuis le parent pour les toasts
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
      showMessage(
        "Le nom et l'adresse du client ne peuvent pas être vides.",
        "error"
      );
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
      showMessage(`Erreur d'ajout de client: ${error.message}`, "error");
    }
  }, [
    newClientName,
    newClientAddress,
    newClientEmail,
    newClientPhone,
    onAddClient,
    showMessage,
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
      showMessage(
        "Le nom et l'adresse du client ne peuvent pas être vides pour la modification.",
        "error"
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
      showMessage(`Erreur de mise à jour client: ${error.message}`, "error");
    }
  }, [
    editingClientId,
    editingClientName,
    editingClientAddress,
    editingClientEmail,
    editingClientPhone,
    onUpdateClient,
    showMessage,
  ]);

  const handleCancelClientEdit = useCallback(() => {
    setEditingClientId(null);
    setNewClientName(""); // Réinitialiser le champ d'ajout
    setEditingClientName("");
    setEditingClientAddress("");
    setEditingClientEmail("");
    setEditingClientPhone("");
    setEditingClientEmailError("");
    setEditingClientPhoneError("");
  }, []);

  const handleDeleteClientClick = useCallback(
    (idToDelete) => {
      // Utilisez une confirmation modale passée par les props ou une implémentation locale si nécessaire
      // Pour cet exemple, nous allons juste appeler onDeleteClient directement
      // Dans une application réelle, vous auriez un composant ConfirmationModal séparé et réutilisable
      // comme celui que j'ai fourni dans les réponses précédentes.
      if (
        window.confirm(
          "Êtes-vous sûr de vouloir supprimer ce client ? Cela affectera toutes les activités CRA qui lui sont liées."
        )
      ) {
        onDeleteClient(idToDelete).catch((error) => {
          console.error("Error deleting client:", error);
          showMessage(
            `Erreur de suppression client: ${error.message}`,
            "error"
          );
        });
      }
    },
    [onDeleteClient, showMessage]
  );

  // --- Logique de gestion des Types d'Activités (activity_type) ---
  const handleAddActivityTypeClick = useCallback(async () => {
    if (newActivityTypeName.trim() === "") {
      showMessage("Le nom du type d'activité ne peut pas être vide.", "error");
      return;
    }
    const activityTypeData = {
      name: newActivityTypeName.trim(),
    };
    try {
      await onAddActivityType(activityTypeData);
      setNewActivityTypeName("");
    } catch (error) {
      showMessage(
        `Erreur d'ajout de type d'activité: ${error.message}`,
        "error"
      );
    }
  }, [newActivityTypeName, onAddActivityType, showMessage]);

  const handleEditActivityTypeClick = useCallback((activityType) => {
    setEditingActivityTypeId(activityType.id);
    setEditingActivityTypeName(activityType.name);
  }, []);

  const handleSaveActivityTypeEdit = useCallback(async () => {
    if (editingActivityTypeName.trim() === "") {
      showMessage(
        "Le nom du type d'activité ne peut pas être vide pour la modification.",
        "error"
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
      showMessage(
        `Erreur de mise à jour de type d'activité: ${error.message}`,
        "error"
      );
    }
  }, [
    editingActivityTypeId,
    editingActivityTypeName,
    onUpdateActivityType,
    showMessage,
  ]);

  const handleCancelActivityTypeEdit = useCallback(() => {
    setEditingActivityTypeId(null);
    setNewActivityTypeName(""); // Réinitialiser le champ d'ajout
    setEditingActivityTypeName("");
  }, []);

  const handleDeleteActivityTypeClick = useCallback(
    (idToDelete) => {
      if (
        window.confirm(
          "Êtes-vous sûr de vouloir supprimer ce type d'activité ? Cela pourrait affecter les activités existantes."
        )
      ) {
        onDeleteActivityType(idToDelete).catch((error) => {
          showMessage(
            `Erreur de suppression de type d'activité: ${error.message}`,
            "error"
          );
        });
      }
    },
    [onDeleteActivityType, showMessage]
  );

  // Rendu du composant
  return (
    <div className="mt-12 bg-white shadow-lg rounded-xl p-6 sm:p-8">
      <h2 className="text-3xl font-extrabold text-center text-gray-800 mb-8 border-b-2 pb-4">
        Gestion Unifiée (Clients & Types d'Activité)
      </h2>

      {/* Boutons de navigation des onglets */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("clients")}
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === "clients"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-blue-500"
          } focus:outline-none transition-colors duration-200`}
        >
          Gestion Clients
        </button>
        <button
          onClick={() => setActiveTab("activityTypes")}
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === "activityTypes"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-blue-500"
          } focus:outline-none transition-colors duration-200`}
        >
          Gestion Types d'Activité
        </button>
      </div>

      {activeTab === "clients" && (
        <>
          <h3 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-3">
            Gestion des Clients
          </h3>
          {/* Formulaire d'ajout/modification de client */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingClientId) {
                handleSaveClientEdit();
              } else {
                handleAddClientClick();
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 border rounded-lg bg-blue-50"
          >
            <div>
              <label
                htmlFor="clientName"
                className="block text-sm font-medium text-gray-700"
              >
                Nom du client
              </label>
              <input
                type="text"
                id="clientName"
                value={editingClientId ? editingClientName : newClientName}
                onChange={(e) =>
                  editingClientId
                    ? setEditingClientName(e.target.value)
                    : setNewClientName(e.target.value)
                }
                placeholder="Nom du client"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label
                htmlFor="clientAddress"
                className="block text-sm font-medium text-gray-700"
              >
                Adresse
              </label>
              <input
                type="text"
                id="clientAddress"
                value={
                  editingClientId ? editingClientAddress : newClientAddress
                }
                onChange={(e) =>
                  editingClientId
                    ? setEditingClientAddress(e.target.value)
                    : setNewClientAddress(e.target.value)
                }
                placeholder="Adresse"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label
                htmlFor="clientEmail"
                className="block text-sm font-medium text-gray-700"
              >
                Email (optionnel)
              </label>
              <input
                type="email"
                id="clientEmail"
                placeholder="Email (ex: exemple@domaine.com)"
                value={editingClientId ? editingClientEmail : newClientEmail}
                onChange={(e) => {
                  const value = e.target.value;
                  if (editingClientId) {
                    setEditingClientEmail(value);
                    setEditingClientEmailError(validateEmail(value));
                  } else {
                    setNewClientEmail(value);
                    setNewClientEmailError(validateEmail(value));
                  }
                }}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {(editingClientId
                ? editingClientEmailError
                : newClientEmailError) && (
                <p className="text-red-500 text-xs mt-1">
                  {editingClientId
                    ? editingClientEmailError
                    : newClientEmailError}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="clientPhone"
                className="block text-sm font-medium text-gray-700"
              >
                Téléphone (10 chiffres, optionnel)
              </label>
              <input
                type="tel"
                id="clientPhone"
                placeholder="Téléphone (10 chiffres)"
                value={editingClientId ? editingClientPhone : newClientPhone}
                onChange={(e) => {
                  const value = e.target.value;
                  if (editingClientId) {
                    setEditingClientPhone(value);
                    setEditingClientPhoneError(validatePhone(value));
                  } else {
                    setNewClientPhone(value);
                    setNewClientPhoneError(validatePhone(value));
                  }
                }}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {(editingClientId
                ? editingClientPhoneError
                : newClientPhoneError) && (
                <p className="text-red-500 text-xs mt-1">
                  {editingClientId
                    ? editingClientPhoneError
                    : newClientPhoneError}
                </p>
              )}
            </div>
            <div className="flex items-end space-x-2 col-span-1 md:col-span-2">
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
              >
                {editingClientId ? "Modifier le client" : "Ajouter un client"}
              </button>
              {editingClientId && (
                <button
                  type="button"
                  onClick={handleCancelClientEdit}
                  className="w-full px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>

          {/* Liste des clients existants */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">
              Clients existants :
            </h4>
            {Array.isArray(clientDefinitions) &&
            clientDefinitions.length > 0 ? (
              <ul className="space-y-2">
                {clientDefinitions.map((client) => (
                  <li
                    key={client.id}
                    className="flex flex-wrap justify-between items-center p-3 border-b border-gray-100 last:border-b-0 bg-white rounded-md shadow-sm"
                  >
                    <div className="flex-grow flex flex-col">
                      <span className="font-medium text-gray-900">
                        {client.nom_client}
                      </span>
                      <span className="text-gray-600 text-sm">
                        {client.adresse}
                      </span>
                      {client.contact_email && (
                        <span className="text-gray-600 text-sm">
                          {client.contact_email}
                        </span>
                      )}
                      {client.telephone && (
                        <span className="text-gray-600 text-sm">
                          {client.telephone}
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2 ml-auto">
                      <button
                        onClick={() => handleEditClientClick(client)}
                        className="p-2 rounded-full bg-yellow-500 text-white hover:bg-yellow-600 transition duration-300"
                        title="Modifier le client"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.827-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteClientClick(client.id)}
                        className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition duration-300"
                        title="Supprimer le client"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm3 3a1 1 0 00-1 1v3a1 1 0 102 0v-3a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
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
          <h3 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-3">
            Gestion des Types d'Activité
          </h3>
          {/* Formulaire d'ajout/modification de type d'activité */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingActivityTypeId) {
                handleSaveActivityTypeEdit();
              } else {
                handleAddActivityTypeClick();
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 border rounded-lg bg-purple-50"
          >
            <div>
              <label
                htmlFor="activityTypeName"
                className="block text-sm font-medium text-gray-700"
              >
                Nom du type d'activité
              </label>
              <input
                type="text"
                id="activityTypeName"
                value={
                  editingActivityTypeId
                    ? editingActivityTypeName
                    : newActivityTypeName
                }
                onChange={(e) =>
                  editingActivityTypeId
                    ? setEditingActivityTypeName(e.target.value)
                    : setNewActivityTypeName(e.target.value)
                }
                placeholder="Ex: Projet, Absence, Formation"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>
            <div className="flex items-end space-x-2 col-span-1 md:col-span-2">
              <button
                type="submit"
                className="w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition duration-300"
              >
                {editingActivityTypeId ? "Modifier le type" : "Ajouter un type"}
              </button>
              {editingActivityTypeId && (
                <button
                  type="button"
                  onClick={handleCancelActivityTypeEdit}
                  className="w-full px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>

          {/* Liste des types d'activité existants */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">
              Types d'activité existants :
            </h4>
            {Array.isArray(activityTypeDefinitions) &&
            activityTypeDefinitions.length > 0 ? (
              <ul className="space-y-2">
                {activityTypeDefinitions.map((activityType) => (
                  <li
                    key={activityType.id}
                    className="flex justify-between items-center p-3 border-b border-gray-100 last:border-b-0 bg-white rounded-md shadow-sm"
                  >
                    <span className="font-medium text-gray-900">
                      {activityType.name}
                    </span>
                    <div className="flex space-x-2 ml-auto">
                      <button
                        onClick={() =>
                          handleEditActivityTypeClick(activityType)
                        }
                        className="p-2 rounded-full bg-yellow-500 text-white hover:bg-yellow-600 transition duration-300"
                        title="Modifier le type d'activité"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.827-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteActivityTypeClick(activityType.id)
                        }
                        className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition duration-300"
                        title="Supprimer le type d'activité"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm3 3a1 1 0 00-1 1v3a1 1 0 102 0v-3a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500 py-4">
                Aucun type d'activité enregistré.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
