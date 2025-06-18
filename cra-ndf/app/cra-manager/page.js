"use client";
import React, { useState, useEffect, useCallback } from "react";
import UnifiedManager from "../../components/UnifiedManager"; // Chemin d'importation ajusté

// Clés pour le stockage local
const LOCAL_STORAGE_ACTIVITY_KEY = "activityTypes";
const LOCAL_STORAGE_CLIENT_KEY = "clientTypes";

function CraManagerPage() {
  // Initialiser les états avec les données du localStorage
  const [activityTypes, setActivityTypes] = useState(() => {
    if (typeof window !== "undefined") {
      // Vérifie si window est défini (environnement client)
      const stored = localStorage.getItem(LOCAL_STORAGE_ACTIVITY_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return []; // Retourne un tableau vide pour le rendu côté serveur initial
  });

  const [clientTypes, setClientTypes] = useState(() => {
    if (typeof window !== "undefined") {
      // Vérifie si window est défini (environnement client)
      const stored = localStorage.getItem(LOCAL_STORAGE_CLIENT_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return []; // Retourne un tableau vide pour le rendu côté serveur initial
  });

  // Gère les changements de types d'activité et les persiste dans le localStorage
  const handleActivityTypesChange = useCallback((updatedActivityTypes) => {
    setActivityTypes(updatedActivityTypes);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        LOCAL_STORAGE_ACTIVITY_KEY,
        JSON.stringify(updatedActivityTypes)
      );
    }
  }, []);

  // Gère les changements de types de client et les persiste dans le localStorage
  const handleClientTypesChange = useCallback((updatedClientTypes) => {
    setClientTypes(updatedClientTypes);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        LOCAL_STORAGE_CLIENT_KEY,
        JSON.stringify(updatedClientTypes)
      );
    }
  }, []);

  // Le composant rend le UnifiedManager avec les props appropriées
  return React.createElement(UnifiedManager, {
    activityTypes: activityTypes,
    onActivityTypesChange: handleActivityTypesChange,
    clientTypes: clientTypes,
    onClientTypesChange: handleClientTypesChange,
  });
}

export default CraManagerPage;
