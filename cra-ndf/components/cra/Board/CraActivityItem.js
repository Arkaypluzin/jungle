"use client";


import React, { useCallback, useMemo } from "react";

/* ──────────────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────────────────*/

/** Normalise une valeur en string (ou null) pour comparer des IDs. */
const s = (v) => (v === null || v === undefined ? null : String(v));

/** Essaye plusieurs champs possibles (name/label/nom_client...) et retourne le 1er défini. */
const pickLabel = (...candidates) => {
  for (const c of candidates) {
    const v = typeof c === "string" ? c : c ?? null;
    if (v && String(v).trim()) return String(v);
  }
  return null;
};

/** Icône ✓ / ✗ (facturable) — petit helper pour limiter le JSX dans le return. */
const BillableMark = ({ isBillable }) => (
  <span className={isBillable ? "ml-1 text-green-600" : "ml-1 text-red-600"} title={isBillable ? "Facturable" : "Non facturable"}>
    {isBillable ? "✔" : "✖"}
  </span>
);

/* ──────────────────────────────────────────────────────────────────────────────
 * Composant
 * ──────────────────────────────────────────────────────────────────────────────*/

function CraActivityItemBase({
  activity,
  activityTypeDefinitions,
  clientDefinitions,
  handleActivityClick,
  requestDeleteFromCalendar,
  showMessage,
  readOnly,
  userId,
  userFirstName,
  isCraEditable,
  isPaidLeaveEditable,
  paidLeaveTypeId,
  onDragStartActivity, // fourni par CraBoard
}) {
  /* ────────────────────────────────────────────────────────────────────────
   * Résolution définitions (type & client)
   * ────────────────────────────────────────────────────────────────────────*/
  const typeDef = useMemo(() => {
    const id = s(activity?.type_activite);
    if (!id) return undefined;
    return activityTypeDefinitions.find((t) => s(t?.id) === id);
  }, [activity?.type_activite, activityTypeDefinitions]);

  const clientDef = useMemo(() => {
    const id = s(activity?.client_id);
    if (!id) return undefined;
    return clientDefinitions.find((c) => s(c?.id) === id);
  }, [activity?.client_id, clientDefinitions]);

  /* ────────────────────────────────────────────────────────────────────────
   * Détection “absence” (congés payés & co)
   * - via id égal au type Congé Payé détecté par CraBoard
   * - via __kind remonté par l’agrégation (CP / paid_leave)
   * - via drapeau is_absence
   * - via code/type "cp" / "paid_leave" si présent
   * ────────────────────────────────────────────────────────────────────────*/
  const isPaidLeaveActivity = useMemo(() => {
    const fromId = s(activity?.type_activite) === s(paidLeaveTypeId);
    const fromKind = activity?.__kind === "CP" || activity?.__kind === "paid_leave";
    const fromAbsenceFlag = activity?.is_absence === true;
    const code = String(typeDef?.code || "").toLowerCase();
    const fromCode = code === "cp" || code === "paid_leave";
    return fromId || fromKind || fromAbsenceFlag || fromCode;
  }, [activity?.type_activite, activity?.__kind, activity?.is_absence, paidLeaveTypeId, typeDef?.code]);

  /* ────────────────────────────────────────────────────────────────────────
   * Libellés (ordre de confiance : defs -> champs enrichis -> DB -> fallback)
   * ────────────────────────────────────────────────────────────────────────*/
  const typeLabel = useMemo(() => {
    return (
      pickLabel(
        typeDef?.name,
        activity?.display_type_label, // injecté côté calendrier
        activity?.activityTypeName,   // éventuelle jointure côté API
        activity?.type_label
      ) || (isPaidLeaveActivity ? "Congés payés" : "Activité")
    );
  }, [typeDef?.name, activity?.display_type_label, activity?.activityTypeName, activity?.type_label, isPaidLeaveActivity]);

  const clientLabel = useMemo(() => {
    const label = pickLabel(
      clientDef?.name,       // format le plus courant
      clientDef?.nom_client, // certains schémas
      clientDef?.label,
      activity?.display_client_label,
      activity?.clientName,
      activity?.client_label
    );
    // Retourne null si le label est 'Non attribué', sinon retourne le label
    return (label && label !== 'Non attribué') ? label : null;
  }, [clientDef?.name, clientDef?.nom_client, clientDef?.label, activity?.display_client_label, activity?.clientName, activity?.client_label]);


  /* ────────────────────────────────────────────────────────────────────────
   * Valeurs calculées / styles
   * ────────────────────────────────────────────────────────────────────────*/
  const timeSpentValue = useMemo(() => {
    const n = parseFloat(activity?.temps_passe);
    return Number.isFinite(n) ? n : null;
  }, [activity?.temps_passe]);

  const displayLabel = useMemo(() => {
    return `${typeLabel}${timeSpentValue ? ` (${timeSpentValue}j)` : ""}`;
  }, [typeLabel, timeSpentValue]);

  // Couleurs par type
  const typeColorClass = useMemo(() => {
    if (isPaidLeaveActivity) return "bg-red-200 text-red-800";
    if (activity?.is_absence) return "bg-orange-200 text-orange-800";
    if (typeDef?.is_overtime) return "bg-purple-200 text-purple-800";
    return "bg-lime-200 text-lime-800"; // CRA “classique”
  }, [isPaidLeaveActivity, activity?.is_absence, typeDef?.is_overtime]);

  // Drapeaux issus de la définition (fallback sur le document si présent)
  const isBillable = (typeDef?.is_billable ?? activity?.is_billable) || false;
  const requiresClient = (typeDef?.requires_client ?? activity?.requires_client) || false;
  const isOvertime = (typeDef?.is_overtime ?? activity?.is_overtime) || false;

  const overrideLabel = activity?.override_non_working_day ? " (Dérogation)" : "";

  // Pastille statut
  const { statusColorClass, statusDisplayChar, statusTitle } = useMemo(() => {
    switch (activity?.status) {
      case "finalized":
        return { statusColorClass: "bg-green-300 text-green-900", statusDisplayChar: "F", statusTitle: "Finalisé" };
      case "validated":
        return { statusColorClass: "bg-purple-300 text-purple-900", statusDisplayChar: "V", statusTitle: "Validé" };
      case "pending_review":
        return { statusColorClass: "bg-blue-300 text-blue-900", statusDisplayChar: "A", statusTitle: "En attente de révision" };
      case "rejected":
        return { statusColorClass: "bg-red-300 text-red-900", statusDisplayChar: "R", statusTitle: "Rejeté" };
      default:
        return { statusColorClass: "bg-gray-300 text-gray-800", statusDisplayChar: "", statusTitle: "Brouillon" };
    }
  }, [activity?.status]);

  const isLocked = useMemo(
    () => ["finalized", "validated", "pending_review"].includes(activity?.status),
    [activity?.status]
  );

  /* ────────────────────────────────────────────────────────────────────────
   * Droits & interactions
   * ────────────────────────────────────────────────────────────────────────*/
  const canModifyActivity = useCallback(() => {
    // propriétaire uniquement
    if (s(activity?.user_id) !== s(userId)) return false;
    // statut modifiable
    if (!["draft", "rejected"].includes(activity?.status)) return false;

    // droits selon type (CRA vs Absence)
    const isCRA = !isPaidLeaveActivity;
    if (isCRA && !isCraEditable) return false;
    if (!isCRA && !isPaidLeaveEditable) return false;

    return true;
  }, [activity?.user_id, activity?.status, userId, isCraEditable, isPaidLeaveEditable, isPaidLeaveActivity]);

  const isDraggable = !readOnly && canModifyActivity();

  const onClickItem = useCallback(
    (e) => {
      e.stopPropagation();
      if (!readOnly && canModifyActivity()) {
        handleActivityClick?.(activity);
      } else {
        showMessage?.("Cette activité n'est pas modifiable.", "info");
      }
    },
    [readOnly, canModifyActivity, handleActivityClick, activity, showMessage]
  );

  const onStartDrag = useCallback(
    (e) => {
      e.stopPropagation();
      if (isDraggable && onDragStartActivity) {
        onDragStartActivity(e, activity);
      } else {
        e.preventDefault();
      }
    },
    [isDraggable, onDragStartActivity, activity]
  );

  const onDelete = useCallback(
    (e) => {
      e.stopPropagation();
      requestDeleteFromCalendar?.(activity?.id, e);
    },
    [requestDeleteFromCalendar, activity?.id]
  );

  /* ────────────────────────────────────────────────────────────────────────
   * Title (tooltip) — information compacte au survol
   * ────────────────────────────────────────────────────────────────────────*/
  const titleAttr = useMemo(() => {
    const t = timeSpentValue ? `${timeSpentValue}j` : "N/A";
    const desc = activity?.description_activite || "N/A";
    const clientText = clientLabel ? `Client: ${clientLabel}` : "";
    
    return `
${clientText}
Type: ${typeLabel}
Temps: ${t}
Description: ${desc}${overrideLabel ? "\nDérogation jour non ouvrable" : ""}
Statut: ${statusTitle}
Facturable: ${isBillable ? "Oui" : "Non"}
Client requis: ${requiresClient ? "Oui" : "Non"}
Heures sup: ${isOvertime ? "Oui" : "Non"}
Utilisateur: ${userFirstName || "N/A"}`;
  }, [clientLabel, typeLabel, timeSpentValue, activity?.description_activite, overrideLabel, statusTitle, isBillable, requiresClient, isOvertime, userFirstName]);

  /* ────────────────────────────────────────────────────────────────────────
   * Rendu
   * ────────────────────────────────────────────────────────────────────────*/
  return (
    <div
      className={[
        "relative text-xs px-1 py-1 rounded-md mb-0.5",
        "flex flex-col group cra-activity-item",
        typeColorClass,
        isLocked ? "opacity-70" : "",
        isDraggable ? "cursor-grab active:cursor-grabbing hover:shadow-md" : "cursor-not-allowed opacity-60",
      ].join(" ")}
      role="button"
      aria-label={`${displayLabel} ${clientLabel ? `- ${clientLabel}` : ''}`}
      title={titleAttr}
      onClick={onClickItem}
      draggable={isDraggable}
      onDragStart={onStartDrag}
      data-activity-id={activity?.id}
      data-activity-type={s(activity?.type_activite) || ""}
      data-activity-status={activity?.status || "draft"}
    >
      {/* Mise en page sur deux lignes :
        La première ligne contient le type d'activité et la marque "facturable".
        La deuxième ligne contient le nom du client (si disponible).
        */}
      <div className="flex items-center">
        <span className="truncate">{displayLabel}</span>
        {/* Marque facturable */}
        <BillableMark isBillable={isBillable} />
      </div>

      {/* Affiche le nom du client uniquement si il existe */}
      {clientLabel && (
        <div className="truncate text-[10px] opacity-80">
          {clientLabel}{overrideLabel}
        </div>
      )}


      {/* Pastille statut (verrou visuel) */}
      {isLocked && (
        <span
          className={`absolute top-0 right-0 h-full flex items-center justify-center p-1 text-xs font-semibold rounded-tr-md rounded-br-md ${statusColorClass}`}
          title={statusTitle}
          aria-label={`Statut: ${statusTitle}`}
        >
          {statusDisplayChar}
        </span>
      )}

      {/* Suppression (visible au survol uniquement) */}
      {isDraggable && (
        <button
          onClick={onDelete}
          className="absolute top-0 right-0 h-full flex items-center justify-center p-1 bg-red-600 hover:bg-red-700 text-white rounded-tr-md rounded-br-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          title="Supprimer l'activité"
          aria-label="Supprimer l'activité"
        >
          &times;
        </button>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
 * Mémoisation : on ne re-render que si les champs pertinents changent
 * - On compare l’activité sur ses champs utilisés à l’écran
 * - + les flags/readOnly/handlers qui influent sur l’UI
 * ──────────────────────────────────────────────────────────────────────────────*/

const areEqual = (prevProps, nextProps) => {
  const A = prevProps.activity || {};
  const B = nextProps.activity || {};

  const keys = [
    "id",
    "user_id",
    "client_id",
    "type_activite",
    "temps_passe",
    "status",
    "is_absence",
    "override_non_working_day",
    "description_activite",
    "__kind",
  ];

  for (const k of keys) {
    if (s(A[k]) !== s(B[k])) return false;
  }

  // Props simples qui modifient l’UI
  if (prevProps.readOnly !== nextProps.readOnly) return false;
  if (prevProps.userId !== nextProps.userId) return false;
  if (prevProps.userFirstName !== nextProps.userFirstName) return false;
  if (prevProps.isCraEditable !== nextProps.isCraEditable) return false;
  if (prevProps.isPaidLeaveEditable !== nextProps.isPaidLeaveEditable) return false;
  if (s(prevProps.paidLeaveTypeId) !== s(nextProps.paidLeaveTypeId)) return false;

  // Références des définitions (on suppose stables dans le parent)
  if (prevProps.activityTypeDefinitions !== nextProps.activityTypeDefinitions) return false;
  if (prevProps.clientDefinitions !== nextProps.clientDefinitions) return false;

  return true;
};

export default React.memo(CraActivityItemBase, areEqual);