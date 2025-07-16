"use client";
import EditNdfDetailModal from "@/components/EditNdfDetailModal";
import DeleteNdfDetailButton from "@/components/DeleteNdfDetailButton";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, SlidersHorizontal, X, ArrowUp, ArrowDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const NATURES = ["carburant", "parking", "peage", "repas", "achat divers"];
const TVAS = ["autre taux", "multi-taux", "0%", "5.5%", "10%", "20%"];

function roundUpToCent(value) {
  return Math.ceil(value * 100) / 100;
}

export default function NdfDetailTable({
  details: initialDetails,
  ndfStatut,
  month,
  year,
  name,
}) {
  const [details, setDetails] = useState(initialDetails);
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState([]);

  // Filtres et états
  const [filterModal, setFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [nature, setNature] = useState("");
  const [tvaType, setTvaType] = useState("");
  const [tvaOtherValue, setTvaOtherValue] = useState("");
  const [tvaMultiValue, setTvaMultiValue] = useState("");
  const [resetKey, setResetKey] = useState(0);

  // Récupère la liste des clients au mount
  useEffect(() => {
    fetch("/api/client")
      .then((res) => res.json())
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

  // Récupérer le nom du client à partir de son id
  function getClientName(client_id) {
    if (!client_id) return "";
    const c = clients.find((c) => c.id === client_id);
    return c ? c.nom_client : "";
  }

  // Fonction de rafraîchissement
  const refresh = async () => window.location.reload();

  // Export PDF avec colonne Client EN FORMAT PAYSAGE
  const exportToPDF = async () => {
    const doc = new jsPDF({ orientation: "landscape" });

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

    const addHeaderAndFooter = (pageNumber) => {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(titleText, 14, 10);
      doc.text(
        `Page ${pageNumber}`,
        doc.internal.pageSize.getWidth() - 30,
        doc.internal.pageSize.getHeight() - 10
      );
    };

    addHeaderAndFooter(1);

    doc.setFontSize(20);
    doc.setTextColor(20, 20, 20);
    doc.text(titleText, 14, 25);

    // --- Ajout de la colonne Client dans le head
    const head = [
      [
        "Date",
        "Nature",
        "Description",
        "Client",
        "Montant HT",
        "TVA",
        "Montant TTC",
        "Justificatif",
      ],
    ];

    const rows = filteredDetails.map((detail) => [
      detail.date_str,
      detail.nature,
      detail.description,
      getClientName(detail.client_id),
      `${parseFloat(detail.montant).toFixed(2)}€`,
      detail.tva && detail.tva.includes("/")
        ? detail.tva
            .split("/")
            .map((t) => {
              const taux = parseFloat(t.replace(/[^\d.,]/g, "").replace(",", "."));
              const ht = parseFloat(detail.montant) || 0;
              if (!isNaN(taux)) {
                const tvaMontant = ht * taux / 100;
                return `${taux}% > +${tvaMontant.toFixed(2)}€`;
              }
              return null;
            })
            .filter(Boolean)
            .join('\n')
        : detail.tva,
      `${getTTCLineRounded(detail.montant, detail.tva).toFixed(2)}€`,
      detail.img_url ? "Oui" : "Non",
    ]);

    autoTable(doc, {
      head,
      body: rows,
      startY: 40,
      margin: { left: 10, right: 10 },
      styles: {
        fontSize: 9,
        cellPadding: 2.5,
        valign: "middle",
        halign: "left",
        textColor: [50, 50, 50],
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        overflow: 'linebreak',
        cellWidth: 'auto',
      },
      headStyles: {
        fillColor: [30, 144, 255],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        fontSize: 10,
        cellPadding: 3.5,
      },
      alternateRowStyles: {
        fillColor: [240, 248, 255],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 30 },   // Date
        1: { halign: "center", cellWidth: 30 },   // Nature
        2: { halign: "center", minCellWidth: 50, cellWidth: 55 }, // Description
        3: { halign: "center", cellWidth: 35 }, // Client
        4: { halign: "center", cellWidth: 28 },  // Montant HT
        5: { halign: "center", cellWidth: 32 }, // TVA
        6: { halign: "center", fontStyle: "bold", cellWidth: 28 }, // Montant TTC
        7: { halign: "center", cellWidth: 25 }, // Justificatif
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          addHeaderAndFooter(data.pageNumber);
        }
      },
    });

    autoTable(doc, {
      body: [
        [
          { content: "Total HT", colSpan: 6, styles: { halign: "left", fontStyle: "bold", fontSize: 10, textColor: [30, 30, 30] } },
          { content: `${totalHT.toFixed(2)}€`, styles: { fontStyle: "bold", halign: "left", fontSize: 11, textColor: [30, 30, 30] } },
          { content: "" },
        ],
        [
          { content: "Total TVA", colSpan: 6, styles: { halign: "left", fontStyle: "bold", fontSize: 10, textColor: [30, 30, 30] } },
          { content: `${totalTVA.toFixed(2)}€`, styles: { fontStyle: "bold", halign: "left", fontSize: 11, textColor: [30, 30, 30] } },
          { content: "" },
        ],
        [
          { content: "Total TTC", colSpan: 6, styles: { halign: "left", fontStyle: "bold", fontSize: 10, textColor: [30, 30, 30] } },
          { content: `${totalTTC.toFixed(2)}€`, styles: { fontStyle: "bold", halign: "left", fontSize: 11, textColor: [30, 30, 30] } },
          { content: "" },
        ],
        [
          { content: `Nombre total de lignes de note de frais : ${filteredDetails.length}`, colSpan: 8, styles: { halign: "center", fontSize: 10, textColor: [80, 80, 80], fontStyle: "italic" } },
        ],
      ],
      theme: "plain",
      startY: doc.lastAutoTable.finalY + 8,
      margin: { left: 10, right: 10 },
      styles: {
        fontSize: 10,
        cellPadding: 3,
        textColor: [0, 0, 0],
      },
      columnStyles: {
        0: { halign: "right", fontStyle: "bold" },
        1: { halign: "left", fontStyle: "bold" },
      },
    });

    async function toDataUrl(url) {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    for (const detail of filteredDetails) {
      if (detail.img_url) {
        doc.addPage();
        addHeaderAndFooter(doc.internal.getNumberOfPages());
        doc.setFontSize(18);
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

          const margin = 20;
          let imgWidth = pageWidth - 2 * margin;
          let imgHeight = (imgProps.height * imgWidth) / imgProps.width;

          const availableHeight = pageHeight - 2 * margin - 30;
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
          );
        } catch (e) {
          console.error("Error loading justification for PDF:", e);
          doc.setFontSize(12);
          doc.setTextColor(200, 0, 0);
          doc.text(
            "Erreur lors du chargement du justificatif. Le fichier pourrait être manquant ou corrompu.",
            14,
            40
          );
        }
      }
    }

    const fileName = `note-de-frais_${month || ""}_${year || ""}_${name ? name.replace(/\s+/g, "_") : ""}.pdf`;
    doc.save(fileName);
  };

  // Montant TTC ligne, arrondi au centime supérieur
  const getTTCLineRounded = useCallback((montant, tvaStr) => {
    const base = parseFloat(montant) || 0;
    if (!tvaStr || tvaStr === "0%") return base;
    const tauxList = tvaStr
      .split("/")
      .map((t) => parseFloat(t.replace(/[^\d.,]/g, "").replace(",", ".")))
      .filter((x) => !isNaN(x));
    if (tauxList.length === 0) return base;
    const totalTva = tauxList.reduce(
      (sum, taux) => sum + (base * taux) / 100,
      0
    );
    return roundUpToCent(base + totalTva);
  }, []);

  const filteredDetails = useMemo(() => {
    let currentFilteredDetails = details.filter((detail) => {
      const lower = search.toLowerCase();
      return (
        detail.date_str?.toLowerCase().includes(lower) ||
        detail.nature?.toLowerCase().includes(lower) ||
        detail.description?.toLowerCase().includes(lower) ||
        getClientName(detail.client_id)?.toLowerCase().includes(lower) ||
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
    getTTCLineRounded,
    clients,
  ]);

  const totalHT = useMemo(
    () =>
      filteredDetails.reduce((acc, d) => acc + (parseFloat(d.montant) || 0), 0),
    [filteredDetails]
  );
  const totalTTC = useMemo(
    () => filteredDetails.reduce((acc, d) => acc + getTTCLineRounded(d.montant, d.tva), 0),
    [filteredDetails, getTTCLineRounded]
  );

  function resetFilters() {
    setNature("");
    setTvaType("");
    setTvaOtherValue("");
    setTvaMultiValue("");
    setSortBy("");
    setSortDir("asc");
    setResetKey((prev) => prev + 1);
    setFilterModal(false);
  }

  if (!initialDetails?.length) {
    return (
      <p className="text-center text-gray-600 py-8">
        Aucun détail pour cette note de frais.
      </p>
    );
  }

  const totalTVA = useMemo(() => {
    return filteredDetails.reduce((acc, d) => {
      const base = parseFloat(d.montant) || 0;
      if (!d.tva || d.tva === "0%") return acc;
      const tauxList = d.tva
        .split("/")
        .map((t) => parseFloat(t.replace(/[^\d.,]/g, "").replace(",", ".")))
        .filter((x) => !isNaN(x));
      if (tauxList.length === 0) return acc;
      const tva = tauxList.reduce((sum, taux) => sum + (base * taux) / 100, 0);
      const result = Math.ceil(tva * 100) / 100;
      return acc + result;
    }, 0);
  }, [filteredDetails]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg my-8 mx-auto max-w-6xl">
      {/* ... Barre de recherche et filtres inchangés ... */}

      {filteredDetails.length > 0 && (
        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Nature
                </th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Description
                </th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Client
                </th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Montant HT
                </th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  TVA
                </th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
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
                const montantTTC = getTTCLineRounded(detail.montant, detail.tva);
                return (
                  <tr key={detail.uuid} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="py-3 px-3 whitespace-nowrap text-sm text-gray-800 text-center">
                      {detail.date_str}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-sm text-gray-800">
                      {detail.nature}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-800 max-w-xs overflow-hidden text-ellipsis">
                      {detail.description}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-sm text-gray-800 text-center">
                      {getClientName(detail.client_id) || <span className="italic text-gray-400">-</span>}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-center text-sm text-gray-800 text-center">
                      {parseFloat(detail.montant).toFixed(2)}€
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-sm text-gray-800 text-center">
                      {detail.tva && detail.tva.includes("/") ? (
                        <div>
                          {detail.tva.split("/").map((t, idx) => {
                            const taux = parseFloat(t.replace(/[^\d.,]/g, "").replace(",", "."));
                            const ht = parseFloat(detail.montant) || 0;
                            if (!isNaN(taux)) {
                              const tvaMontant = ht * taux / 100;
                              return (
                                <div key={idx} className="flex items-center gap-1">
                                  <span className="font-semibold">{taux}%</span>
                                  <span className="text-gray-500">⇒ +{tvaMontant.toFixed(2)}€</span>
                                </div>
                              );
                            } else {
                              return null;
                            }
                          })}
                        </div>
                      ) : (
                        <span>{detail.tva}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                      {montantTTC.toFixed(2)}€
                    </td>
                    <td className="py-3 px-3 text-center">
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
                    <td className="py-3 px-3 text-center whitespace-nowrap">
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
                <td colSpan={2} className="py-3 px-4 text-left text-base font-bold text-gray-900">
                  Total HT
                </td>
                <td colSpan={7} className="py-3 px-4 text-left text-base font-bold text-gray-900">
                  {totalHT.toFixed(2)}€
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="py-3 px-4 text-left text-base font-semibold text-gray-900">
                  Total TVA
                </td>
                <td colSpan={7} className="py-3 px-4 text-left text-base font-semibold text-gray-900">
                  {totalTVA.toFixed(2)}€
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="py-3 px-4 text-left text-base font-bold text-gray-900">
                  Total TTC
                </td>
                <td colSpan={7} className="py-3 px-4 text-left text-base font-bold text-gray-900">
                  {totalTTC.toFixed(2)}€
                </td>
              </tr>
              <tr>
                <td colSpan={9} className="py-2 px-4 text-center text-sm text-gray-700 font-medium">
                  Nombre total de lignes de note de frais : {filteredDetails.length}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ... Le bouton export PDF et message de statut inchangés ... */}
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
                        ${ndfStatut === "Provisoire"
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
