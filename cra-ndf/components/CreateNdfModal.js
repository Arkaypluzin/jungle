"use client";
import { useState } from "react";

const MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];
const STATUS = ["Déclaré", "Validé", "Remboursé"];

export default function CreateNdfModal({ onNdfCreated }) {
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState("");
    const [year, setYear] = useState(new Date().getFullYear());
    const [statut, setStatut] = useState("Déclaré");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/ndf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ month, year, statut }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Erreur lors de la création");
            }
            setOpen(false);
            setMonth("");
            setYear(new Date().getFullYear());
            setStatut("Déclaré");
            if (onNdfCreated) onNdfCreated();
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    }

    return (
        <>
            <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
                onClick={() => setOpen(true)}
            >
                + Nouvelle note de frais
            </button>
            {open && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg shadow p-6 w-full max-w-md text-black">
                        <h2 className="text-lg font-semibold mb-3">Créer une note de frais</h2>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                            <label>
                                Mois :
                                <select
                                    className="ml-2 border px-2 py-1 rounded"
                                    value={month}
                                    required
                                    onChange={e => setMonth(e.target.value)}
                                >
                                    <option value="">Sélectionner…</option>
                                    {MONTHS.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Année :
                                <input
                                    type="number"
                                    className="ml-2 border px-2 py-1 rounded w-28"
                                    value={year}
                                    min={2020}
                                    max={2100}
                                    required
                                    onChange={e => setYear(e.target.value)}
                                />
                            </label>
                            <label>
                                Statut :
                                <select
                                    className="ml-2 border px-2 py-1 rounded"
                                    value={statut}
                                    required
                                    onChange={e => setStatut(e.target.value)}
                                >
                                    {STATUS.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </label>
                            {error && <div className="text-red-600">{error}</div>}
                            <div className="flex gap-2 mt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                >
                                    {loading ? "Création..." : "Créer"}
                                </button>
                                <button
                                    type="button"
                                    className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
                                    onClick={() => setOpen(false)}
                                    disabled={loading}
                                >
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}