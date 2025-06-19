"use client";
import EditNdfDetailModal from "@/components/EditNdfDetailModal";
import DeleteNdfDetailButton from "@/components/DeleteNdfDetailButton";
import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const NATURES = ["carburant", "parking", "peage", "repas", "achat divers"];
const TVAS = ["autre taux", "multi-taux", "0%", "5.5%", "10%", "20%"];

export default function NdfDetailTable({ details: initialDetails, ndfStatut }) {
    const [details, setDetails] = useState(initialDetails);
    const [search, setSearch] = useState("");

    const [filterModal, setFilterModal] = useState(false);
    const [sortBy, setSortBy] = useState("");
    const [sortDir, setSortDir] = useState("asc");
    const [nature, setNature] = useState("");
    const [tvaType, setTvaType] = useState("");
    const [tvaOtherValue, setTvaOtherValue] = useState("");
    const [tvaMultiValue, setTvaMultiValue] = useState("");
    const [reset, setReset] = useState(0);

    const refresh = async () => window.location.reload();

    const exportToPDF = () => {
        const doc = new jsPDF();

        const head = [[
            "Date",
            "Nature",
            "Description",
            "TVA",
            "Montant HT",
            "Montant TTC",
            "Justificatif"
        ]];

        const rows = filteredDetails.map(detail => [
            detail.date_str,
            detail.nature,
            detail.description,
            detail.tva,
            `${detail.montant}€`,
            `${getTTC(detail.montant, detail.tva).toFixed(2)}€`,
            detail.img_url ? "Oui" : "Non"
        ]);

        autoTable(doc, {
            head,
            body: rows,
            margin: { top: 20 },
            styles: { fontSize: 10 },
            headStyles: { fillColor: [254, 202, 87] },
        });

        autoTable(doc, {
            body: [
                [
                    { content: "Total HT", colSpan: 5, styles: { halign: "right", fontStyle: "bold" } },
                    { content: `${totalHT.toFixed(2)}€`, styles: { fontStyle: "bold" } },
                    { content: "" }
                ],
                [
                    { content: "Total TTC", colSpan: 5, styles: { halign: "right", fontStyle: "bold" } },
                    { content: `${totalTTC.toFixed(2)}€`, styles: { fontStyle: "bold" } },
                    { content: "" }
                ]
            ],
            theme: 'plain',
            margin: { top: doc.lastAutoTable.finalY + 2 }
        });

        doc.save("note-de-frais.pdf");
    };

    function getTTC(montant, tvaStr) {
        if (!tvaStr) return parseFloat(montant);
        const tauxList = tvaStr
            .split("/")
            .map(t => t.replace(/[^\d.,]/g, "").replace(",", ".").trim())
            .map(str => parseFloat(str))
            .filter(x => !isNaN(x));
        if (tauxList.length === 0) return parseFloat(montant);
        const base = parseFloat(montant);
        const totalTva = tauxList.reduce((sum, taux) => sum + (base * taux) / 100, 0);
        return base + totalTva;
    }

    let filteredDetails = details.filter(detail => {
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
        filteredDetails = filteredDetails.filter(d => d.nature === nature);
    }

    if (tvaType) {
        if (tvaType === "autre taux" && tvaOtherValue) {
            filteredDetails = filteredDetails.filter(d => d.tva.replace(/\s/g, "").includes(tvaOtherValue.replace(/\s/g, "")));
        } else if (tvaType === "multi-taux" && tvaMultiValue) {
            filteredDetails = filteredDetails.filter(d => d.tva.replace(/\s/g, "").includes(tvaMultiValue.replace(/\s/g, "")));
        } else if (tvaType !== "autre taux" && tvaType !== "multi-taux") {
            filteredDetails = filteredDetails.filter(d => d.tva.split(" ")[0] === tvaType);
        }
    }

    if (sortBy) {
        filteredDetails = [...filteredDetails].sort((a, b) => {
            let valA, valB;
            if (sortBy === "date") {
                valA = new Date(a.date_str);
                valB = new Date(b.date_str);
            } else if (sortBy === "tva") {
                valA = parseFloat(a.tva.split("/")[0]?.replace(/[^\d.,]/g, "").replace(",", ".") || 0);
                valB = parseFloat(b.tva.split("/")[0]?.replace(/[^\d.,]/g, "").replace(",", ".") || 0);
            } else if (sortBy === "montant") {
                valA = parseFloat(a.montant);
                valB = parseFloat(b.montant);
            }
            return sortDir === "asc" ? valA - valB : valB - valA;
        });
    }

    if (!details?.length) {
        return <p>Aucun détail pour cette note de frais.</p>;
    }

    const totalHT = filteredDetails.reduce((acc, d) => acc + parseFloat(d.montant || 0), 0);
    const totalTTC = filteredDetails.reduce((acc, d) => acc + getTTC(d.montant, d.tva), 0);

    function resetFilters() {
        setNature("");
        setTvaType("");
        setTvaOtherValue("");
        setTvaMultiValue("");
        setSortBy("");
        setSortDir("asc");
        setReset(prev => prev + 1);
        setFilterModal(false);
    }

    return (
        <div>
            <div className="flex items-center mb-4 gap-2">
                <Search className="mr-2 text-gray-500" size={20} />
                <input
                    type="text"
                    className="border rounded px-3 py-2 w-full max-w-xs"
                    placeholder="Rechercher..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <button
                    className="ml-2 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 flex items-center gap-2"
                    onClick={() => setFilterModal(true)}
                    title="Filtres avancés"
                >
                    <SlidersHorizontal size={18} /> Filtrer
                </button>
            </div>
            {filterModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded shadow-lg text-black w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Filtres avancés</h3>
                            <button
                                onClick={() => setFilterModal(false)}
                                className="text-gray-600 hover:text-black"
                                title="Fermer"
                            >
                                <X size={22} />
                            </button>
                        </div>
                        <div className="mb-4">
                            <div className="font-semibold">Trier par :</div>
                            <div className="flex gap-2 mt-2">
                                <button
                                    className={`px-2 py-1 rounded ${sortBy === "date" ? "bg-yellow-500 text-white" : "bg-gray-200"}`}
                                    onClick={() => setSortBy("date")}
                                    type="button"
                                >
                                    Date
                                </button>
                                <button
                                    className={`px-2 py-1 rounded ${sortBy === "tva" ? "bg-yellow-500 text-white" : "bg-gray-200"}`}
                                    onClick={() => setSortBy("tva")}
                                    type="button"
                                >
                                    TVA
                                </button>
                                <button
                                    className={`px-2 py-1 rounded ${sortBy === "montant" ? "bg-yellow-500 text-white" : "bg-gray-200"}`}
                                    onClick={() => setSortBy("montant")}
                                    type="button"
                                >
                                    Montant HT
                                </button>
                            </div>
                            {sortBy && (
                                <div className="mt-2">
                                    <button
                                        className={`mr-2 px-2 py-1 rounded ${sortDir === "asc" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                                        onClick={() => setSortDir("asc")}
                                        type="button"
                                    >
                                        Croissant
                                    </button>
                                    <button
                                        className={`px-2 py-1 rounded ${sortDir === "desc" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                                        onClick={() => setSortDir("desc")}
                                        type="button"
                                    >
                                        Décroissant
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="mb-4">
                            <div className="font-semibold mb-1">Nature :</div>
                            <select
                                className="border rounded px-2 py-1 w-full"
                                value={nature}
                                onChange={e => setNature(e.target.value)}
                            >
                                <option value="">Toutes</option>
                                {NATURES.map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-4">
                            <div className="font-semibold mb-1">Filtrer par TVA :</div>
                            <select
                                className="border rounded px-2 py-1 w-full"
                                value={tvaType}
                                onChange={e => { setTvaType(e.target.value); setTvaOtherValue(""); setTvaMultiValue(""); }}
                            >
                                <option value="">Tous taux</option>
                                {TVAS.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            {tvaType === "autre taux" && (
                                <input
                                    key={reset + "autre"}
                                    type="text"
                                    className="mt-2 border px-2 py-1 rounded w-full"
                                    placeholder="Précisez le taux (ex: 8.5)"
                                    value={tvaOtherValue}
                                    onChange={e => setTvaOtherValue(e.target.value)}
                                />
                            )}
                            {tvaType === "multi-taux" && (
                                <input
                                    key={reset + "multi"}
                                    type="text"
                                    className="mt-2 border px-2 py-1 rounded w-full"
                                    placeholder="Précisez les taux (ex: 10/12)"
                                    value={tvaMultiValue}
                                    onChange={e => setTvaMultiValue(e.target.value)}
                                />
                            )}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="bg-gray-300 text-black px-4 py-2 rounded"
                            >
                                Réinitialiser
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterModal(false)}
                                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
                            >
                                Appliquer
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-100 text-black">
                    <tr>
                        <th className="py-2 px-4 border">Date</th>
                        <th className="py-2 px-4 border">Nature</th>
                        <th className="py-2 px-4 border">Description</th>
                        <th className="py-2 px-4 border">TVA</th>
                        <th className="py-2 px-4 border">Montant HT</th>
                        <th className="py-2 px-4 border">Montant TTC</th>
                        <th className="py-2 px-4 border">Justificatif</th>
                        <th className="py-2 px-4 border">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredDetails.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="text-center text-gray-500 py-6">Aucun résultat</td>
                        </tr>
                    ) : filteredDetails.map(detail => {
                        const montantTTC = getTTC(detail.montant, detail.tva);
                        return (
                            <tr key={detail.uuid}>
                                <td className="py-2 px-4 border">{detail.date_str}</td>
                                <td className="py-2 px-4 border">{detail.nature}</td>
                                <td className="py-2 px-4 border">{detail.description}</td>
                                <td className="py-2 px-4 border">{detail.tva}</td>
                                <td className="py-2 px-4 border">{detail.montant}€</td>
                                <td className="py-2 px-4 border font-bold">
                                    {montantTTC.toFixed(2)}€
                                </td>
                                <td className="py-2 px-4 border text-center">
                                    {detail.img_url ? (
                                        <a href={detail.img_url} target="_blank" rel="noopener noreferrer">
                                            <img src={detail.img_url} alt="Justificatif" style={{ maxWidth: 80, maxHeight: 60, display: "inline-block" }} />
                                        </a>
                                    ) : (
                                        <span className="text-gray-400 italic">Aucun</span>
                                    )}
                                </td>
                                <td className="py-2 px-4 border text-center">
                                    {ndfStatut !== "Déclaré" && (
                                        <>
                                            <EditNdfDetailModal detail={detail} onEdited={refresh} />
                                            <DeleteNdfDetailButton detailId={detail.uuid} onDeleted={refresh} />
                                        </>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="bg-gray-200 font-bold text-black">
                        <td colSpan={6} className="py-2 px-4 border text-right">Total HT</td>
                        <td colSpan={2} className="py-2 px-4 border">{totalHT.toFixed(2)}€</td>
                    </tr>
                    <tr className="bg-gray-200 font-bold text-black">
                        <td colSpan={6} className="py-2 px-4 border text-right">Total TTC</td>
                        <td colSpan={2} className="py-2 px-4 border">{totalTTC.toFixed(2)}€</td>
                    </tr>
                </tfoot>
            </table>
            <button
                onClick={exportToPDF}
                disabled={ndfStatut === "Provisoire"}
                title={ndfStatut === "Provisoire" ? "Impossible d'exporter un NDF au statut Provisoire" : "Exporter le tableau en PDF"}
                className={`mt-4 px-6 py-2 rounded font-semibold transition
                    ${ndfStatut === "Provisoire"
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : "bg-red-700 text-white hover:bg-red-800"
                    }`}
            >
                Exporter le tableau en PDF
            </button>
            {ndfStatut === "Provisoire" && (
                <div className="text-xs text-gray-500 mt-1">
                    Le statut doit être autre que <b>Provisoire</b> pour permettre l’export PDF.
                </div>
            )}
        </div>
    );
}