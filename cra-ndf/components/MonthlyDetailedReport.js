// components/MonthlyDetailedReport.js
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
} from "date-fns";
import { fr } from "date-fns/locale";

// Mappage des jours de la semaine pour les initiales (0=Dimanche, 1=Lundi, ...)
const dayInitials = ["D", "L", "M", "M", "J", "V", "S"];

// Liste des jours fériés (À PERSONNALISER SELON VOS BESOINS)
// Exemple pour 2025 :
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
  userId,
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
      if (activity.date_activite && isValid(activity.date_activite)) {
        const dateKey = format(activity.date_activite, "yyyy-MM-dd");
        const activityTypeName =
          activity.activity_type_name_full ||
          activity.type_activite ||
          "Type Inconnu";
        const timeSpent = parseFloat(activity.temps_passe) || 0;

        uniqueActivityTypes.add(activityTypeName);

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
  const [signatureImage, setSignatureImage] = useState(null); // Stocke l'image base64 de la signature

  // Fonction utilitaire pour obtenir les coordonnées de l'événement (souris ou toucher)
  const getEventCoords = (event, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (event.touches && event.touches.length > 0) {
      // Pour les événements tactiles
      return {
        offsetX: event.touches[0].clientX - rect.left,
        offsetY: event.touches[0].clientY - rect.top,
      };
    }
    // Pour les événements de souris
    return {
      offsetX: event.nativeEvent.offsetX, // Utilisez nativeEvent pour offsetX/offsetY dans React
      offsetY: event.nativeEvent.offsetY,
    };
  };

  // Démarre le dessin
  const startDrawing = (event) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { offsetX, offsetY } = getEventCoords(event, canvas);
    ctx.beginPath(); // Commence un nouveau chemin
    ctx.moveTo(offsetX, offsetY); // Déplace le point de départ
  };

  // Dessine au fur et à mesure que la souris/le doigt bouge
  const draw = (event) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { offsetX, offsetY } = getEventCoords(event, canvas);
    ctx.lineTo(offsetX, offsetY); // Dessine une ligne jusqu'au point actuel
    ctx.stroke(); // Applique le tracé
  };

  // Arrête le dessin et sauvegarde la signature
  const endDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      // Sauvegarde la signature en tant qu'image base64 lorsque le dessin est terminé
      setSignatureImage(canvas.toDataURL("image/png"));
    }
  };

  // Efface la signature du canvas
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Efface tout le canvas
      setSignatureImage(null); // Efface l'image sauvegardée
    }
  };

  // Initialisation du contexte du canvas et de ses propriétés
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.lineWidth = 2; // Épaisseur du trait
      ctx.lineCap = "round"; // Extrémités arrondies
      ctx.strokeStyle = "#000"; // Couleur du trait (noir)
    }
  }, []);

  // Rend le canvas réactif et redessine la signature si nécessaire
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setCanvasDimensions = () => {
      const parent = canvas.parentElement;
      if (parent) {
        // Obtenir le Device Pixel Ratio pour une meilleure qualité sur les écrans Retina
        const dpr = window.devicePixelRatio || 1;
        const rect = parent.getBoundingClientRect();

        // Définir les dimensions réelles du canvas en fonction du DPR
        canvas.width = rect.width * dpr;
        canvas.height = 150 * dpr; // Hauteur fixe pour le pad de signature

        // Définir les dimensions CSS pour l'affichage (sans DPR)
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `150px`;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height); // EFFACER LE CANVAS AVANT DE REDESSINER
        ctx.scale(dpr, dpr); // Appliquer le scale pour le DPR
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#000";

        // Redessiner la signature si elle existe après un redimensionnement
        if (signatureImage) {
          const img = new Image();
          img.onload = () => {
            // Dessine l'image sur le canvas après l'avoir effacé
            ctx.drawImage(img, 0, 0, rect.width, 150); // Redessine l'image à la taille CSS
          };
          img.src = signatureImage;
        }
      }
    };

    setCanvasDimensions(); // Définir les dimensions initiales
    window.addEventListener("resize", setCanvasDimensions); // Écouteur pour le redimensionnement

    return () => window.removeEventListener("resize", setCanvasDimensions); // Nettoyage de l'écouteur
  }, [signatureImage]); // Dépend de signatureImage pour redessiner après resize si une signature est présente

  // Fonction pour vérifier si un jour est un jour férié
  const isPublicHoliday = useCallback((date) => {
    return publicHolidays.some((holiday) => isSameDay(date, holiday));
  }, []);

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl max-w-5xl mx-auto my-8 print:shadow-none print:my-0 print:p-0">
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
                  className="sticky left-0 bg-gray-50 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:bg-white print:text-sm"
                  style={{ minWidth: "80px" }}
                >
                  Jour
                </th>
                {allActivityTypes.map((type) => (
                  <th
                    key={type}
                    className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider print:text-sm"
                  >
                    {type}
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
                      className={`sticky left-0 px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-medium print:text-xs ${
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
                    {allActivityTypes.map((type) => {
                      const time = dailyActivityData[dateKey]?.[type] || 0;
                      dailyTotal += time; // Accumuler le total journalier
                      // NOUVEAU : Vérifier si c'est une heure sup ou un "Type Inconnu" qui est considéré comme heure sup
                      const isOvertime =
                        (type === "Heure supplémentaire" ||
                          type === "Type Inconnu") &&
                        time > 0;

                      return (
                        <td
                          key={`${dateKey}-${type}`}
                          className={`px-2 py-2 whitespace-nowrap text-center text-sm text-gray-800 print:text-xs ${
                            isOvertime
                              ? "bg-purple-100 font-semibold print:bg-purple-50"
                              : ""
                          }`} // Couleur pour les heures sup
                        >
                          {time > 0 ? time.toFixed(2) : ""}{" "}
                          {/* Affiche vide si 0 */}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900 font-bold print:text-xs">
                      {dailyTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {/* Ligne Total par Type d'Activité */}
              <tr className="bg-gray-200 font-bold print:bg-gray-100">
                <td className="sticky left-0 bg-gray-200 px-4 py-2 whitespace-nowrap text-sm text-gray-900 print:bg-gray-100 print:text-xs">
                  Total Type
                </td>
                {allActivityTypes.map((type) => (
                  <td
                    key={`total-type-${type}`}
                    className="px-2 py-2 whitespace-nowrap text-center text-sm text-gray-900 print:text-xs"
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

      {/* Section Signature Électronique */}
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
          {/* ANCIENNE BALISE IMG SUPPRIMÉE POUR ÉVITER LA SIGNATURE EN DOUBLE */}
        </div>
        <div className="flex justify-center mt-4 space-x-4 print:hidden">
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
            {/* L'image est maintenant dessinée sur le canvas, pas via cette balise img */}
            <img
              src={signatureImage}
              alt="Signature pour impression"
              className="mx-auto max-w-full h-auto"
              style={{ maxWidth: "200px", maxHeight: "100px" }}
            />
          </div>
        )}
      </div>

      <div className="mt-10 text-center print:hidden">
        <button
          onClick={() => window.print()}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
        >
          Imprimer / Télécharger en PDF
        </button>
      </div>
    </div>
  );
}
