// components/MonthlyDetailedReport.js
"use client"; // Assurez-vous que c'est un Client Component

import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  format,
  isValid,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  getDay,
  isWeekend,
  isSameDay,
  parseISO, // <-- AJOUTEZ parseISO ICI
} from "date-fns";
import { fr } from "date-fns/locale";

// Mappage des jours de la semaine pour les initiales (0=Dimanche, 1=Lundi, ...)
const dayInitials = ["D", "L", "M", "M", "J", "V", "S"];

// Liste des jours fériés (À PERSONNALISER SELON VOS BESOINS)
// Exemple pour 2025 (simulé sans API externe) :
const publicHolidays = [
  new Date(2025, 0, 1), // 1er janvier
  new Date(2025, 3, 21), // Lundi de Pâques (à adapter chaque année)
  new Date(2025, 4, 1), // 1er mai
  new Date(2025, 4, 8), // 8 mai
  new Date(2025, 4, 29), // Ascension (à adapter chaque année)
  new Date(2025, 5, 9), // Lundi de Pentecôte (à adapter chaque année)
  new Date(2025, 6, 14), // 14 juillet
  new Date(2025, 7, 15), // 15 août
  new Date(2025, 10, 1), // 1er novembre
  new Date(2025, 10, 11), // 11 novembre
  new Date(2025, 11, 25), // 25 décembre
];

