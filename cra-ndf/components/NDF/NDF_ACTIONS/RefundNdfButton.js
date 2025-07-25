"use client";
import { useState } from "react";

export default function RefundNdfButton({ ndfId, ndfStatut, onRefunded }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function handleRefund() {
        setLoading(true);
        setError("");
        setSuccess("");
        const res = await fetch(`/api/ndf/${ndfId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ statut: "Remboursé" }),
        });
        if (!res.ok) {
            setError("Impossible de passer au statut 'Remboursé'.");
        } else {
            setSuccess("Statut changé !");
            onRefunded?.();
        }
        setLoading(false);
    }

    if (ndfStatut !== "Validé") return null;

    return (
        <button
            className="bg-green-700 text-white px-3 py-1 rounded hover:bg-green-800 text-sm"
            onClick={handleRefund}
            disabled={loading}
        >
            {loading ? "Changement..." : "Rembourser"}
        </button>
    );
}