"use client";
import EditNdfDetailModal from "@/components/EditNdfDetailModal";
import DeleteNdfDetailButton from "@/components/DeleteNdfDetailButton";
import { useState, useMemo, useCallback } from "react";
import { Search, SlidersHorizontal, X, ArrowUp, ArrowDown } from "lucide-react"; // Importation des icônes
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Constantes pour les options de sélection
const NATURES = ["carburant", "parking", "peage", "repas", "achat divers"];
const TVAS = ["autre taux", "multi-taux", "0%", "5.5%", "10%", "20%"];

export default function NdfDetailTable({
  details: initialDetails,
  ndfStatut,
  month,
  year,
  name,
}) {
  // État local pour les détails (peut être mis à jour si les props changent, ou via les actions)
  const [details, setDetails] = useState(initialDetails);
  const [search, setSearch] = useState("");

  // États pour la modale de filtre
  const [filterModal, setFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState(""); // Champ de tri (date, tva, montant)
  const [sortDir, setSortDir] = useState("asc"); // Direction de tri (asc, desc)
  const [nature, setNature] = useState(""); // Filtre par nature
  const [tvaType, setTvaType] = useState(""); // Type de TVA sélectionné
  const [tvaOtherValue, setTvaOtherValue] = useState(""); // ← Corrigé !
  const [tvaMultiValue, setTvaMultiValue] = useState(""); // ← Corrigé !
  const [resetKey, setResetKey] = useState(0); // Clé pour forcer la réinitialisation des inputs

  // Fonction de rafraîchissement (rechargement de la page)
  const refresh = async () => window.location.reload();

  // Fonction pour l'export PDF
  const exportToPDF = async () => {
    const doc = new jsPDF();

    // Set PDF metadata
    doc.setProperties({
      title: `Note de frais - ${month || ""} ${year || ""} ${name || ""}`,
      subject: `Détails de la note de frais pour ${name || "Utilisateur"}`,
      author: name || "Application NDF",
      creator: "Next.js NDF App with jspdf",
      keywords: "note de frais, dépenses, rapport, PDF",
    });

    let titleText = "Note de frais";
    const subtitleParts = [];
    if (month) subtitleParts.push(month);
    if (year) subtitleParts.push(year);
    if (name) subtitleParts.push(name);
    if (subtitleParts.length > 0) {
      titleText += ` — ${subtitleParts.join(" — ")}`;
    }

    // Function to add header and footer to each page
    const addHeaderAndFooter = (pageNumber) => {
      // Header
      doc.setFontSize(10);
      doc.setTextColor(100); // Gray color
      doc.text(titleText, 14, 10); // Adjust Y position if needed

      // Footer
      doc.text(
        `Page ${pageNumber}`,
        doc.internal.pageSize.getWidth() - 30,
        doc.internal.pageSize.getHeight() - 10
      );
    };

    // Add header and footer to the first page
    addHeaderAndFooter(1);

    doc.setFontSize(20); // Larger font for main title
    doc.setTextColor(20, 20, 20); // Very dark gray for main title
    doc.text(titleText, 14, 25); // Main title position, slightly lower

    const head = [
      [
        "Date",
        "Nature",
        "Description",
        "TVA",
        "Montant HT",
        "Montant TTC",
        "Justificatif",
      ],
    ];

    const rows = filteredDetails.map((detail) => [
      detail.date_str,
      detail.nature,
      detail.description,
      detail.tva,
      `${parseFloat(detail.montant).toFixed(2)}€`, // Ensure 2 decimal places
      `${getTTC(detail.montant, detail.tva).toFixed(2)}€`, // Ensure 2 decimal places
      detail.img_url ? "Oui" : "Non",
    ]);

    autoTable(doc, {
      head,
      body: rows,
      startY: 40, // Start table below the main title
      margin: { left: 10, right: 10 },
      styles: {
        fontSize: 9,
        cellPadding: 2.5, // Slightly more padding
        valign: "middle",
        halign: "left",
        textColor: [50, 50, 50], // Dark gray text for body
        lineColor: [220, 220, 220], // Light gray borders
        lineWidth: 0.1, // Thin borders
      },
      headStyles: {
        fillColor: [30, 144, 255], // Dodger Blue - a bit more vibrant
        textColor: 255, // White
        fontStyle: "bold",
        halign: "center", // Center header text
        fontSize: 10,
        cellPadding: 3.5, // More padding for header
      },
      alternateRowStyles: {
        fillColor: [240, 248, 255], // AliceBlue - very light blue for alternate rows
      },
      columnStyles: {
        0: { halign: "left", cellWidth: 20 }, // Date
        1: { halign: "left", cellWidth: 25 }, // Nature
        // Description: Laissez autoTable calculer sa largeur. minCellWidth pour éviter qu'elle ne soit trop petite.
        2: { halign: "left", minCellWidth: 40, cellWidth: "auto" },
        3: { halign: "center", cellWidth: 20 }, // TVA
        4: { halign: "right", cellWidth: 25 }, // Montant HT
        5: { halign: "right", fontStyle: "bold", cellWidth: 25 }, // Montant TTC
        6: { halign: "center", cellWidth: 20 }, // Justificatif
      },
      didDrawPage: (data) => {
        // Add header and footer to subsequent pages
        if (data.pageNumber > 1) {
          addHeaderAndFooter(data.pageNumber);
        }
      },
    });

    // Totals table (styled for better visibility)
    autoTable(doc, {
      body: [
        [
          {
            content: "Total HT",
            colSpan: 5,
            styles: {
              halign: "right",
              fontStyle: "bold",
              fontSize: 11,
              textColor: [30, 30, 30],
            },
          },
          {
            content: `${totalHT.toFixed(2)}€`,
            styles: {
              fontStyle: "bold",
              halign: "left",
              fontSize: 11,
              textColor: [30, 30, 30],
            },
          },
          { content: "" }, // Placeholder for Justificatif column
        ],
        [
          {
            content: "Total TTC",
            colSpan: 5,
            styles: {
              halign: "right",
              fontStyle: "bold",
              fontSize: 11,
              textColor: [30, 30, 30],
            },
          },
          {
            content: `${totalTTC.toFixed(2)}€`,
            styles: {
              fontStyle: "bold",
              halign: "left",
              fontSize: 11,
              textColor: [30, 30, 30],
            },
          },
          { content: "" }, // Placeholder for Justificatif column
        ],
      ],
      theme: "plain",
      startY: doc.lastAutoTable.finalY + 8, // More space below the main table
      margin: { left: 10, right: 10 },
      styles: {
        fontSize: 10,
        cellPadding: 3,
        textColor: [0, 0, 0], // Black text for totals
      },
      columnStyles: {
        0: { halign: "right", fontStyle: "bold" }, // Total HT/TTC label
        1: { halign: "left", fontStyle: "bold" }, // Value
      },
    });

    // Function to convert image URL to Data URL
    async function toDataUrl(url) {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject; // Handle read errors
        reader.readAsDataURL(blob);
      });
    }

    // Add justifications on separate pages
    for (const detail of filteredDetails) {
      if (detail.img_url) {
        doc.addPage();
        addHeaderAndFooter(doc.internal.getNumberOfPages()); // Add header/footer to new page

        doc.setFontSize(18); // Larger title for justification page
        doc.setTextColor(20, 20, 20);
        doc.text(
          `Justificatif pour la dépense du ${detail.date_str} (${detail.nature})`,
          14,
          25
        );

        try {
          const dataUrl = await toDataUrl(detail.img_url);
          const imgProps = doc.getImageProperties(dataUrl);
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();

          // Calculate image dimensions to fit page with margins
          const margin = 20; // 20mm on each side
          let imgWidth = pageWidth - 2 * margin;
          let imgHeight = (imgProps.height * imgWidth) / imgProps.width;

          // If image height exceeds available page height, scale down by height
          const availableHeight = pageHeight - 2 * margin - 30; // 30mm for title and top margin
          if (imgHeight > availableHeight) {
            imgHeight = availableHeight;
            imgWidth = (imgProps.width * imgHeight) / imgProps.height;
          }

          doc.addImage(
            dataUrl,
            imgProps.fileType,
            margin,
            35,
            imgWidth,
            imgHeight
          ); // Adjust Y position
        } catch (e) {
          console.error("Error loading justification for PDF:", e);
          doc.setFontSize(12);
          doc.setTextColor(200, 0, 0); // Red color for error message
          doc.text(
            "Erreur lors du chargement du justificatif. Le fichier pourrait être manquant ou corrompu.",
            14,
            40
          ); // Adjust Y position
        }
      }
    }

    const fileName = `note-de-frais_${month || ""}_${year || ""}_${
      name ? name.replace(/\s+/g, "_") : ""
    }.pdf`;
    doc.save(fileName);
  };

  // Fonction pour calculer le montant TTC
  const getTTC = useCallback((montant, tvaStr) => {
    const base = parseFloat(montant) || 0;
    if (!tvaStr || tvaStr === "0%") return base;

    // Gérer les multi-taux
    const tauxList = tvaStr
      .split("/")
      .map((t) => parseFloat(t.replace(/[^\d.,]/g, "").replace(",", ".")))
      .filter((x) => !isNaN(x));

    if (tauxList.length === 0) return base;

    const totalTva = tauxList.reduce(
      (sum, taux) => sum + (base * taux) / 100,
      0
    );
    return base + totalTva;
  }, []);

  // Logique de filtrage et de tri (utilisant useMemo pour optimiser les performances)
  const filteredDetails = useMemo(() => {
    let currentFilteredDetails = details.filter((detail) => {
      const lower = search.toLowerCase();
      return (
        detail.date_str?.toLowerCase().includes(lower) ||
        detail.nature?.toLowerCase().includes(lower) ||
        detail.description?.toLowerCase().includes(lower) ||
        detail.tva?.toLowerCase().includes(lower) ||
        String(detail.montant).toLowerCase().includes(lower)
      );
    });

    if (nature) {
      currentFilteredDetails = currentFilteredDetails.filter(
        (d) => d.nature === nature
      );
    }

    if (tvaType) {
      if (tvaType === "autre taux" && tvaOtherValue) {
        currentFilteredDetails = currentFilteredDetails.filter((d) =>
          d.tva.replace(/\s/g, "").includes(tvaOtherValue.replace(/\s/g, ""))
        );
      } else if (tvaType === "multi-taux" && tvaMultiValue) {
        currentFilteredDetails = currentFilteredDetails.filter((d) =>
          d.tva.replace(/\s/g, "").includes(tvaMultiValue.replace(/\s/g, ""))
        );
      } else if (tvaType !== "autre taux" && tvaType !== "multi-taux") {
        // Pour les taux fixes (0%, 5.5%, etc.), on compare directement
        currentFilteredDetails = currentFilteredDetails.filter(
          (d) => d.tva === tvaType
        );
      }
    }

    if (sortBy) {
      currentFilteredDetails = [...currentFilteredDetails].sort((a, b) => {
        let valA, valB;
        if (sortBy === "date") {
          valA = new Date(a.date_str);
          valB = new Date(b.date_str);
        } else if (sortBy === "tva") {
          // Pour le tri par TVA, on prend le premier taux si multi-taux
          valA = parseFloat(
            a.tva
              .split("/")[0]
              ?.replace(/[^\d.,]/g, "")
              .replace(",", ".") || 0
          );
          valB = parseFloat(
            b.tva
              .split("/")[0]
              ?.replace(/[^\d.,]/g, "")
              .replace(",", ".") || 0
          );
        } else if (sortBy === "montant") {
          valA = parseFloat(a.montant);
          valB = parseFloat(b.montant);
        }
        return sortDir === "asc" ? valA - valB : valB - valA;
      });
    }
    return currentFilteredDetails;
  }, [
    details,
    search,
    nature,
    tvaType,
    tvaOtherValue,
    tvaMultiValue,
    sortBy,
    sortDir,
    getTTC,
  ]);

  // Calcul des totaux HT et TTC des détails filtrés
  const totalHT = useMemo(
    () =>
      filteredDetails.reduce((acc, d) => acc + (parseFloat(d.montant) || 0), 0),
    [filteredDetails]
  );
  const totalTTC = useMemo(
    () => filteredDetails.reduce((acc, d) => acc + getTTC(d.montant, d.tva), 0),
    [filteredDetails, getTTC]
  );

  // Fonction de réinitialisation des filtres
  function resetFilters() {
    setNature("");
    setTvaType("");
    setTvaOtherValue("");
    setTvaMultiValue("");
    setSortBy("");
    setSortDir("asc");
    setResetKey((prev) => prev + 1); // Incrémenter pour réinitialiser les inputs contrôlés
    setFilterModal(false); // Fermer la modale après réinitialisation
  }

  // Message si aucun détail n'est présent initialement
  if (!initialDetails?.length) {
    return (
      <p className="text-center text-gray-600 py-8">
        Aucun détail pour cette note de frais.
      </p>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg my-8 mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center mb-6 gap-3">
        <div className="relative flex-grow">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-900"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-200 flex items-center gap-2"
          onClick={() => setFilterModal(true)}
          title="Filtres avancés"
        >
          <SlidersHorizontal size={18} /> Filtres avancés
        </button>
      </div>

      {filterModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md relative transform transition-all scale-100 opacity-100 duration-300 ease-out">
            <button
              onClick={() => setFilterModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              title="Fermer"
            >
              <X size={24} />
            </button>
            <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
              Filtres avancés
            </h3>

            <div className="mb-6">
              <div className="font-semibold text-gray-700 mb-2">
                Trier par :
              </div>
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  className={`px-4 py-2 rounded-full transition-colors duration-200 flex items-center gap-1 ${
                    sortBy === "date"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                  onClick={() => setSortBy("date")}
                  type="button"
                >
                  Date
                </button>
                <button
                  className={`px-4 py-2 rounded-full transition-colors duration-200 flex items-center gap-1 ${
                    sortBy === "tva"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                  onClick={() => setSortBy("tva")}
                  type="button"
                >
                  TVA
                </button>
                <button
                  className={`px-4 py-2 rounded-full transition-colors duration-200 flex items-center gap-1 ${
                    sortBy === "montant"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                  onClick={() => setSortBy("montant")}
                  type="button"
                >
                  Montant HT
                </button>
              </div>
              {sortBy && (
                <div className="mt-2 flex gap-3">
                  <button
                    className={`px-4 py-2 rounded-full transition-colors duration-200 flex items-center gap-1 ${
                      sortDir === "asc"
                        ? "bg-green-600 text-white shadow-md"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    onClick={() => setSortDir("asc")}
                    type="button"
                  >
                    <ArrowUp size={16} /> Croissant
                  </button>
                  <button
                    className={`px-4 py-2 rounded-full transition-colors duration-200 flex items-center gap-1 ${
                      sortDir === "desc"
                        ? "bg-red-600 text-white shadow-md"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    onClick={() => setSortDir("desc")}
                    type="button"
                  >
                    <ArrowDown size={16} /> Décroissant
                  </button>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="nature-select"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nature :
              </label>
              <select
                id="nature-select"
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={nature}
                onChange={(e) => setNature(e.target.value)}
              >
                <option value="">Toutes</option>
                {NATURES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label
                htmlFor="tva-type-select"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Filtrer par TVA :
              </label>
              <select
                id="tva-type-select"
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={tvaType}
                onChange={(e) => {
                  setTvaType(e.target.value);
                  setTvaOtherValue("");
                  setTvaMultiValue("");
                }}
              >
                <option value="">Tous taux</option>
                {TVAS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {tvaType === "autre taux" && (
                <input
                  key={resetKey + "autre"} // Utiliser resetKey pour forcer la réinitialisation
                  type="text"
                  className="mt-3 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Précisez le taux (ex: 8.5)"
                  value={tvaOtherValue}
                  onChange={(e) => setTvaOtherValue(e.target.value)}
                />
              )}
              {tvaType === "multi-taux" && (
                <input
                  key={resetKey + "multi"} // Utiliser resetKey pour forcer la réinitialisation
                  type="text"
                  className="mt-3 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Précisez les taux (ex: 10/12)"
                  value={tvaMultiValue}
                  onChange={(e) => setTvaMultiValue(e.target.value)}
                />
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={resetFilters}
                className="px-5 py-2 bg-gray-200 text-gray-700 font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors duration-200"
              >
                Réinitialiser
              </button>
              <button
                type="button"
                onClick={() => setFilterModal(false)}
                className="px-5 py-2 bg-indigo-600 text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredDetails.length === 0 && search && (
        <p className="text-center text-gray-600 py-6">
          Aucun résultat pour votre recherche et vos filtres.
        </p>
      )}
      {filteredDetails.length === 0 && !search && (
        <p className="text-center text-gray-600 py-6">
          Aucun détail pour cette note de frais.
        </p>
      )}

      {filteredDetails.length > 0 && (
        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Nature
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Description
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  TVA
                </th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Montant HT
                </th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Montant TTC
                </th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Justificatif
                </th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredDetails.map((detail) => {
                const montantTTC = getTTC(detail.montant, detail.tva);
                return (
                  <tr
                    key={detail.uuid}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-800">
                      {detail.date_str}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-800">
                      {detail.nature}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-800 max-w-xs overflow-hidden text-ellipsis">
                      {detail.description}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-800">
                      {detail.tva}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right text-sm text-gray-800">
                      {parseFloat(detail.montant).toFixed(2)}€
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                      {montantTTC.toFixed(2)}€
                    </td>
                    <td className="py-3 px-4 text-center">
                      {detail.img_url ? (
                        <a
                          href={detail.img_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block"
                        >
                          <img
                            src={detail.img_url}
                            alt="Justificatif"
                            className="max-w-[80px] max-h-[60px] object-contain rounded-md shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
                          />
                        </a>
                      ) : (
                        <span className="text-gray-400 italic text-xs">
                          Aucun
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {ndfStatut === "Provisoire" && (
                        <div className="flex justify-center gap-2">
                          <EditNdfDetailModal
                            detail={detail}
                            onEdited={refresh}
                          />
                          <DeleteNdfDetailButton
                            detailId={detail.uuid}
                            onDeleted={refresh}
                          />
                        </div>
                      )}
                      {ndfStatut !== "Provisoire" && (
                        <span className="text-gray-500 text-xs italic">
                          Non modifiable
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-100 border-t-2 border-gray-300">
              <tr>
                <td
                  colSpan={5}
                  className="py-3 px-4 text-right text-base font-bold text-gray-900"
                >
                  Total HT
                </td>
                <td
                  colSpan={3}
                  className="py-3 px-4 text-left text-base font-bold text-gray-900"
                >
                  {totalHT.toFixed(2)}€
                </td>
              </tr>
              <tr>
                <td
                  colSpan={5}
                  className="py-3 px-4 text-right text-base font-bold text-gray-900"
                >
                  Total TTC
                </td>
                <td
                  colSpan={3}
                  className="py-3 px-4 text-left text-base font-bold text-gray-900"
                >
                  {totalTTC.toFixed(2)}€
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="mt-8 text-center">
        <button
          onClick={exportToPDF}
          disabled={ndfStatut === "Provisoire"}
          title={
            ndfStatut === "Provisoire"
              ? "Impossible d'exporter une note de frais au statut Provisoire."
              : "Exporter le tableau en PDF"
          }
          className={`inline-flex items-center px-8 py-3 rounded-lg font-semibold transition-colors duration-200 shadow-md
                        ${
                          ndfStatut === "Provisoire"
                            ? "bg-gray-300 text-gray-600 cursor-not-allowed opacity-75"
                            : "bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-3"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          Exporter le tableau en PDF
        </button>
        {ndfStatut === "Provisoire" && (
          <p className="text-sm text-gray-500 mt-2 italic">
            Le statut doit être autre que Provisoire pour permettre l’export
            PDF.
          </p>
        )}
      </div>
    </div>
  );
}
