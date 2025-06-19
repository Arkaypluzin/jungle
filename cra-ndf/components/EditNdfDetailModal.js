"use client";
import { useState } from "react";
import { Pencil } from "lucide-react";

const NATURES = ["carburant", "parking", "peage", "repas", "achat divers"];
const TVAS = ["autre taux", "multi-taux", "0%", "5.5%", "10%", "20%"];

export default function EditNdfDetailModal({ detail, onEdited }) {
    // Gestion intelligente des taux à l'ouverture
    const [tva, setTva] = useState(() => {
        if (detail.tva && detail.tva.includes("/")) return "multi-taux";
        if (TVAS.includes(detail.tva.split(" ")[0])) return detail.tva;
        return "autre taux";
    });

    const [autreTaux, setAutreTaux] = useState(() => {
        if (!TVAS.includes(detail.tva.split(" ")[0]) && !detail.tva.includes('/')) {
            return detail.tva;
        }
        return "";
    });

    const [multiTaux, setMultiTaux] = useState(() => {
        if (detail.tva && detail.tva.includes('/')) {
            return detail.tva.split("/").map(t => t.trim());
        }
        return [""];
    });

    const [open, setOpen] = useState(false);
    const [dateStr, setDateStr] = useState(detail.date_str); // toujours afficher la vraie date
    const [nature, setNature] = useState(detail.nature);
    const [description, setDescription] = useState(detail.description);
    const [montant, setMontant] = useState(detail.montant);
    const [imgFile, setImgFile] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        let img_url = detail.img_url;

        if (imgFile) {
            const formData = new FormData();
            formData.append("file", imgFile);
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            if (!res.ok) {
                setError("Erreur upload image");
                setLoading(false);
                return;
            }
            const data = await res.json();
            img_url = data.url;
        }

        let tvaValue = tva;
        if (tva === "autre taux") {
            tvaValue = autreTaux;
        }
        if (tva === "multi-taux") {
            tvaValue = multiTaux.filter(t => t).join(" / ");
        }

        const body = {
            date_str: dateStr,
            nature,
            description,
            tva: tvaValue,
            montant,
            img_url,
        };

        const res = await fetch(`/api/ndf_details/${detail.uuid}`, {
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

    function handleTvaInputChange(idx, value) {
        setMultiTaux((prev) => {
            const arr = [...prev];
            arr[idx] = value;
            return arr;
        });
    }
    function addMultiTauxField() {
        if (multiTaux.length < 3) setMultiTaux([...multiTaux, ""]);
    }
    function removeMultiTauxField(idx) {
        if (multiTaux.length > 1) setMultiTaux(multiTaux.filter((_, i) => i !== idx));
    }

    return (
        <>
            <button
                className="text-blue-600 p-2 rounded hover:bg-blue-100"
                title="Modifier"
                onClick={() => setOpen(true)}
            >
                <Pencil size={20} />
            </button>
            {open && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg shadow p-6 w-full max-w-md text-black">
                        <h2 className="text-lg font-semibold mb-3">Modifier la dépense</h2>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                            <label>
                                Date :
                                <input
                                    type="date"
                                    className="ml-2 border px-2 py-1 rounded"
                                    value={dateStr}
                                    required
                                    onChange={e => setDateStr(e.target.value)}
                                />
                            </label>
                            <label>
                                Nature :
                                <select
                                    className="ml-2 border px-2 py-1 rounded"
                                    value={nature}
                                    onChange={e => setNature(e.target.value)}
                                >
                                    {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </label>
                            <label>
                                Description :
                                <input
                                    type="text"
                                    className="ml-2 border px-2 py-1 rounded w-full"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </label>
                            <label>
                                TVA :
                                <select
                                    className="ml-2 border px-2 py-1 rounded"
                                    value={tva}
                                    onChange={e => { setTva(e.target.value); setAutreTaux(""); setMultiTaux([""]); }}
                                >
                                    {TVAS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </label>
                            {tva === "autre taux" && (
                                <input
                                    type="text"
                                    placeholder="Taux personnalisé (%)"
                                    className="border px-2 py-1 rounded"
                                    value={autreTaux}
                                    required
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val.includes("/")) {
                                            setTva("multi-taux");
                                            setMultiTaux(val.split("/").map(s => s.trim()));
                                            setAutreTaux("");
                                        } else {
                                            setAutreTaux(val);
                                        }
                                    }}
                                />
                            )}
                            {tva === "multi-taux" && (
                                <div className="flex flex-col gap-2">
                                    {multiTaux.map((val, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                placeholder={`Taux ${idx + 1}`}
                                                className="border px-2 py-1 rounded"
                                                value={val}
                                                required
                                                onChange={e => handleTvaInputChange(idx, e.target.value)}
                                            />
                                            {multiTaux.length > 1 && (
                                                <button type="button" onClick={() => removeMultiTauxField(idx)} className="text-red-500">-</button>
                                            )}
                                            {idx === multiTaux.length - 1 && multiTaux.length < 3 && (
                                                <button type="button" onClick={addMultiTauxField} className="text-green-600">+</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <label>
                                Montant (€) :
                                <input
                                    type="number"
                                    className="ml-2 border px-2 py-1 rounded"
                                    value={montant}
                                    min={0}
                                    step="0.01"
                                    required
                                    onChange={e => setMontant(e.target.value)}
                                />
                            </label>
                            <label>
                                Justificatif :
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="ml-2"
                                    onChange={e => setImgFile(e.target.files[0])}
                                />
                                {detail.img_url &&
                                    <a href={detail.img_url} target="_blank" rel="noopener noreferrer" className="ml-4 underline text-blue-800">Voir l’image</a>
                                }
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
                    </div>
                </div>
            )}
        </>
    );
}