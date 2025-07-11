"use client";
import { useState, useEffect } from "react";

const MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default function EditNdfModal({ ndf, onEdited }) {
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState(ndf.month);
    const [year, setYear] = useState(ndf.year);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [disabledMonths, setDisabledMonths] = useState([]);

    useEffect(() => {
        async function fetchUserNdfs() {
            const res = await fetch("/api/ndf", { cache: "no-store" });
            if (!res.ok) return;
            const data = await res.json();
            const monthsUsed = data
                .filter(
                    (item) =>
                        String(item.year) === String(year) &&
                        item.uuid !== ndf.uuid
                )
                .map((item) => item.month);
            setDisabledMonths(monthsUsed);
        }
        fetchUserNdfs();
    }, [year, ndf.uuid]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/ndf/${ndf.uuid}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ month, year }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Erreur lors de la modification.");
            }
            setOpen(false);
            if (onEdited) onEdited();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                className="px-3 py-2 bg-blue-500 text-white rounded shadow"
                onClick={() => setOpen(true)}
            >
                Modifier
            </button>
            {open && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 text-black">
                    <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-lg">
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                            aria-label="Fermer"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <h2 className="text-xl font-bold mb-4 text-black">Modifier la note de frais</h2>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block mb-1 text-sm font-medium">Mois :</label>
                                <select
                                    value={month}
                                    onChange={e => setMonth(e.target.value)}
                                    required
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    {MONTHS.map(m => (
                                        <option
                                            key={m}
                                            value={m}
                                            disabled={disabledMonths.includes(m)}
                                        >
                                            {m} {disabledMonths.includes(m) ? "(déjà utilisé)" : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium">Année :</label>
                                <input
                                    type="number"
                                    value={year}
                                    disabled
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                                    readOnly
                                />
                            </div>
                            {error && <div className="text-red-600">{error}</div>}
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-red-600 rounded text-white"
                                    onClick={() => setOpen(false)}
                                    disabled={loading}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-green-600 text-white rounded"
                                    disabled={loading}
                                >
                                    {loading ? "Sauvegarde..." : "Enregistrer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
