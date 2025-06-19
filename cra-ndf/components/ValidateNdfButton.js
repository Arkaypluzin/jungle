'use client';
import { useState } from "react";

export default function ValidateNdfButton({ ndfId, ndfStatut, onValidated }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (ndfStatut !== "Déclaré") return null;

    async function handleValidate() {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/ndf/${ndfId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ statut: "Validé" }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Erreur lors de la validation");
            } else {
                onValidated?.();
            }
        } catch (e) {
            setError("Erreur réseau");
        }
        setLoading(false);
    }

    return (
        <button
            onClick={handleValidate}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
            disabled={loading}
        >
            {loading ? "Validation…" : "Valider"}
            {error && <span className="text-red-500 ml-2">{error}</span>}
        </button>
    );
}