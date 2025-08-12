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
        Jours ouvrés travaillés dans le mois:{" "}
        <span className="font-bold">{totalWorkingDaysInMonth}</span>
      </p>
     
    </div>
  );
}
