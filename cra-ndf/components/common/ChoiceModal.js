"use client";

import React from "react";

/**
 * ChoiceModal
 * -----------
 * Petit modal de choix avec un titre et une liste de boutons d’options.
 * props:
 * - isOpen (bool)
 * - onClose (fn)
 * - title (string)
 * - options: [{ label, onClick, disabled, title? }]
 */
export default function ChoiceModal({ isOpen, onClose, title, options = [] }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                </div>

                <div className="p-4 space-y-2">
                    {options.map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={opt.onClick}
                            disabled={opt.disabled}
                            title={opt.title}
                            className={`w-full text-left px-4 py-3 rounded-lg border shadow-sm hover:shadow-md transition ${opt.disabled
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-white hover:bg-gray-50"
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}