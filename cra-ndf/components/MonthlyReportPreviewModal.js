// components/MonthlyReportPreviewModal.js
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import MonthlyDetailedReport from "./MonthlyDetailedReport"; // Importez le rapport détaillé

export default function MonthlyReportPreviewModal({
  isOpen,
  onClose,
  reportData,
  year,
  month,
  userName,
  userId, // <-- AJOUTEZ userId ICI DANS LA DÉSTRUCTURATION DES PROPS
}) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  // Chargement des bibliothèques html2canvas et jspdf via CDN
  useEffect(() => {
    if (!isOpen) return; // Ne charge les scripts que si la modal est ouverte

    const loadScript = (src, id, callback) => {
      if (!document.getElementById(id)) {
        const script = document.createElement("script");
        script.src = src;
        script.id = id;
        script.onload = () => {
          console.log(`${id} loaded.`);
          callback();
        };
        script.onerror = () => {
          console.error(`Failed to load script: ${src}`);
        };
        document.head.appendChild(script);
      } else {
        console.log(`${id} already loaded.`);
        callback();
      }
    };

    let html2canvasLoaded = false;
    let jspdfLoaded = false;

    const checkAllLoaded = () => {
      if (html2canvasLoaded && jspdfLoaded) {
        setScriptsLoaded(true);
      }
    };

    // Utilisez des IDs uniques pour éviter les conflits si d'autres composants chargent les mêmes scripts
    loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
      "html2canvas-script-preview",
      () => {
        html2canvasLoaded = true;
        checkAllLoaded();
      }
    );
    loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "jspdf-script-preview",
      () => {
        jspdfLoaded = true;
        checkAllLoaded();
      }
    );
  }, [isOpen]); // Déclenche le chargement lorsque la modal s'ouvre

  // Fonction pour exporter le rapport en PDF
  const handleExportPdf = useCallback(async () => {
    if (
      !scriptsLoaded ||
      typeof window.html2canvas === "undefined" ||
      typeof window.jspdf === "undefined"
    ) {
      console.error("Bibliothèques html2canvas ou jspdf non chargées.");
      alert(
        "Veuillez patienter, les bibliothèques d'exportation PDF sont en cours de chargement. Réessayez dans un instant."
      );
      return;
    }

    setIsGeneratingPdf(true);
    // Cible le contenu du MonthlyDetailedReport à l'intérieur de cette modal
    const input = document.getElementById("monthly-report-content");

    if (!input) {
      console.error(
        "Élément 'monthly-report-content' non trouvé pour l'exportation PDF."
      );
      alert("Erreur: Impossible de trouver le contenu à exporter en PDF.");
      setIsGeneratingPdf(false);
      return;
    }

    try {
      const canvas = await window.html2canvas(input, {
        scale: 2, // Augmente la résolution pour une meilleure qualité
        useCORS: true, // Important si vous avez des images ou des polices externes
        // Ignorer les éléments qui ne sont pas nécessaires pour le PDF, comme les boutons d'action
        ignoreElements: (element) => {
          return element.classList.contains("no-pdf-export");
        },
        logging: true, // Pour le débogage
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new window.jspdf.jsPDF({
        orientation: "p", // 'p' pour portrait, 'l' pour landscape
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // Largeur A4 en mm (A4 portrait)
      const pageHeight = 297; // Hauteur A4 en mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const monthDate = new Date(year, month - 1, 1);
      pdf.save(
        `Rapport_Detaillé_CRA_${userName}_${format(monthDate, "yyyy_MM", {
          locale: fr,
        })}.pdf`
      );
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      alert(
        "Une erreur est survenue lors de la génération du PDF. Veuillez réessayer. Détails: " +
          error.message
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [year, month, userName, scriptsLoaded]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[95vh] flex flex-col relative">
        {/* Header de la modal */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <h2 className="text-xl font-bold text-gray-800">
            Prévisualisation du Rapport Détaillé (
            {format(new Date(year, month - 1, 1), "MMMM", { locale: fr })})
          </h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportPdf}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 flex items-center justify-center"
              disabled={isGeneratingPdf || !scriptsLoaded}
            >
              {isGeneratingPdf ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Génération...
                </>
              ) : (
                "Exporter en PDF"
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition duration-300"
              aria-label="Fermer la prévisualisation"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Corps de la modal (le rapport détaillé) */}
        <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
          <MonthlyDetailedReport
            reportData={reportData}
            userId={userId} // userId est maintenant correctement passé
            year={year}
            month={month}
            userName={userName}
          />
        </div>
      </div>
    </div>
  );
}
