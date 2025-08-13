"use client";

/**
 * CraSummary
 * ----------
 * Petit résumé en-tête avec un seul indicateur :
 * - Nombre de jours ouvrés du mois.
 *
 * Optimisations :
 * - Assainit l'entrée (force un nombre >= 0).
 * - Pluriel automatique ("jour" / "jours").
 * - React.memo avec comparateur : re-render uniquement si la valeur change.
 */

import React, { useMemo } from "react";

function CraSummaryBase({ totalWorkingDaysInMonth }) {
  // Assainit l'entrée (tolère string/float), fallback 0
  const workingDays = useMemo(() => {
    const n = Number(totalWorkingDaysInMonth);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [totalWorkingDaysInMonth]);

  const unit = workingDays > 1 ? "jours" : "jour";

  return (
    <section
      className="bg-gray-50 p-4 rounded-lg shadow-inner mb-6 flex flex-col sm:flex-row justify-center text-center"
      aria-label="Résumé CRA du mois"
    >
      <p className="text-gray-700 font-medium">
        Jours ouvrés dans le mois :{" "}
        <span className="font-bold">{workingDays}</span> {unit}
      </p>
    </section>
  );
}

// Re-render uniquement si la valeur change
const areEqual = (prev, next) =>
  prev.totalWorkingDaysInMonth === next.totalWorkingDaysInMonth;

export default React.memo(CraSummaryBase, areEqual);