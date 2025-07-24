"use client";
import { useState } from "react";

export default function DeclareNdfButton({ ndfId, currentStatut }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleDeclare = async () => {
        setLoading(true);
        setError("");
        setSuccess(false);

        try {
            const res = await fetch(`/api/ndf/${ndfId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ statut: "Déclaré" })
            });
            if (!res.ok) throw new Error("Erreur lors de la déclaration");
            setSuccess(true);
            window.location.reload();
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    };

    if (currentStatut !== "Provisoire") return null;

    return (
        <div className="my-4">
            <button
                onClick={handleDeclare}
                disabled={loading}
                className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 font-semibold"
            >
                {loading ? "Déclaration en cours..." : "Déclarer la note de frais"}
            </button>
            {error && <div className="text-red-600 mt-2">{error}</div>}
            {success && <div className="text-green-600 mt-2">Note de frais déclarée !</div>}
        </div>
    );
}