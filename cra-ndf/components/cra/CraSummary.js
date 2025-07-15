// components/cra/CraSummary.js
import React from "react";

export default function CraSummary({
  totalWorkingDaysInMonth,
  totalActivitiesTimeInMonth,
  timeDifference,
}) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow-inner mb-6 flex flex-col sm:flex-row justify-around text-center">
      <p className="text-gray-700 font-medium">
        Jours ouvrés dans le mois:{" "}
        <span className="font-bold">{totalWorkingDaysInMonth}</span>
      </p>
      <p className="text-gray-700 font-medium">
        Temps total déclaré (jours):{" "}
        <span className="font-bold">
          {totalActivitiesTimeInMonth.toFixed(2)}
        </span>
      </p>
      <p className="text-gray-700 font-medium">
        Écart:{" "}
        <span
          className={`font-bold ${
            parseFloat(timeDifference) < 0 ? "text-red-500" : "text-green-600"
          }`}
        >
          {timeDifference}
        </span>
      </p>
    </div>
  );
}
