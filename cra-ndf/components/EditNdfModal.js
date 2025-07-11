"use client";
import { useState } from "react";
import { Pencil } from "lucide-react";

const MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function EditNdfModal({ ndf, onEdited }) {
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState(ndf.month);
    const [year, setYear] = useState(ndf.year);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError("");

        const body = { month, year, statut: ndf.statut };

        const res = await fetch(`/api/ndf/${ndf.uuid}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            setError("Erreur lors de la modification");
        } else {
            setOpen(false);
            onEdited?.();
        }
        setLoading(false);
    }

    return (
        <>
            <button
                className="text-blue-600 p-2 rounded hover:bg-blue-100"
                title="Modifier"
                onClick={() => setOpen(true)}
                disabled={ndf.statut !== "Provisoire"}
            >
                <Pencil size={20} />
            </button>
            {open && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg shadow p-6 w-full max-w-md text-black">
                        <h2 className="text-lg font-semibold mb-3">Modifier la note de frais</h2>
                        {ndf.statut !== "Provisoire" ? (
                            <div className="text-red-600 font-bold my-8 text-center">
                                Impossible de modifier une note de frais non Provisoire.
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                                <label>
                                    Mois :
                                    <select
                                        className="ml-2 border px-2 py-1 rounded"
                                        value={month}
                                        required
                                        onChange={e => setMonth(e.target.value)}
                                    >
                                        {MONTHS.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    Année :
                                    <input
                                        type="number"
                                        className="ml-2 border px-2 py-1 rounded bg-gray-100 text-gray-700"
                                        value={year}
                                        disabled
                                        readOnly
                                    />
                                </label>
                                <label>
                                    Statut :
                                    <input
                                        type="text"
                                        className="ml-2 border px-2 py-1 rounded bg-gray-100 text-gray-700"
                                        value={ndf.statut}
                                        disabled
                                        readOnly
                                    />
                                </label>
                                {error && <div className="text-red-600">{error}</div>}
                                <div className="flex gap-2 mt-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                    >
                                        {loading ? "Modification..." : "Modifier"}
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
                        )}
                    </div>
                </div>
            )}
        </>
    );
}