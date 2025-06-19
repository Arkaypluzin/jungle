"use client";
import { useState } from "react";

export default function ValidateNdfButton({ ndfId, ndfStatut, onValidated }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleValidate() {
        setLoading(true);
        setError("");

        let nextStatut = null;
        if (ndfStatut === "Déclaré") nextStatut = "Validé";
        if (ndfStatut === "Validé") nextStatut = "Remboursé";
        if (!nextStatut) {
            setError("Action impossible.");
            setLoading(false);
            return;
        }

        const res = await fetch(`/api/ndf/${ndfId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ statut: nextStatut }),
        });
        if (!res.ok) {
            setError("Impossible de valider/rembourser");
        } else {
            onValidated?.();
        }
        setLoading(false);
    }

    if (ndfStatut === "Déclaré") {
        return (
            <button
                className="bg-green-700 text-white px-3 py-1 rounded hover:bg-green-800 text-sm"
                onClick={handleValidate}
                disabled={loading}
                title="Valider"
            >
                {loading ? "Validation..." : "Valider"}
            </button>
        );
    }

    if (ndfStatut === "Validé") {
        return (
            <button
                className="bg-green-700 text-white px-3 py-1 rounded hover:bg-blue-800 text-sm"
                onClick={handleValidate}
                disabled={loading}
                title="Rembourser"
            >
                {loading ? "Remboursement..." : "Rembourser"}
            </button>
        );
    }

    return null;
}