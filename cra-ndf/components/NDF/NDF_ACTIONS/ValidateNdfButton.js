"use client";
import { useState } from "react";

export default function ValidateNdfButton({ ndfId, ndfStatut, onValidated }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleValidate() {
        setLoading(true);
        setError("");
        const res = await fetch(`/api/ndf/${ndfId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ statut: "Validé" }),
        });
        if (!res.ok) {
            setError("Impossible de valider");
        } else {
            onValidated?.();
        }
        setLoading(false);
    }

    if (ndfStatut === "Déclaré") {
        return (
            <div className="flex gap-2">
                <button
                    className="bg-green-700 text-white px-3 py-1 rounded hover:bg-green-800 text-sm"
                    onClick={handleValidate}
                    disabled={loading}
                    title="Valider"
                >
                    {loading ? "Validation..." : "Valider"}
                </button>
                {error && <span className="text-red-600 text-xs ml-2">{error}</span>}
            </div>
        );
    }

    if (ndfStatut === "Validé") {
        return (
            <button
                className="bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-800 text-sm"
                onClick={async () => {
                    setLoading(true);
                    setError("");
                    const res = await fetch(`/api/ndf/${ndfId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ statut: "Remboursé" }),
                    });
                    if (!res.ok) {
                        setError("Impossible de rembourser");
                    } else {
                        onValidated?.();
                    }
                    setLoading(false);
                }}
                disabled={loading}
                title="Rembourser"
            >
                {loading ? "Remboursement..." : "Rembourser"}
            </button>
        );
    }

    return null;
}