"use client";
import { useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const TRAJET_TYPES = [
    { label: "Aller", value: 1 },
    { label: "Aller-Retour", value: 2 }
];

// ===== Helpers barème indemnités =====
function calcIndemniteVoiture(cv, total) {
    total = parseFloat(total);
    if (isNaN(total) || !cv) return "";
    let bar = null;
    if (cv === "3-") bar = 3;
    if (cv === "4") bar = 4;
    if (cv === "5") bar = 5;
    if (cv === "6") bar = 6;
    if (cv === "7+") bar = 7;
    if (!bar) return "";
    if (bar === 3) {
        if (total <= 5000) return (total * 0.529).toFixed(2);
        if (total <= 20000) return (total * 0.316 + 1061).toFixed(2);
        return (total * 0.369).toFixed(2);
    }
    if (bar === 4) {
        if (total <= 5000) return (total * 0.606).toFixed(2);
        if (total <= 20000) return (total * 0.340 + 1330).toFixed(2);
        return (total * 0.408).toFixed(2);
    }
    if (bar === 5) {
        if (total <= 5000) return (total * 0.636).toFixed(2);
        if (total <= 20000) return (total * 0.356 + 1391).toFixed(2);
        return (total * 0.427).toFixed(2);
    }
    if (bar === 6) {
        if (total <= 5000) return (total * 0.665).toFixed(2);
        if (total <= 20000) return (total * 0.374 + 1457).toFixed(2);
        return (total * 0.448).toFixed(2);
    }
    if (bar === 7) {
        if (total <= 5000) return (total * 0.697).toFixed(2);
        if (total <= 20000) return (total * 0.394 + 1512).toFixed(2);
        return (total * 0.470).toFixed(2);
    }
    return "";
}
function calcIndemniteMoto(cv, total) {
    total = parseFloat(total);
    if (isNaN(total) || !cv) return "";
    if (cv === "1") {
        if (total <= 3000) return (total * 0.395).toFixed(2);
        if (total <= 6000) return (total * 0.099 + 891).toFixed(2);
        return (total * 0.248).toFixed(2);
    }
    if (cv === "2-3-4-5") {
        if (total <= 3000) return (total * 0.468).toFixed(2);
        if (total <= 6000) return (total * 0.082 + 1158).toFixed(2);
        return (total * 0.275).toFixed(2);
    }
    if (cv === "plus5") {
        if (total <= 3000) return (total * 0.606).toFixed(2);
        if (total <= 6000) return (total * 0.079 + 1583).toFixed(2);
        return (total * 0.343).toFixed(2);
    }
    return "";
}
function calcIndemnite(type_vehicule, cv, total) {
    if (type_vehicule === "voiture") return calcIndemniteVoiture(cv, total);
    if (type_vehicule === "moto") return calcIndemniteMoto(cv, total);
    return "";
}

function toYYYYMMDD(date) {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().slice(0, 10);
}

function isDateInvalid(dateDebut, dateFin) {
    if (!dateDebut || !dateFin) return false;
    return new Date(dateDebut) > new Date(dateFin);
}

export default function NdfKiloTable({ ndfId, ndfStatut, rows = [], loading = false, reloadRows }) {
    // --- plus de gestion de rows ici ---
    const [editRow, setEditRow] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);

    function exportKiloPDF() {
        const doc = new jsPDF({ orientation: "landscape" });

        const title = "Note de frais - Kilométriques";
        doc.setFontSize(20);
        doc.setTextColor(20, 20, 20);
        doc.text(title, 14, 20);

        autoTable(doc, {
            startY: 30,
            head: [[
                "Date début",
                "Date fin",
                "Départ",
                "Arrivée",
                "Véhicule",
                "Chevaux Fiscaux",
                "km",
                "Trajet",
                "Motif",
                "Total km",
                "Indemnités (€)"
            ]],
            body: rows.map(row => [
                toYYYYMMDD(row.date_debut),
                toYYYYMMDD(row.date_fin),
                row.depart,
                row.arrivee,
                row.type_vehicule === "moto" ? "Moto" : row.type_vehicule === "voiture" ? "Voiture" : "",
                row.type_vehicule === "moto"
                    ? (row.cv === "1" ? "1 CV"
                        : row.cv === "2-3-4-5" ? "2, 3, 4 ou 5 CV"
                            : row.cv === "plus5" ? "Plus de 5 CV"
                                : "")
                    : row.type_vehicule === "voiture"
                        ? (row.cv === "3-" ? "3 CV et moins"
                            : row.cv === "4" ? "4 CV"
                                : row.cv === "5" ? "5 CV"
                                    : row.cv === "6" ? "6 CV"
                                        : row.cv === "7+" ? "7 CV et plus"
                                            : "")
                        : "",
                row.distance,
                TRAJET_TYPES.find(t => t.value === row.type_trajet)?.label,
                row.motif,
                parseFloat(row.total_euro).toFixed(2),
                calcIndemnite(row.type_vehicule, row.cv, row.total_euro)
            ]),
            styles: { fontSize: 9, cellPadding: 2.5 },
            headStyles: { fillColor: [30, 144, 255], textColor: 255, fontStyle: "bold", halign: "center" },
            alternateRowStyles: { fillColor: [240, 248, 255] },
            margin: { left: 10, right: 10 },
        });

        autoTable(doc, {
            body: [
                [
                    { content: "Total km", colSpan: 9, styles: { halign: "right", fontStyle: "bold", fontSize: 11 } },
                    { content: totalEuro().toFixed(2) + " km", styles: { fontStyle: "bold", halign: "center" } },
                    { content: "" }
                ],
                [
                    { content: "Total indemnités", colSpan: 9, styles: { halign: "right", fontStyle: "bold", fontSize: 11 } },
                    { content: totalIndemnites().toFixed(2) + " €", styles: { fontStyle: "bold", halign: "center" } },
                    { content: "" }
                ],
                [
                    { content: `Nombre total de lignes kilométriques : ${rows.length}`, colSpan: 11, styles: { halign: "center", fontStyle: "italic", fontSize: 10 } }
                ]
            ],
            theme: "plain",
            startY: doc.lastAutoTable.finalY + 10,
            margin: { left: 10, right: 10 },
            styles: { fontSize: 10, cellPadding: 3, textColor: [0, 0, 0] }
        });

        doc.save(`note-frais_kilometriques.pdf`);
    }

    function handleEdit(row) {
        setEditRow(row);
        setEditForm({
            date_debut: toYYYYMMDD(row.date_debut),
            date_fin: toYYYYMMDD(row.date_fin),
            depart: row.depart,
            arrivee: row.arrivee,
            distance: row.distance,
            type_trajet: row.type_trajet,
            motif: row.motif,
            total_euro: calculateTotal(row.distance, row.type_trajet),
            type_vehicule: row.type_vehicule || "",
            cv: row.cv || "",
        });
        setEditError("");
    }

    function closeEditModal() {
        setEditRow(null);
        setEditForm(null);
        setEditError("");
        setEditLoading(false);
    }

    function calculateTotal(distance, type_trajet) {
        const d = parseFloat(distance);
        const t = parseInt(type_trajet);
        if (!isNaN(d) && !isNaN(t)) {
            return (d * t).toFixed(2);
        }
        return "";
    }

    function handleEditFormChange(field, value) {
        setEditForm(form => {
            const updated = { ...form, [field]: value };
            if (field === "distance" || field === "type_trajet") {
                updated.total_euro = calculateTotal(updated.distance, updated.type_trajet);
            }
            return updated;
        });
    }

    async function handleEditSubmit(e) {
        e.preventDefault();
        setEditError("");

        if (
            editForm.date_debut &&
            editForm.date_fin &&
            isDateInvalid(editForm.date_debut, editForm.date_fin)
        ) {
            setEditError("La date de début ne peut pas être supérieure à la date de fin.");
            return;
        }

        setEditLoading(true);
        try {
            const res = await fetch(`/api/ndf_kilo/${editRow.uuid}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm)
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Erreur lors de la modification.");
            }
            closeEditModal();
            if (reloadRows) reloadRows();
        } catch (err) {
            setEditError(err.message);
        } finally {
            setEditLoading(false);
        }
    }

    function askDelete(uuid) {
        setDeleteTarget(uuid);
    }

    async function confirmDelete() {
        const uuid = deleteTarget;
        setDeleteTarget(null);
        if (!uuid) return;
        await fetch(`/api/ndf_kilo/${uuid}`, { method: "DELETE" });
        if (reloadRows) reloadRows();
    }

    function cancelDelete() {
        setDeleteTarget(null);
    }

    function totalKm() {
        return rows.reduce((acc, r) => acc + (parseFloat(r.distance) || 0), 0);
    }
    function totalEuro() {
        return rows.reduce((acc, r) => acc + (parseFloat(r.total_euro) || 0), 0);
    }
    function totalIndemnites() {
        return rows.reduce(
            (acc, r) =>
                acc +
                (parseFloat(calcIndemnite(r.type_vehicule, r.cv, r.total_euro)) || 0),
            0
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg my-8 mx-auto max-w-6xl">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Date début</th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Date fin</th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Départ</th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Arrivée</th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Véhicule</th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Cheveaux Fiscaux</th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">km</th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Trajet</th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Motif</th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Total km</th>
                            <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Indemnités</th>
                            {ndfStatut === "Provisoire" && (
                                <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={12} className="py-8 text-center text-gray-400">Chargement...</td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={12} className="py-8 text-center text-gray-400">Aucune ligne kilométrique.</td>
                            </tr>
                        ) : (
                            rows.map(row => (
                                <tr key={row.uuid} className="hover:bg-gray-50 text-gray-900">
                                    <td className="px-2 py-2 text-sm text-center">{toYYYYMMDD(row.date_debut)}</td>
                                    <td className="px-2 py-2 text-sm text-center">{toYYYYMMDD(row.date_fin)}</td>
                                    <td className="px-2 py-2 text-sm text-center">{row.depart}</td>
                                    <td className="px-2 py-2 text-sm text-center">{row.arrivee}</td>
                                    <td className="px-2 py-2 text-sm text-center">
                                        {row.type_vehicule === "moto"
                                            ? "Moto"
                                            : row.type_vehicule === "voiture"
                                                ? "Voiture"
                                                : ""}
                                    </td>
                                    <td className="px-2 py-2 text-sm text-center">
                                        {row.type_vehicule === "moto" &&
                                            (row.cv === "1"
                                                ? "1 CV"
                                                : row.cv === "2-3-4-5"
                                                    ? "2, 3, 4 ou 5 CV"
                                                    : row.cv === "plus5"
                                                        ? "Plus de 5 CV"
                                                        : "")}
                                        {row.type_vehicule === "voiture" &&
                                            (row.cv === "3-"
                                                ? "3 CV et moins"
                                                : row.cv === "4"
                                                    ? "4 CV"
                                                    : row.cv === "5"
                                                        ? "5 CV"
                                                        : row.cv === "6"
                                                            ? "6 CV"
                                                            : row.cv === "7+"
                                                                ? "7 CV et plus"
                                                                : "")}
                                    </td>
                                    <td className="px-2 py-2 text-sm text-center">{row.distance}</td>
                                    <td className="px-2 py-2 text-sm text-center">
                                        {TRAJET_TYPES.find(t => t.value === row.type_trajet)?.label}
                                    </td>
                                    <td className="px-2 py-2 text-sm text-center">{row.motif}</td>
                                    <td className="px-2 py-2 text-sm text-center font-bold">{parseFloat(row.total_euro).toFixed(2)} km</td>
                                    <td className="px-2 py-2 text-sm text-center font-bold">
                                        {calcIndemnite(row.type_vehicule, row.cv, row.total_euro)} €
                                    </td>
                                    {ndfStatut === "Provisoire" && (
                                        <td className="px-2 py-2 text-center flex gap-2 justify-center">
                                            <button
                                                className="text-blue-600 hover:bg-blue-100 rounded-full p-1 transition"
                                                onClick={() => handleEdit(row)}
                                                title="Éditer"
                                                aria-label="Éditer"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                className="text-red-600 hover:bg-red-100 rounded-full p-1 transition"
                                                onClick={() => askDelete(row.uuid)}
                                                title="Supprimer"
                                                aria-label="Supprimer"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                    <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                        <tr>
                            <td colSpan={2} className="py-3 px-4 text-left text-base font-bold text-gray-900">
                                Total km
                            </td>
                            <td colSpan={2} className="py-3 px-4 text-right text-base font-bold text-gray-900">
                                {totalEuro().toFixed(2)}
                            </td>
                            <td colSpan={1} className="py-3 px-4 text-left text-base font-bold text-gray-900">
                                km
                            </td>
                            <td colSpan={6}></td>
                            {ndfStatut === "Provisoire" && <td></td>}
                        </tr>
                        <tr>
                            <td colSpan={2} className="py-3 px-4 text-left text-base font-bold text-gray-900">
                                Total indemnités
                            </td>
                            <td colSpan={2} className="py-3 px-4 text-right text-base font-bold text-gray-900">
                                {totalIndemnites().toFixed(2)}
                            </td>
                            <td colSpan={1} className="py-3 px-4 text-left text-base font-bold text-gray-900">
                                €
                            </td>
                            <td colSpan={6}></td>
                            {ndfStatut === "Provisoire" && <td></td>}
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div className="mt-8 text-center">
                <div className="mt-8 flex flex-col items-center justify-center">
                    <button
                        onClick={exportKiloPDF}
                        disabled={ndfStatut === "Provisoire"}
                        title={ndfStatut === "Provisoire"
                            ? "Impossible d'exporter une note de frais kilométrique au statut Provisoire."
                            : "Exporter le tableau kilométrique en PDF"}
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
                        Exporter le tableau kilométrique en PDF
                    </button>
                    {ndfStatut === "Provisoire" && (
                        <p className="text-sm text-gray-500 mt-4 italic text-center">
                            Le statut doit être autre que Provisoire pour permettre l’export PDF.
                        </p>
                    )}
                </div>
            </div>
            
            {editRow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg relative max-h-[90vh] overflow-y-auto text-gray-900">
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            onClick={closeEditModal}
                            aria-label="Fermer la modale"
                            disabled={editLoading}
                        >
                            <X size={24} />
                        </button>
                        <h2 className="text-xl font-bold mb-4">Modifier la ligne kilométrique</h2>
                        <form onSubmit={handleEditSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                                <input
                                    type="date"
                                    required
                                    className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                    value={editForm.date_debut}
                                    onChange={e => handleEditFormChange("date_debut", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                                <input
                                    type="date"
                                    className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                    value={editForm.date_fin || ""}
                                    onChange={e => handleEditFormChange("date_fin", e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Départ</label>
                                    <input
                                        type="text"
                                        required
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        value={editForm.depart}
                                        onChange={e => handleEditFormChange("depart", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Arrivée</label>
                                    <input
                                        type="text"
                                        required
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        value={editForm.arrivee}
                                        onChange={e => handleEditFormChange("arrivee", e.target.value)}
                                    />
                                </div>
                            </div>
                            {/* Type de véhicule */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type de véhicule</label>
                                <select
                                    required
                                    className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                    value={editForm.type_vehicule || ""}
                                    onChange={e => {
                                        handleEditFormChange("type_vehicule", e.target.value);
                                        // Réinitialise le champ CV lors du changement de type de véhicule
                                        handleEditFormChange("cv", "");
                                    }}
                                >
                                    <option value="">Sélectionner</option>
                                    <option value="voiture">Voiture</option>
                                    <option value="moto">Moto</option>
                                </select>
                            </div>

                            {/* Champ CV, qui change selon le type de véhicule */}
                            {editForm.type_vehicule === "moto" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CV (Moto)</label>
                                    <select
                                        required
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        value={editForm.cv || ""}
                                        onChange={e => handleEditFormChange("cv", e.target.value)}
                                    >
                                        <option value="">Sélectionner</option>
                                        <option value="1">1 CV</option>
                                        <option value="2-3-4-5">2, 3, 4 ou 5 CV</option>
                                        <option value="plus5">Plus de 5 CV</option>
                                    </select>
                                </div>
                            )}
                            {editForm.type_vehicule === "voiture" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CV (Voiture)</label>
                                    <select
                                        required
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        value={editForm.cv || ""}
                                        onChange={e => handleEditFormChange("cv", e.target.value)}
                                    >
                                        <option value="">Sélectionner</option>
                                        <option value="3-">3 CV et moins</option>
                                        <option value="4">4 CV</option>
                                        <option value="5">5 CV</option>
                                        <option value="6">6 CV</option>
                                        <option value="7+">7 CV et plus</option>
                                    </select>
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Distance (km)</label>
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        step="0.1"
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        value={editForm.distance}
                                        onChange={e => handleEditFormChange("distance", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de trajet</label>
                                    <select
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        value={editForm.type_trajet}
                                        onChange={e => handleEditFormChange("type_trajet", e.target.value)}
                                    >
                                        {TRAJET_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Motif</label>
                                <input
                                    type="text"
                                    className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                    value={editForm.motif}
                                    onChange={e => handleEditFormChange("motif", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total (€)</label>
                                <input
                                    type="number"
                                    required
                                    min={0}
                                    step="0.01"
                                    className="block w-full border border-gray-300 rounded-md py-2 px-3 bg-gray-100 cursor-not-allowed"
                                    value={editForm.total_euro}
                                    readOnly
                                />
                            </div>
                            {editError && (
                                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm" role="alert">
                                    {editError}
                                </div>
                            )}
                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    className="px-5 py-2 bg-gray-200 text-gray-700 font-medium rounded-md shadow-sm hover:bg-gray-300"
                                    onClick={closeEditModal}
                                    disabled={editLoading}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={editLoading}
                                    className="inline-flex items-center px-5 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    {editLoading ? "Modification..." : "Enregistrer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- Modal de confirmation suppression --- */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm relative text-gray-900">
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            onClick={cancelDelete}
                            aria-label="Fermer la modale"
                        >
                            <X size={24} />
                        </button>
                        <h2 className="text-lg font-bold mb-4">Supprimer la ligne ?</h2>
                        <p className="mb-6 text-gray-700">Voulez-vous vraiment supprimer cette ligne kilométrique ? Cette action est irréversible.</p>
                        <div className="flex justify-end gap-3">
                            <button
                                className="px-5 py-2 bg-gray-200 text-gray-700 rounded-md shadow-sm font-medium hover:bg-gray-300"
                                onClick={cancelDelete}
                            >
                                Annuler
                            </button>
                            <button
                                className="px-5 py-2 bg-red-600 text-white rounded-md shadow-sm font-medium hover:bg-red-700"
                                onClick={confirmDelete}
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}