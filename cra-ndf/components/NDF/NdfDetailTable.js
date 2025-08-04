"use client";
import React, { useState, useMemo, useEffect } from "react";
import EditNdfDetailModal from "@/components/NDF/NDF_ACTIONS/EditNdfDetailModal";
import DeleteNdfDetailButton from "@/components/NDF/NDF_ACTIONS/DeleteNdfDetailButton";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ---------- UTILS ----------
function getTvaArray(tva, montant) {
  if (Array.isArray(tva)) return tva;
  if (typeof tva === "string" && tva.includes("/")) {
    const montantNum = parseFloat(montant) || 0;
    return tva.split("/").map(t => {
      const tauxNum = parseFloat(t.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
      const valeur_tva = Math.ceil(montantNum * tauxNum) / 100;
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

function getTTCLineRounded(montant, tvaArr) {
  const base = parseFloat(montant) || 0;
  if (!tvaArr || (Array.isArray(tvaArr) && tvaArr.length === 0)) return base;
  let arr = Array.isArray(tvaArr) ? tvaArr : getTvaArray(tvaArr, montant);
  const totalTva = arr.reduce((sum, tvaObj) => sum + (parseFloat(tvaObj.valeur_tva) || 0), 0);
  return Math.round((base + totalTva) * 100) / 100;
}

function formatTvaPdf(detail) {
  let arr = Array.isArray(detail.tva)
    ? detail.tva
    : getTvaArray(detail.tva, detail.montant);
  if (!arr.length || arr.length === 1) {
    let tvaUnique = arr[0];
    if (tvaUnique && tvaUnique.taux !== undefined) {
      return `${tvaUnique.taux}%` +
        (tvaUnique.valeur_tva !== undefined && !isNaN(tvaUnique.valeur_tva)
          ? ` > +${parseFloat(tvaUnique.valeur_tva).toFixed(2)}€`
          : "");
    }
    return typeof detail.tva === "string" ? detail.tva : "";
  }
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
// ---------------------------

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
  const refresh = () => window.location.reload();

  // --- FILTERED AND SORTED ---
  const filteredDetails = useMemo(() => {
    let current = details.filter((detail) => {
      const lower = search.toLowerCase();
      return (
        detail.date_str?.toLowerCase().includes(lower) ||
        detail.nature?.toLowerCase().includes(lower) ||
        detail.description?.toLowerCase().includes(lower) ||
        getClientName(detail.client_id)?.toLowerCase().includes(lower) ||
        getProjetName(detail.projet_id)?.toLowerCase().includes(lower) ||
        (typeof detail.tva === "string" ? detail.tva.toLowerCase().includes(lower) : false) ||
        String(detail.montant).toLowerCase().includes(lower)
      );
    });
    return [...current].sort((a, b) => {
      if (!a.date_str && !b.date_str) return 0;
      if (!a.date_str) return 1;
      if (!b.date_str) return -1;
      return new Date(a.date_str) - new Date(b.date_str);
    });
  }, [details, search, clients, projets]);

  // --- TOTALS ---
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
      let tvaArr = Array.isArray(d.tva) ? d.tva : getTvaArray(d.tva, d.montant);
      return acc + tvaArr.reduce((sum, tvaObj) => sum + (parseFloat(tvaObj.valeur_tva) || 0), 0);
    }, 0);
  }, [filteredDetails]);

  // --- EXPORT PDF ---
  const exportToPDF = async () => {
    const doc = new jsPDF({ orientation: "landscape" });
    let titleText = "Note de frais";
    const subtitleParts = [];
    if (month) subtitleParts.push(month);
    if (year) subtitleParts.push(year);
    if (name) subtitleParts.push(name);
    if (subtitleParts.length > 0) titleText += ` — ${subtitleParts.join(" — ")}`;

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

    autoTable(doc, {
      head: [[
        "Date", "Nature", "Description", "Client", "Projet", "Moyen de paiement",
        "Montant HT", "TVA", "Montant TTC", "Justificatif"
      ]],
      body: filteredDetails.map(detail => [
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
      ]),
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
        overflow: "linebreak",
        cellWidth: "auto",
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
        0: { halign: "center", cellWidth: 25 },
        1: { halign: "center", cellWidth: 20 },
        2: { halign: "center", cellWidth: 30 },
        3: { halign: "center", cellWidth: 20 },
        4: { halign: "center", cellWidth: 25 },
        5: { halign: "center", cellWidth: 40 },
        6: { halign: "center", cellWidth: 30 },
        7: { halign: "center", cellWidth: 30 },
        8: { halign: "center", fontStyle: "bold", cellWidth: 30 },
        9: { halign: "center", cellWidth: 25 },
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) addHeaderAndFooter(data.pageNumber);
      },
    });

    autoTable(doc, {
      body: [
        [
          { content: "Total HT", colSpan: 7, styles: { halign: "left", fontStyle: "bold", fontSize: 10 } },
          { content: `${totalHT.toFixed(2)}€`, styles: { fontStyle: "bold", halign: "left", fontSize: 11 } },
          { content: "" },
        ],
        [
          { content: "Total TVA", colSpan: 7, styles: { halign: "left", fontStyle: "bold", fontSize: 10 } },
          { content: `${totalTVA.toFixed(2)}€`, styles: { fontStyle: "bold", halign: "left", fontSize: 11 } },
          { content: "" },
        ],
        [
          { content: "Total TTC", colSpan: 7, styles: { halign: "left", fontStyle: "bold", fontSize: 10 } },
          { content: `${totalTTC.toFixed(2)}€`, styles: { fontStyle: "bold", halign: "left", fontSize: 11 } },
          { content: "" },
        ],
        [
          { content: `Nombre total de lignes : ${filteredDetails.length}`, colSpan: 9, styles: { halign: "center", fontSize: 10, fontStyle: "italic" } },
        ],
      ],
      theme: "plain",
      startY: doc.lastAutoTable.finalY + 8,
      margin: { left: 10, right: 10 },
      styles: { fontSize: 10, cellPadding: 3, textColor: [0, 0, 0] },
    });

    doc.save(
      `note-de-frais_${month || ""}_${year || ""}_${name ? name.replace(/\s+/g, "_") : ""}.pdf`
    );
  };

  // ----------- RENDER --------------
  return (
    <div className="bg-white p-6 rounded-3xl shadow-xl my-8 mx-auto max-w-6xl border border-blue-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <h2 className="text-2xl font-bold text-blue-700 mb-2">Détail de la note de frais</h2>
        <div className="flex items-center gap-3">
          <input
            className="rounded-md border border-gray-300 px-3 py-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm text-black"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Recherche rapide..."
            aria-label="Recherche"
          />
          <button
            onClick={exportToPDF}
            disabled={ndfStatut === "Provisoire"}
            title={
              ndfStatut === "Provisoire"
                ? "Impossible d'exporter une note de frais au statut Provisoire."
                : "Exporter le tableau en PDF"
            }
            className={`inline-flex items-center px-5 py-2 rounded-lg font-semibold transition-colors duration-200 shadow-md
              ${ndfStatut === "Provisoire"
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            PDF
          </button>
        </div>
      </div>
      {ndfStatut === "Provisoire" && (
        <p className="text-sm text-gray-500 mb-3 italic">
          Le statut doit être autre que Provisoire pour permettre l’export PDF.
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow">
        <table className="min-w-full divide-y divide-blue-100">
          <thead className="bg-blue-50">
            <tr>
              {[
                "Date", "Nature", "Description", "Client", "Projet",
                "Moyen de paiement", "Montant HT", "TVA", "Montant TTC", "Justificatif", "Actions"
              ].map((h, i) => (
                <th key={i} className="py-3 px-3 text-center text-xs font-semibold text-blue-800 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-blue-50">
            {filteredDetails.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-10 text-center text-gray-400">
                  Aucune dépense pour cette note de frais.
                </td>
              </tr>
            ) : (
              filteredDetails.map((detail) => (
                <tr key={detail.uuid} className="hover:bg-blue-50 transition-colors">
                  <td className="py-3 px-3 whitespace-nowrap text-sm text-gray-800 text-center">{detail.date_str}</td>
                  <td className="py-3 px-3 whitespace-nowrap text-sm text-gray-800">{detail.nature}</td>
                  <td className="py-3 px-3 text-sm text-gray-800 max-w-xs truncate">{detail.description}</td>
                  <td className="py-3 px-3 whitespace-nowrap text-sm text-gray-800 text-center">
                    {getClientName(detail.client_id) || <span className="italic text-gray-300">-</span>}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-sm text-gray-800 text-center">
                    {getProjetName(detail.projet_id) || <span className="italic text-gray-300">-</span>}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-sm text-gray-800 text-center">
                    {detail.moyen_paiement || <span className="italic text-gray-300">-</span>}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-center text-sm text-gray-800">{parseFloat(detail.montant).toFixed(2)}€</td>
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
                      <a href={detail.img_url} target="_blank" rel="noopener noreferrer" className="inline-block">
                        <img
                          src={detail.img_url}
                          alt="Justificatif"
                          className="max-w-[80px] max-h-[60px] object-contain rounded-lg shadow border border-blue-100 hover:shadow-md transition-shadow"
                        />
                      </a>
                    ) : (
                      <span className="text-gray-300 italic text-xs">Aucun</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {ndfStatut === "Provisoire" ? (
                      <div className="flex justify-center gap-1">
                        <EditNdfDetailModal
                          detail={detail}
                          onEdited={refresh}
                          parentNdfMonth={month}
                          parentNdfYear={year}
                        />
                        <DeleteNdfDetailButton
                          detailId={detail.uuid}
                          onDeleted={refresh}
                        />
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs italic">Non modifiable</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-blue-50 border-t-2 border-blue-100">
            <tr>
              <td colSpan={3} className="py-3 px-4 text-left text-base font-bold text-blue-900">Total HT</td>
              <td colSpan={8} className="py-3 px-4 text-left text-base font-bold text-blue-900">{totalHT.toFixed(2)}€</td>
            </tr>
            <tr>
              <td colSpan={3} className="py-3 px-4 text-left text-base font-semibold text-blue-900">Total TVA</td>
              <td colSpan={8} className="py-3 px-4 text-left text-base font-semibold text-blue-900">{totalTVA.toFixed(2)}€</td>
            </tr>
            <tr>
              <td colSpan={3} className="py-3 px-4 text-left text-base font-bold text-blue-900">Total TTC</td>
              <td colSpan={8} className="py-3 px-4 text-left text-base font-bold text-blue-900">{totalTTC.toFixed(2)}€</td>
            </tr>
            <tr>
              <td colSpan={11} className="py-2 px-4 text-center text-sm text-blue-800 font-medium">
                Nombre total de lignes : {filteredDetails.length}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}