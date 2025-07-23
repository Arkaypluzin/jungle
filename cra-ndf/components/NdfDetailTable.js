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
  const [projets, setProjets] = useState([]);

  const [filterModal, setFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [nature, setNature] = useState("");
  const [tvaType, setTvaType] = useState("");
  const [tvaOtherValue, setTvaOtherValue] = useState("");
  const [tvaMultiValue, setTvaMultiValue] = useState("");
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    fetch("/api/client")
      .then((res) => res.json())
      .then(setClients)
      .catch(() => setClients([]));
    fetch("/api/projets")
      .then((res) => res.json())
      .then(setProjets)
      .catch(() => setProjets([]));
  }, []);

  function getClientName(client_id) {
    if (!client_id) return "";
    const c = clients.find((c) => c.id === client_id);
    return c ? c.nom_client : "";
  }

  function getProjetName(projet_id) {
    if (!projet_id) return "";
    const p = projets.find((p) => (p.id || p.uuid) === projet_id);
    return p ? p.nom : "";
  }

  const refresh = async () => window.location.reload();

  function formatTvaPdf(detail) {
    // Si multi-taux au format array [{taux, valeur_tva}], ou bien tva string contenant "/"
    let arr = Array.isArray(detail.tva)
      ? detail.tva
      : getTvaArray(detail.tva, detail.montant);

    if (!arr.length || arr.length === 1) {
      // Affiche le taux et la valeur éventuelle si calculée
      let tvaUnique = arr[0];
      if (tvaUnique && tvaUnique.taux !== undefined) {
        return `${tvaUnique.taux}%` +
          (tvaUnique.valeur_tva !== undefined && !isNaN(tvaUnique.valeur_tva)
            ? ` > +${parseFloat(tvaUnique.valeur_tva).toFixed(2)}€`
            : "");
      }
      // fallback string
      return typeof detail.tva === "string" ? detail.tva : "";
    }
    // Sinon, on retourne chaque taux/valeur sur une ligne
    return arr
      .map(
        (tvaObj) =>
          `${tvaObj.taux}%` +
          (tvaObj.valeur_tva !== undefined && !isNaN(tvaObj.valeur_tva)
            ? ` > +${parseFloat(tvaObj.valeur_tva).toFixed(2)}€`
            : "")
      )
      .join('\n');
  }

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

    const head = [
      [
        "Date",
        "Nature",
        "Description",
        "Client",
        "Projet",
        "Moyen de paiement",
        "Montant HT",
        "TVA",
        "Montant TTC"
      ],
    ];

    const rows = filteredDetails.map((detail) => [
      detail.date_str,
      detail.nature,
      detail.description,
      getClientName(detail.client_id),
      getProjetName(detail.projet_id),
      detail.moyen_paiement || "-",
      `${parseFloat(detail.montant).toFixed(2)}€`,
      formatTvaPdf(detail),
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
        0: { halign: "center", cellWidth: 30 }, // Date
        1: { halign: "center", cellWidth: 25 }, // Nature
        2: { halign: "center", minCellWidth: 35, cellWidth: 40 }, // Description
        3: { halign: "center", cellWidth: 25 }, // Client
        4: { halign: "center", cellWidth: 25 }, // Projet
        5: { halign: "center", cellWidth: 40 }, // Moyen de paiement
        6: { halign: "center", cellWidth: 30 }, // Montant HT
        7: { halign: "center", cellWidth: 35 }, // TVA
        8: { halign: "center", fontStyle: "bold", cellWidth: 30 }, // Montant TTC
        9: { halign: "center", cellWidth: 25 }, // Justificatif
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
          { content: "Total HT", colSpan: 7, styles: { halign: "left", fontStyle: "bold", fontSize: 10, textColor: [30, 30, 30] } },
          { content: `${totalHT.toFixed(2)}€`, styles: { fontStyle: "bold", halign: "left", fontSize: 11, textColor: [30, 30, 30] } },
          { content: "" },
        ],
        [
          { content: "Total TVA", colSpan: 7, styles: { halign: "left", fontStyle: "bold", fontSize: 10, textColor: [30, 30, 30] } },
          { content: `${totalTVA.toFixed(2)}€`, styles: { fontStyle: "bold", halign: "left", fontSize: 11, textColor: [30, 30, 30] } },
          { content: "" },
        ],
        [
          { content: "Total TTC", colSpan: 7, styles: { halign: "left", fontStyle: "bold", fontSize: 10, textColor: [30, 30, 30] } },
          { content: `${totalTTC.toFixed(2)}€`, styles: { fontStyle: "bold", halign: "left", fontSize: 11, textColor: [30, 30, 30] } },
          { content: "" },
        ],
        [
          { content: `Nombre total de lignes de note de frais : ${filteredDetails.length}`, colSpan: 9, styles: { halign: "center", fontSize: 10, textColor: [80, 80, 80], fontStyle: "italic" } },
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

  // A placer tout en haut
  function getTvaArray(tva, montant) {
    // Si déjà array, c'est le format [{ taux, valeur_tva }]
    if (Array.isArray(tva)) return tva;
    // Si c'est un string genre "10%" ou "10% / 20%"
    if (typeof tva === "string" && tva.includes("/")) {
      // On parse chaque taux et on calcule la tva brute
      const montantNum = parseFloat(montant) || 0;
      return tva.split("/").map(t => {
        const tauxNum = parseFloat(t.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
        const valeur_tva = Math.ceil(montantNum * tauxNum) / 100; // arrondi simple
        return { taux: tauxNum, valeur_tva };
      });
    }
    if (typeof tva === "string") {
      const tauxNum = parseFloat(tva.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
      const montantNum = parseFloat(montant) || 0;
      const valeur_tva = Math.ceil(montantNum * tauxNum) / 100;
      return [{ taux: tauxNum, valeur_tva }];
    }
    return [];
  }

  function getTvaLabel(tva) {
    if (Array.isArray(tva)) {
      return tva.map(t => (t.taux !== undefined ? t.taux + "%" : "")).join(" / ");
    }
    if (typeof tva === "string") return tva;
    return "";
  }

  // Calcul TTC avec array
  function getTTCLineRounded(montant, tvaArr) {
    const base = parseFloat(montant) || 0;
    if (!tvaArr || (Array.isArray(tvaArr) && tvaArr.length === 0)) return base;
    let arr = Array.isArray(tvaArr) ? tvaArr : getTvaArray(tvaArr, montant);
    // la somme des tva, arrondi au centime
    const totalTva = arr.reduce((sum, tvaObj) => sum + (parseFloat(tvaObj.valeur_tva) || 0), 0);
    return Math.round((base + totalTva) * 100) / 100;
  }

  const filteredDetails = useMemo(() => {
    let currentFilteredDetails = details.filter((detail) => {
      const lower = search.toLowerCase();
      return (
        detail.date_str?.toLowerCase().includes(lower) ||
        detail.nature?.toLowerCase().includes(lower) ||
        detail.description?.toLowerCase().includes(lower) ||
        getClientName(detail.client_id)?.toLowerCase().includes(lower) ||
        getProjetName(detail.projet_id)?.toLowerCase().includes(lower) ||
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
    projets,
  ]);

  const totalHT = useMemo(
    () => filteredDetails.reduce((acc, d) => acc + (parseFloat(d.montant) || 0), 0),
    [filteredDetails]
  );

  const totalTTC = useMemo(
    () => filteredDetails.reduce((acc, d) => acc + getTTCLineRounded(d.montant, d.tva), 0),
    [filteredDetails]
  );

  const totalTVA = useMemo(() => {
    return filteredDetails.reduce((acc, d) => {
      // Somme de toutes les tva sur chaque ligne
      let tvaArr = Array.isArray(d.tva) ? d.tva : getTvaArray(d.tva, d.montant);
      const totalLigne = tvaArr.reduce((sum, tvaObj) => sum + (parseFloat(tvaObj.valeur_tva) || 0), 0);
      return acc + totalLigne;
    }, 0);
  }, [filteredDetails]);


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

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg my-8 mx-auto max-w-6xl">
      {filteredDetails.length > 0 && (
        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Nature
                </th>
                <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Description
                </th>
                <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Client
                </th>
                <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Projet
                </th>
                <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Moyen de paiement
                </th>
                <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Montant HT
                </th>
                <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  TVA
                </th>
                <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Montant TTC
                </th>
                <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Justificatif
                </th>
                <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredDetails.map((detail) => {
                return (
                  <tr key={detail.uuid} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="py-3 px-3 whitespace-nowrap text-sm text-gray-800 text-center">
                      {detail.date_str}
                    </td>
                    <td
                      className="py-3 px-3 whitespace-nowrap text-sm text-gray-800 relative group"
                    >
                      {detail.nature}
                      {detail.nature === "repas" && (detail.type_repas || (Array.isArray(detail.inviter) && detail.inviter.length > 0)) && (
                        <div className="absolute left-1/2 z-30 top-full mt-2 w-max min-w-[200px] -translate-x-1/2 px-4 py-2 rounded-xl shadow-lg bg-white text-sm text-gray-900 border border-gray-200 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200 whitespace-pre-line">
                          {detail.type_repas && (
                            <div>
                              <span className="font-semibold text-gray-700">Type de repas : </span>
                              {detail.type_repas}
                            </div>
                          )}
                          {Array.isArray(detail.inviter) && detail.inviter.length > 0 && (
                            <div>
                              <span className="font-semibold text-gray-700">Invités : </span>
                              {detail.inviter.join(", ")}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-800 max-w-xs overflow-hidden text-ellipsis">
                      {detail.description}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-sm text-gray-800 text-center">
                      {getClientName(detail.client_id) || <span className="italic text-gray-400">-</span>}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-sm text-gray-800 text-center">
                      {getProjetName(detail.projet_id) || <span className="italic text-gray-400">-</span>}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-sm text-gray-800 text-center">
                      {detail.moyen_paiement || <span className="italic text-gray-400">-</span>}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-center text-sm text-gray-800 text-center">
                      {parseFloat(detail.montant).toFixed(2)}€
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-sm text-gray-800 text-center">
                      {Array.isArray(detail.tva) ? (
                        <div>
                          {detail.tva.map((tvaObj, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <span className="font-semibold">{tvaObj.taux}%</span>
                              <span className="text-gray-500">
                                {tvaObj.valeur_tva !== undefined && !isNaN(tvaObj.valeur_tva)
                                  ? <>⇒ +{parseFloat(tvaObj.valeur_tva).toFixed(2)}€</>
                                  : null}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span>{detail.tva}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                      {(detail.valeur_ttc !== undefined && detail.valeur_ttc !== null && !isNaN(detail.valeur_ttc))
                        ? parseFloat(detail.valeur_ttc).toFixed(2) + "€"
                        : (getTTCLineRounded(detail.montant, detail.tva).toFixed(2) + "€")}
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
                <td colSpan={3} className="py-3 px-4 text-left text-base font-bold text-gray-900">
                  Total HT
                </td>
                <td colSpan={8} className="py-3 px-4 text-left text-base font-bold text-gray-900">
                  {totalHT.toFixed(2)}€
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="py-3 px-4 text-left text-base font-semibold text-gray-900">
                  Total TVA
                </td>
                <td colSpan={8} className="py-3 px-4 text-left text-base font-semibold text-gray-900">
                  {totalTVA.toFixed(2)}€
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="py-3 px-4 text-left text-base font-bold text-gray-900">
                  Total TTC
                </td>
                <td colSpan={8} className="py-3 px-4 text-left text-base font-bold text-gray-900">
                  {totalTTC.toFixed(2)}€
                </td>
              </tr>
              <tr>
                <td colSpan={11} className="py-2 px-4 text-center text-sm text-gray-700 font-medium">
                  Nombre total de lignes de note de frais : {filteredDetails.length}
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