export default function MonthlyDetailedReport({
  reportData,
  userId, // Gardé au cas où il serait utilisé pour des logiques internes
  year,
  month,
  userName,
}) {
  const monthDate = new Date(year, month - 1, 1); // Date de référence pour le mois

  const {
    allDaysInMonth,
    allActivityTypes,
    dailyActivityData,
    grandTotalDays,
    activityTypeTotals,
  } = useMemo(() => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const daysInMonth = eachDayOfInterval({ start, end });

    const uniqueActivityTypes = new Set();
    const dailyData = {}; // Structure: { 'YYYY-MM-DD': { 'Type A': time, 'Type B': time, ... }, ... }
    const typeTotals = {}; // Structure: { 'Type A': totalTime, 'Type B': totalTime, ... }
    let totalOverall = 0;

    // Initialisation des structures
    daysInMonth.forEach((day) => {
      dailyData[format(day, "yyyy-MM-dd")] = {};
    });

    reportData.forEach((activity) => {
      // Assurez-vous que activity.date_activite est un objet Date valide
      // Il est plus sûr de toujours parser, même si le parent a déjà formaté.
      const activityDate = isValid(activity.date_activite)
        ? activity.date_activite // Si c'est déjà un objet Date valide
        : parseISO(activity.date_activite); // Sinon, parsez-le depuis la chaîne ISO

      if (isValid(activityDate)) {
        const dateKey = format(activityDate, "yyyy-MM-dd");
        // Utilisation du nom du type d'activité déjà populé par CraBoard
        let activityTypeName = activity.activity_type_name_full;

        // La reclassification "Type Inconnu" en "Heure supplémentaire" devrait être gérée
        // en amont si elle est spécifique à la logique métier. Ici, nous nous attendons
        // à recevoir le nom correct. Si activityTypeName est vide, on peut fallback.
        if (!activityTypeName || activityTypeName === "Type Inconnu") {
          // Fallback si le nom n'est pas fourni ou est "Type Inconnu"
          activityTypeName = "Activité non classée"; // Ou un autre nom par défaut plus générique
        }

        const timeSpent = parseFloat(activity.temps_passe) || 0;

        uniqueActivityTypes.add(activityTypeName); // S'assure que seul le nom reclassé est ajouté

        // Ajouter le temps à la structure journalière
        if (!dailyData[dateKey][activityTypeName]) {
          dailyData[dateKey][activityTypeName] = 0;
        }
        dailyData[dateKey][activityTypeName] += timeSpent;

        // Ajouter le temps aux totaux par type d'activité
        if (!typeTotals[activityTypeName]) {
          typeTotals[activityTypeName] = 0;
        }
        typeTotals[activityTypeName] += timeSpent;

        totalOverall += timeSpent;
      }
    });

    // Convertir les types d'activités uniques en tableau trié
    const sortedActivityTypes = Array.from(uniqueActivityTypes).sort();

    return {
      allDaysInMonth: daysInMonth,
      allActivityTypes: sortedActivityTypes,
      dailyActivityData: dailyData,
      grandTotalDays: totalOverall.toFixed(2),
      activityTypeTotals: typeTotals,
    };
  }, [reportData, monthDate]);

  // Logique pour la signature électronique
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureImage, setSignatureImage] = useState(null);

  const getEventCoords = (event, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (event.touches && event.touches.length > 0) {
      return {
        offsetX: event.touches[0].clientX - rect.left,
        offsetY: event.touches[0].clientY - rect.top,
      };
    }
    // Fallback for mouse events (event.nativeEvent.offsetX/Y might not be reliable on all elements)
    return {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
  };

  const startDrawing = (event) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { offsetX, offsetY } = getEventCoords(event, canvas);
    ctx.beginPath();
    ctx.moveTo(
      offsetX * (canvas.width / canvas.offsetWidth),
      offsetY * (canvas.height / canvas.offsetHeight)
    ); // Adjust for DPR
  };

  const draw = (event) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { offsetX, offsetY } = getEventCoords(event, canvas);
    ctx.lineTo(
      offsetX * (canvas.width / canvas.offsetWidth),
      offsetY * (canvas.height / canvas.offsetHeight)
    ); // Adjust for DPR
    ctx.stroke();
  };

  const endDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureImage(canvas.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureImage(null);
    }
  };

  // Initial setup for canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#000";
    }
  }, []);

  // Handle canvas dimensions and redraw on resize/signature change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setCanvasDimensions = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const dpr = window.devicePixelRatio || 1;
        const rect = parent.getBoundingClientRect();

        // Set internal canvas dimensions scaled by DPR for sharpness
        canvas.width = rect.width * dpr;
        canvas.height = 150 * dpr;

        // Set display size via CSS
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `150px`;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear before redrawing
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Apply scaling to context

        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#000";

        if (signatureImage) {
          const img = new Image();
          img.onload = () => {
            // Draw image at native resolution, scaled by dpr.
            // If original image was captured with dpr=2, it needs to be drawn at half size.
            // Simplified: Draw it to fit the CSS size.
            ctx.drawImage(img, 0, 0, rect.width, 150);
          };
          img.src = signatureImage;
        }
      }
    };

    setCanvasDimensions();
    window.addEventListener("resize", setCanvasDimensions);

    return () => window.removeEventListener("resize", setCanvasDimensions);
  }, [signatureImage]); // Depend on signatureImage to redraw when it changes

  // Fonction pour vérifier si un jour est un jour férié
  const isPublicHoliday = useCallback((date) => {
    return publicHolidays.some((holiday) => isSameDay(date, holiday));
  }, []);

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl max-w-5xl mx-auto my-8 print:shadow-none print:my-0 print:p-0">
      {/* Conteneur principal pour l'exportation PDF */}
      <div id="monthly-report-content">
        <div className="text-center mb-8 print:mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 print:text-2xl">
            Rapport d'activité Mensuel Détaillé
          </h1>
          <h2 className="text-xl text-gray-700 mb-1 print:text-lg">
            Pour {userName} - {format(monthDate, "MMMM", { locale: fr })}
          </h2>
          <p className="text-md text-gray-600 print:text-sm">
            Total général pour le mois : {grandTotalDays} jours
          </p>
        </div>

        {allActivityTypes.length === 0 ? (
          <p className="text-center text-gray-600 py-8">
            Aucune activité trouvée pour ce mois-ci.
          </p>
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg">
              <thead className="bg-gray-50 print:bg-white">
                <tr>
                  <th
                    className="sticky left-0 bg-gray-50 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:bg-white print:text-sm border-r border-gray-200"
                    style={{ minWidth: "80px" }}
                  >
                    Jour
                  </th>
                  {allActivityTypes.map((type, colIndex) => (
                    <th
                      key={type}
                      className={`px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider print:text-sm ${
                        colIndex < allActivityTypes.length - 1
                          ? "border-r border-gray-200"
                          : ""
                      }`}
                    >
                      {type} {/* Affiche le nom du type d'activité */}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:text-sm">
                    Total Jour
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 print:divide-gray-100">
                {allDaysInMonth.map((day, index) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  let dailyTotal = 0;
                  const isWeekendDay = isWeekend(day);
                  const isHoliday = isPublicHoliday(day);

                  // Déterminer la classe de la ligne
                  let rowClass = index % 2 === 0 ? "bg-white" : "bg-gray-50"; // Alterner les couleurs
                  if (isWeekendDay) {
                    rowClass = "bg-yellow-100 print:bg-yellow-50"; // Jaune pâle pour les week-ends
                  }
                  if (isHoliday) {
                    rowClass = "bg-red-100 print:bg-red-50"; // Rouge pâle pour les jours fériés
                  }

                  return (
                    <tr
                      key={dateKey}
                      className={`${rowClass} hover:bg-gray-100 print:hover:bg-white`}
                    >
                      <td
                        className={`sticky left-0 px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-medium print:text-xs border-r border-gray-200 ${
                          isWeekendDay || isHoliday
                            ? isWeekendDay
                              ? "bg-yellow-100 print:bg-yellow-50"
                              : "bg-red-100 print:bg-red-50"
                            : index % 2 === 0
                            ? "bg-white"
                            : "bg-gray-50"
                        }`}
                      >
                        {dayInitials[getDay(day)]} {format(day, "dd")}
                      </td>
                      {allActivityTypes.map((type, colIndex) => {
                        const time = dailyActivityData[dateKey]?.[type] || 0;
                        dailyTotal += time; // Accumuler le total journalier
                        // Vérifier si c'est une heure sup
                        const isOvertime =
                          type === "Heure supplémentaire" && time > 0;

                        return (
                          <td
                            key={`${dateKey}-${type}`}
                            className={`px-2 py-2 whitespace-nowrap text-center text-sm text-gray-800 print:text-xs ${
                              isOvertime
                                ? "bg-purple-100 font-semibold print:bg-purple-50"
                                : ""
                            } ${
                              colIndex < allActivityTypes.length - 1
                                ? "border-r border-gray-200"
                                : ""
                            }`}
                          >
                            {time > 0 ? time.toFixed(2) : ""}{" "}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900 font-bold print:text-xs">
                        {dailyTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-200 font-bold print:bg-gray-100">
                  <td className="sticky left-0 bg-gray-200 px-4 py-2 whitespace-nowrap text-sm text-gray-900 print:bg-gray-100 print:text-xs border-r border-gray-200">
                    Total Type
                  </td>
                  {allActivityTypes.map((type, colIndex) => (
                    <td
                      key={`total-type-${type}`}
                      className={`px-2 py-2 whitespace-nowrap text-center text-sm text-gray-900 print:text-xs ${
                        colIndex < allActivityTypes.length - 1
                          ? "border-r border-gray-200"
                          : ""
                      }`}
                    >
                      {(activityTypeTotals[type] || 0).toFixed(2)}
                    </td>
                  ))}
                  <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900 print:text-xs">
                    {grandTotalDays}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 text-right text-xl font-bold text-gray-800 border-t pt-4 print:mt-4 print:pt-2 print:text-lg">
          Total général pour le mois : {grandTotalDays} jours
        </div>

        <div className="mt-10 p-6 bg-gray-50 rounded-lg shadow-sm border border-gray-200 print:mt-6 print:p-0 print:bg-white print:border-none print:shadow-none">
          <h3 className="text-xl font-bold text-gray-700 mb-4 print:text-lg">
            Signature Électronique
          </h3>
          <div
            className="border border-gray-300 rounded-md bg-white overflow-hidden relative"
            style={{ height: "150px" }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={endDrawing}
              style={{ touchAction: "none" }}
            ></canvas>
          </div>
          <div className="flex justify-center mt-4 space-x-4 no-pdf-export">
            {" "}
            {/* no-pdf-export pour ne pas l'inclure dans le PDF */}
            <button
              onClick={clearSignature}
              className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition duration-300"
            >
              Effacer la signature
            </button>
          </div>
          {signatureImage && (
            <div className="hidden print:block mt-4 text-center">
              <h4 className="text-md font-semibold text-gray-700 mb-2">
                Signature :
              </h4>
              <img
                src={signatureImage}
                alt="Signature pour impression"
                className="mx-auto max-w-full h-auto"
                style={{ maxWidth: "200px", maxHeight: "100px" }}
              />
            </div>
          )}
        </div>
      </div>{" "}
      {/* Fin de #monthly-report-content */}
      {/* Le bouton d'exportation PDF est maintenant dans la modal parente */}
      {/* Le bouton d'impression original est supprimé ou commenté */}
      {/*
      <div className="mt-10 text-center print:hidden">
        <button
          onClick={() => window.print()}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
        >
          Imprimer / Télécharger en PDF
        </button>
      </div>
      */}
    </div>
  );
}
