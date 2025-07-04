"use client";
import { useState } from "react";

export default function RefuseNdfButton({ ndfId, onRefused }) {
    const [open, setOpen] = useState(false);
    const [motif, setMotif] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleRefuse() {
        setLoading(true);
        setError("");
        const res = await fetch(`/api/ndf/${ndfId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ statut: "Provisoire", motif_refus: motif }),
        });
        if (!res.ok) {
            const data = await res.json();
            setError(data?.error || "Erreur");
            setLoading(false);
            return;
        }
        setLoading(false);
        setOpen(false);
        setMotif("");
        if (onRefused) onRefused();
    }

    return (
        <>
            <button onClick={() => setOpen(true)} className="px-4 py-2 bg-red-600 text-white rounded">
                Refuser
            </button>
            {open && (
                <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
                    <div className="bg-white rounded shadow p-6 max-w-md w-full">
                        <h3 className="font-bold text-lg mb-4 text-black">Refuser la note de frais</h3>
                        <textarea
                            value={motif}
                            onChange={e => setMotif(e.target.value)}
                            className="w-full border p-2 rounded mb-2 text-black"
                            rows={3}
                            placeholder="Motif du refus (obligatoire)"
                        />
                        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setOpen(false)} className="px-4 py-2 bg-gray-200 rounded text-black">
                                Annuler
                            </button>
                            <button
                                onClick={handleRefuse}
                                disabled={loading || !motif.trim()}
                                className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
                            >
                                {loading ? "Refus..." : "Refuser"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}