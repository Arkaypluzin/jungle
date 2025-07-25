"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export default function DeleteNdfButton({ ndfId, ndfStatut, onDeleted }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);

    const isDeclared = ndfStatut === "Déclaré";

    const handleDelete = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/ndf/${ndfId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Erreur lors de la suppression");
            setOpen(false);
            onDeleted?.();
        } catch (e) {
            setError(e.message);
        }
        setLoading(false);
    };

    return (
        <>
            <button
                className="text-red-600 p-2 rounded hover:bg-red-100 ml-1"
                title="Supprimer"
                onClick={() => setOpen(true)}
                disabled={loading || ndfStatut !== "Provisoire"}
            >
                <Trash2 size={20} />
            </button>
            {open && ndfStatut === "Provisoire" && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded shadow-lg text-black max-w-sm w-full">
                        {isDeclared ? (
                            <>
                                <h3 className="text-lg font-bold mb-4 text-red-600">Suppression impossible</h3>
                                <p className="text-red-600 mb-4">Vous ne pouvez pas supprimer une note de frais déclarée.</p>
                                <div className="flex gap-2 mt-5 justify-end">
                                    <button
                                        onClick={() => setOpen(false)}
                                        className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
                                        disabled={loading}
                                    >
                                        Fermer
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="text-lg font-bold mb-4">Confirmer la suppression</h3>
                                <p>Voulez-vous vraiment supprimer cette note de frais ?</p>
                                {error && <div className="text-red-600 mt-2">{error}</div>}
                                <div className="flex gap-2 mt-5 justify-end">
                                    <button
                                        onClick={() => setOpen(false)}
                                        className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
                                        disabled={loading}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                                        disabled={loading}
                                    >
                                        {loading ? "Suppression..." : "Supprimer"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            {open && ndfStatut !== "Provisoire" && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded shadow-lg text-black max-w-sm w-full">
                        <div className="text-red-600 font-bold text-center mb-2">
                            Impossible de supprimer une note de frais non Provisoire.
                        </div>
                        <button
                            className="bg-gray-300 text-gray-800 px-4 py-2 rounded mt-4 w-full"
                            onClick={() => setOpen(false)}
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}