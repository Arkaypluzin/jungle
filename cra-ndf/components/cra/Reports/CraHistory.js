"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { format, parseISO, isValid as isValidDateFns } from "date-fns";
import { fr } from "date-fns/locale";
import CraBoard from "@/components/cra/Board/CraBoard";

/* ---------------------------------- */
/* Utils Dates                        */
/* ---------------------------------- */

/** Normalise une valeur (ISO string / Date / timestamp / autre) en Date valide ou null */
function normalizeToDate(v) {
  if (!v) return null;
  if (v instanceof Date) return isValidDateFns(v) ? v : null;
  if (typeof v === "number") {
    const d = new Date(v);
    return isValidDateFns(d) ? d : null;
  }
  if (typeof v === "string") {
    const parsed = parseISO(v);
    if (isValidDateFns(parsed)) return parsed;
    const d = new Date(v);
    return isValidDateFns(d) ? d : null;
  }
  return null;
}

/** Format standard UI pour les dates (jour/mois/année + heure) */
function fmt(date) {
  return date ? format(date, "dd/MM/yyyy HH:mm", { locale: fr }) : "N/A";
}

/** Nom du mois (fr) à partir (year, month 1..12) */
function monthName(year, month) {
  const d = new Date(year, (parseInt(month, 10) || 1) - 1, 1);
  return format(d, "MMMM", { locale: fr });
}

/* ---------------------------------- */
/* UI Helpers                         */
/* ---------------------------------- */

/** Classes & labels par statut */
const STATUS_STYLES = {
  pending_review: "bg-blue-100 text-blue-800",
  validated: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  draft: "bg-gray-100 text-gray-800",
};
const STATUS_LABELS = {
  pending_review: "En attente",
  validated: "Validé",
  rejected: "Rejeté",
  draft: "Brouillon",
};

