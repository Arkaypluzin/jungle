"use client";
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
            if (!res.ok) throw new Error("Erreur lors de la validation");
            onValidated?.();
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    }

    return (
        <button
            onClick={handleValidate}
            disabled={loading}
            className="bg-green-700 text-white px-3 py-1 rounded hover:bg-green-800 text-sm ml-2"
            title="Valider la note de frais"
        >
            {loading ? "Validation..." : "Valider"}
        </button>
    );
}