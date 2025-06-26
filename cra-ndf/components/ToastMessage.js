// components/ToastMessage.js
import React, { useEffect, useCallback } from "react";

export default function ToastMessage({
  message,
  type,
  isVisible,
  onClose,
  duration = 3000,
}) {
  // Détermine la classe de fond en fonction du type de message
  const toastClass =
    {
      success: "bg-green-500",
      error: "bg-red-500",
      warning: "bg-yellow-500",
      info: "bg-blue-500",
    }[type] || "bg-gray-700"; // Classe par défaut si le type n'est pas reconnu

  // Détermine la classe de transition pour l'animation d'apparition/disparition
  const slideInClass = isVisible
    ? "translate-y-0 opacity-100"
    : "-translate-y-full opacity-0";

  // Effet pour masquer automatiquement le toast après une certaine durée
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose(); // Appelle la fonction onClose fournie par le parent pour masquer le toast
      }, duration);
      return () => clearTimeout(timer); // Nettoie le timer si le composant est démonté ou si isVisible change
    }
  }, [isVisible, duration, onClose]); // Dépendances de l'effet

  // Gère le clic sur le toast pour le fermer manuellement
  const handleClick = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 p-4 rounded-lg shadow-lg text-white font-semibold z-50 transform transition-all duration-500
        ${toastClass} ${slideInClass}
        cursor-pointer`} // Classes Tailwind pour le positionnement, le style et l'animation
      onClick={handleClick} // Gère le clic manuel
      aria-live="assertive" // Annonce aux lecteurs d'écran les changements dynamiques
      role="alert" // Indique que l'élément est une alerte
    >
      {message} {/* Affiche le message du toast */}
    </div>
  );
}