/** Badge compact pour le statut d’un rapport */
function StatusBadge({ status, labelOverride }) {
  const cls = STATUS_STYLES[status] || STATUS_STYLES.draft;
  const label = labelOverride || STATUS_LABELS[status] || STATUS_LABELS.draft;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

/** Retourne la date d’envoi (fallback reviewedAt -> updatedAt -> submittedAt) */
function getSentDate(report) {
  return (
    normalizeToDate(report?.reviewedAt) ||
    normalizeToDate(report?.updatedAt) ||
    normalizeToDate(report?.submittedAt)
  );
}

/** Retourne la date de validation/révision (si statut !== pending) */
function getValidatedDate(report) {
  if (!report || report.status === "pending_review") return null;
  return normalizeToDate(report?.reviewedAt) || normalizeToDate(report?.updatedAt);
}

export default function CraHistory({
  userFirstName,
  showMessage,
  clientDefinitions,
  activityTypeDefinitions,
}) {
  /* ---------------------------------- */
  /* Session / état principal            */
  /* ---------------------------------- */

  const { data: session, status } = useSession();
  const currentUserId = session?.user?.id;
  const currentUserName =
    userFirstName || session?.user?.name?.split(" ")[0] || "Utilisateur";

  const [monthlyReports, setMonthlyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ---------------------------------- */
  /* Modal (CraBoard)                   */
  /* ---------------------------------- */

  const [showCraBoardModal, setShowCraBoardModal] = useState(false);
  const [craBoardReportData, setCraBoardReportData] = useState(null);
  // meta = { craStatus, cpStatus, craValidatedAt, cpValidatedAt }
  const [modalMeta, setModalMeta] = useState(null);

  /* ---------------------------------- */
  /* Fetch des rapports de l’utilisateur */
  /* ---------------------------------- */

  const fetchSentMonthlyReports = useCallback(async () => {
    // AbortController pour éviter des setState sur composants démontés
    const controller = new AbortController();

    if (!currentUserId) {
      setLoading(false);
      return () => controller.abort();
    }

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({ userId: currentUserId });
      const res = await fetch(`/api/monthly_cra_reports?${queryParams}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        let message = "Échec de la récupération de l'historique des rapports.";
        try {
          const e = await res.json();
          message = e?.message || message;
        } catch {
          /* ignore JSON parse */
        }
        throw new Error(message);
      }

      const data = await res.json();
      setMonthlyReports(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      if (err.name === "AbortError") return; // requête annulée
      console.error("[CraHistory] fetch error:", err);
      setError(err.message);
      showMessage?.(
        `Erreur lors du chargement de l'historique: ${err.message}`,
        "error"
      );
      setMonthlyReports([]);
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  }, [currentUserId, showMessage]);

  useEffect(() => {
    if (status === "authenticated" && currentUserId) {
      const abort = fetchSentMonthlyReports();
      return () => {
        // Si fetchSentMonthlyReports a retourné un cleanup
        if (typeof abort === "function") abort();
      };
    } else if (status !== "loading") {
      setLoading(false);
    }
  }, [status, currentUserId, fetchSentMonthlyReports]);

  /* ---------------------------------- */
  /* Données dérivées (mémoïsées)       */
  /* ---------------------------------- */

  // 1) Sécurité : ne garde que les rapports de l’utilisateur connecté
  const myReports = useMemo(
    () => (monthlyReports || []).filter((r) => r.user_id === currentUserId),
    [monthlyReports, currentUserId]
  );

  // 2) Groupes (mois, année) => { year, month, cra, paid }
  const groups = useMemo(() => {
    const map = new Map(); // clé = `${year}-${month}`
    for (const r of myReports) {
      const key = `${r.year}-${r.month}`;
      const entry =
        map.get(key) || { year: r.year, month: r.month, cra: null, paid: null };
      if (r.report_type === "paid_leave") entry.paid = r;
      else entry.cra = r; // défaut: CRA
      map.set(key, entry);
    }
    // du + récent au + ancien
    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [myReports]);

  // 3) Création d'une version enrichie de `activityTypeDefinitions` pour inclure les jours fériés.
  // Correction: On s'assure que le résultat est un tableau, car CraBoard attend un tableau.
  const augmentedActivityTypeDefinitions = useMemo(() => {
    // Si la prop est un objet, on la convertit en tableau de valeurs
    const originalTypes = Array.isArray(activityTypeDefinitions) ? activityTypeDefinitions : Object.values(activityTypeDefinitions);
    return [
      ...originalTypes,
      {
        id: "holiday-leave", // ID unique pour ce type
        name: "Jour Férié",
        color: "gray-400", 
      },
    ];
  }, [activityTypeDefinitions]);

  /* ---------------------------------- */
  /* Handlers                           */
  /* ---------------------------------- */

  /**
   * Ouvre le modal avec :
   * - activités CRA + CP + Jours Fériés fusionnées et triées
   * - méta (statuts + dates de validation au niveau rapport)
   */
  const handleViewDetailsGroup = useCallback(
    async (group) => {
      try {
        // Déclenche les trois requêtes en parallèle (CRA, CP, Jours Fériés)
        const [craDetail, paidDetail, holidaysResponse] = await Promise.all([
          group.cra?.id
            ? fetch(`/api/monthly_cra_reports/${group.cra.id}`).then((r) =>
                r.ok ? r.json() : null
              )
            : Promise.resolve(null),
          group.paid?.id
            ? fetch(`/api/monthly_cra_reports/${group.paid.id}`).then((r) =>
                r.ok ? r.json() : null
              )
            : Promise.resolve(null),
          fetch(`/api/public_holidays?year=${group.year}&countryCode=FR`).then((r) =>
            r.ok ? r.json() : []
          ),
        ]);

        // Dates de validation (rapport) si statut non pending
        const craValidatedAt = getValidatedDate(craDetail);
        const cpValidatedAt = getValidatedDate(paidDetail);

        // Helper : format d’une activité, avec héritage validatedAt depuis le rapport parent
        const formatActivities = (items, tag) => {
          if (!Array.isArray(items)) return [];
          return items
            .map((activity) => {
              let dateObj = null;
              if (typeof activity.date_activite === "string") {
                const p = parseISO(activity.date_activite);
                dateObj = isValidDateFns(p)
                  ? p
                  : normalizeToDate(activity.date_activite);
              } else if (activity.date_activite) {
                dateObj = normalizeToDate(activity.date_activite);
              }

              const inheritedValidated =
                tag === "CRA" ? craValidatedAt : cpValidatedAt;

              return {
                ...activity,
                __kind: tag, // "CRA" ou "CP"
                date_activite: isValidDateFns(dateObj) ? dateObj : null,
                client_id: activity.client_id ? String(activity.client_id) : null,
                type_activite: String(activity.type_activite || tag),
                status: activity.status || "draft",
                id: activity.id || activity._id?.toString(),
                validatedAt:
                  normalizeToDate(activity.validatedAt) || inheritedValidated || null,
              };
            })
            .filter(
              (a) => a.date_activite !== null && isValidDateFns(a.date_activite)
            );
        };

        const craActs = craDetail
          ? formatActivities(craDetail.activities_snapshot, "CRA")
          : [];
        const cpActs = paidDetail
          ? formatActivities(paidDetail.activities_snapshot, "CP")
          : [];

        // Formate les jours fériés récupérés pour le mois en cours
        const holidays = (holidaysResponse || [])
          .filter(h => parseISO(h.date).getMonth() === group.month - 1 && parseISO(h.date).getFullYear() === group.year)
          .map(h => ({
            id: `holiday-${h.date}`,
            client_id: null,
            client_label: "Jours fériés", // CHANGEMENT : ajout du libellé client
            date_activite: parseISO(h.date),
            description: h.name,
            notes: "Jour férié en France",
            type_activite: "holiday-leave",
            __kind: "Holiday",
            status: "validated",
            isDayOff: true, // AJOUT : Marque le jour comme non travaillé
          }));

        // Fusionne et trie toutes les activités
        const combinedActivities = [...craActs, ...cpActs, ...holidays].sort(
          (a, b) => a.date_activite.getTime() - b.date_activite.getTime()
        );

        const currentMonthDate = new Date(group.year, group.month - 1, 1);

        setModalMeta({
          craStatus: group.cra?.status || null,
          cpStatus: group.paid?.status || null,
          craValidatedAt,
          cpValidatedAt,
        });

        const monthlyReportsForModal = [];
        if (craDetail) monthlyReportsForModal.push(craDetail);
        if (paidDetail) monthlyReportsForModal.push(paidDetail);

        setCraBoardReportData({
          userId: currentUserId,
          userFirstName: currentUserName,
          currentMonth: currentMonthDate,
          activities: combinedActivities,
          monthlyReports: monthlyReportsForModal,
        });

        setShowCraBoardModal(true);
      } catch (err) {
        console.error("[CraHistory] Erreur détail group:", err);
        showMessage?.(`Erreur: ${err.message}`, "error");
      }
    },
    [currentUserId, currentUserName, showMessage]
  );

  const handleCloseCraBoardModal = useCallback(() => {
    setShowCraBoardModal(false);
    setCraBoardReportData(null);
    setModalMeta(null);
  }, []);

  /* ---------------------------------- */
  /* Rendus conditionnels (chargement)  */
  /* ---------------------------------- */

  if (status === "loading" || loading) {
    return (
      <div
        className="flex justify-center items-center h-64 text-xl text-gray-700"
        aria-busy="true"
      >
        Chargement de l'historique...
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="text-red-500 text-center py-8 text-lg">
        Vous devez être connecté pour voir votre historique.
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-8 text-lg">Erreur: {error}</div>
    );
  }

  /* ---------------------------------- */
  /* Rendu principal                    */
  /* ---------------------------------- */

  return (
    <div className="bg-white shadow-xl ring-1 ring-gray-200 rounded-2xl p-6 sm:p-8 w-full mt-8">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6 text-center tracking-tight">
        Historique de mes rapports envoyés (CRA &amp; Congés payés)
      </h2>

      {groups.length === 0 ? (
        <div className="text-gray-600 text-center py-10 text-lg">
          Aucun rapport envoyé trouvé.
        </div>
      ) : (
        /* Empilement vertical en pleine largeur */
        <div className="flex flex-col gap-4 sm:gap-6">
          {groups.map((g) => {
            const cra = g.cra;
            const cp = g.paid;

            // Dates d’envoi (UI) par type
            const craSent = cra ? getSentDate(cra) : null;
            const cpSent = cp ? getSentDate(cp) : null;

            // Dates validées (UI) par type
            const craVal = cra ? getValidatedDate(cra) : null;
            const cpVal = cp ? getValidatedDate(cp) : null;

            return (
              <div
                key={`${g.year}-${g.month}`}
                className="w-full rounded-xl border border-gray-200 bg-gradient-to-r from-white to-gray-50 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
              >
                {/* Header bloc */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="text-xl font-semibold text-gray-900 capitalize">
                      {monthName(g.year, g.month)} {g.year}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      {cra && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">CRA :</span>
                          <StatusBadge status={cra.status} />
                        </div>
                      )}
                      {cp && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            Congés payés :
                          </span>
                          <StatusBadge status={cp.status} />
                        </div>
                      )}
                      {!cra && !cp && (
                        <StatusBadge status="draft" labelOverride="Aucun" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Détails dates */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                  {cra && (
                    <>
                      <div className="flex justify-between rounded-lg bg-white/70 px-3 py-2 ring-1 ring-gray-100">
                        <span className="text-gray-500">CRA – Envoyé le</span>
                        <span className="font-medium">{fmt(craSent)}</span>
                      </div>
                      {craVal && (
                        <div className="flex justify-between rounded-lg bg-white/70 px-3 py-2 ring-1 ring-gray-100">
                          <span className="text-gray-500">CRA – Validé le</span>
                          <span className="font-medium">{fmt(craVal)}</span>
                        </div>
                      )}
                    </>
                  )}

                  {cp && (
                    <>
                      <div className="flex justify-between rounded-lg bg-white/70 px-3 py-2 ring-1 ring-gray-100">
                        <span className="text-gray-500">
                          Congés payés – Envoyé le
                        </span>
                        <span className="font-medium">{fmt(cpSent)}</span>
                      </div>
                      {cpVal && (
                        <div className="flex justify-between rounded-lg bg-white/70 px-3 py-2 ring-1 ring-gray-100">
                          <span className="text-gray-500">
                            Congés payés – Validé le
                          </span>
                          <span className="font-medium">{fmt(cpVal)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => handleViewDetailsGroup(g)}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    aria-label={`Voir les détails pour ${monthName(
                      g.year,
                      g.month
                    )} ${g.year}`}
                  >
                    {/* petit œil inline pour plus de feedback visuel */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Voir les détails
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal calendrier fusionné CRA + CP */}
      {showCraBoardModal && craBoardReportData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Détails du rapport"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col ring-1 ring-gray-200">
            {/* Header modal */}
            <div className="flex justify-between items-start p-4 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Détails du rapport pour {craBoardReportData.userFirstName} —{" "}
                  {format(craBoardReportData.currentMonth, "MMMM yyyy", {
                    locale: fr,
                  })}
                </h3>

                {/* Statuts + dates validées (niveau rapport) */}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {modalMeta?.craStatus && (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-gray-500">CRA :</span>
                      <StatusBadge status={modalMeta.craStatus} />
                      {modalMeta.craStatus === "validated" &&
                        modalMeta.craValidatedAt && (
                          <span className="text-gray-500">
                            • Validé le {fmt(modalMeta.craValidatedAt)}
                          </span>
                        )}
                      {modalMeta.craStatus === "rejected" &&
                        modalMeta.craValidatedAt && (
                          <span className="text-gray-500">
                            • Révisé le {fmt(modalMeta.craValidatedAt)}
                          </span>
                        )}
                    </div>
                  )}
                  {modalMeta?.cpStatus && (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-gray-500">Congés payés :</span>
                      <StatusBadge status={modalMeta.cpStatus} />
                      {modalMeta.cpStatus === "validated" &&
                        modalMeta.cpValidatedAt && (
                          <span className="text-gray-500">
                            • Validé le {fmt(modalMeta.cpValidatedAt)}
                          </span>
                        )}
                      {modalMeta.cpStatus === "rejected" &&
                        modalMeta.cpValidatedAt && (
                          <span className="text-gray-500">
                            • Révisé le {fmt(modalMeta.cpValidatedAt)}
                          </span>
                        )}
                    </div>
                  )}
                </div>

                <p className="mt-1 text-xs text-gray-500">
                  * Chaque activité possède un statut et une date de validation
                  (héritée du rapport si absente). Les congés payés et jours
                  fériés sont intégrés au même calendrier.
                </p>
              </div>

              <button
                onClick={handleCloseCraBoardModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                aria-label="Fermer"
              >
                &times;
              </button>
            </div>

            {/* Corps modal */}
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
              <CraBoard
                userId={craBoardReportData.userId}
                userFirstName={craBoardReportData.userFirstName}
                activities={craBoardReportData.activities}
                activityTypeDefinitions={augmentedActivityTypeDefinitions}
                clientDefinitions={clientDefinitions}
                monthlyReports={craBoardReportData.monthlyReports}
                currentMonth={craBoardReportData.currentMonth}
                readOnly={true}
                showMessage={showMessage}
                isReviewMode={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
