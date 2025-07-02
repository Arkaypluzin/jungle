"use client";
import { useState } from "react";

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];
// Le statut "Déclaré" est le seul pertinent ici car c'est le statut initial d'une nouvelle NDF.
// const STATUS = ["Déclaré", "Validé", "Remboursé"]; // Non utilisé dans ce composant

export default function CreateNdfModal({ onNdfCreated }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  // Le statut est fixe à "Déclaré" pour la création, pas besoin d'état pour le choisir
  // const [statut, setStatut] = useState("Déclaré");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(""); // Réinitialiser l'erreur à chaque soumission
    try {
      const res = await fetch("/api/ndf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, statut: "Provisoire" }), // Envoyer le statut "Provisoire"
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          data.error || "Erreur lors de la création de la note de frais."
        );
      }
      // Réinitialiser les champs et fermer la modale après succès
      setOpen(false);
      setMonth("");
      setYear(new Date().getFullYear());
      // setStatut("Déclaré"); // Plus nécessaire car le statut est fixe
      if (onNdfCreated) onNdfCreated(); // Appeler le callback pour rafraîchir la liste
    } catch (err) {
      console.error("Erreur de soumission de la NDF:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Fonction pour fermer la modale et réinitialiser les états
  const handleClose = () => {
    setOpen(false);
    setMonth("");
    setYear(new Date().getFullYear());
    // setStatut("Déclaré"); // Plus nécessaire
    setError("");
    setLoading(false);
  };

  return (
    <>
      <button
        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
        onClick={() => setOpen(true)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-2"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
        Nouvelle note de frais
      </button>

      {open && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg relative transform transition-all scale-100 opacity-100 duration-300 ease-out">
            {/* Bouton de fermeture */}
            <button
              type="button"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              onClick={handleClose}
              disabled={loading}
              aria-label="Fermer la modale"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
              Créer une note de frais
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="month-select"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Mois :
                </label>
                <select
                  id="month-select"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={month}
                  required
                  onChange={(e) => setMonth(e.target.value)}
                >
                  <option value="">Sélectionner un mois...</option>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="year-input"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Année :
                </label>
                <input
                  type="number"
                  id="year-input"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={year}
                  min={2000} // Année minimale raisonnable
                  max={2100} // Année maximale raisonnable
                  required
                  onChange={(e) => setYear(parseInt(e.target.value))}
                />
              </div>

              {error && (
                <div
                  className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  className="px-5 py-2 bg-gray-200 text-gray-700 font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors duration-200"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || !month || !year} // Désactiver si champs vides
                  className="inline-flex items-center px-5 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {loading ? "Création..." : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
