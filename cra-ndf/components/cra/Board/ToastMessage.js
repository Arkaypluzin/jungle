"use client";

/**
 * ToastMessage
 * -------------
 * Petit toast auto-disparu avec animation.
 *
 * ✅ Optimisations:
 * - React.memo + comparateur: re-render seulement si props visibles changent.
 * - Timer fiable via useRef (pas de recréation inutile, cleanup systématique).
 * - Classes calculées via useMemo.
 * - Évite de capter les clics quand caché (pointer-events-none).
 *
 * ✅ Accessibilité:
 * - role dynamique: "alert" pour error, sinon "status".
 * - aria-live ajusté (assertive pour error, sinon polite).
 * - aria-atomic pour lire l’ensemble.
 * - Fermeture au clavier (Esc / Enter).
 * - Respect du “reduced motion” (Tailwind variant).
 */

import React, { useEffect, useMemo, useRef, useCallback } from "react";

function ToastMessageBase({
  message = "",
  type = "info",        // "success" | "error" | "warning" | "info"
  isVisible = false,
  onClose = () => { },
  duration = 3000,      // ms ; si <= 0, pas d’auto-fermeture
}) {
  const timerRef = useRef(null);

  // Palette par type (useMemo pour stabilité)
  const toastBgClass = useMemo(() => {
    switch (type) {
      case "success":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      case "warning":
        return "bg-yellow-500";
      case "info":
        return "bg-blue-500";
      default:
        return "bg-gray-700";
    }
  }, [type]);

  // Animation entrée/sortie (slide + fade)
  const transitionClass = useMemo(
    () => (isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"),
    [isVisible]
  );

  // Rôle / ARIA
  const role = type === "error" ? "alert" : "status";
  const ariaLive = type === "error" ? "assertive" : "polite";

  // Auto-fermeture
  useEffect(() => {
    // Nettoyer le timer courant
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Programmer un nouveau timer si visible + durée valide
    if (isVisible && duration > 0) {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        onClose?.();
      }, duration);
    }
    // Cleanup on unmount / changement de deps
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isVisible, duration, onClose]);

  // Fermeture par clic
  const handleClick = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // Fermeture au clavier (Esc / Enter)
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        onClose?.();
      }
    },
    [onClose]
  );

  // Désactiver les interactions quand masqué pour éviter de "bloquer" la page
  const pointerClass = isVisible ? "pointer-events-auto" : "pointer-events-none";

  return (
    <div
      className={[
        "fixed top-4 left-1/2 -translate-x-1/2 z-50",
        "px-4 py-3 rounded-lg shadow-lg text-white font-semibold",
        "transform transition-all duration-500 motion-reduce:transition-none",
        toastBgClass,
        transitionClass,
        pointerClass,
      ].join(" ")}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={role}
      aria-live={ariaLive}
      aria-atomic="true"
      tabIndex={isVisible ? 0 : -1} // focusable uniquement quand visible
    >
      {message}
    </div>
  );
}

// Re-render seulement si ces props changent réellement
const areEqual = (prev, next) =>
  prev.message === next.message &&
  prev.type === next.type &&
  prev.isVisible === next.isVisible &&
  prev.duration === next.duration &&
  prev.onClose === next.onClose;

export default React.memo(ToastMessageBase, areEqual);