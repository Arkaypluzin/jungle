// app/cra-manager/reports/client-monthly/[userId]/[year]/[month]/[clientId]/page.js
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import MonthlyClientReport from "../../../../../../../components/MonthlyClientReport"; // Chemin relatif
import { useSession } from "next-auth/react";

export default function MonthlyClientReportPage({ params }) {
  const { userId, year, month, clientId } = params;
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState("Chargement...");
  const [clientName, setClientName] = useState("Chargement...");
  const { data: session } = useSession();

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (session?.user?.id === userId) {
        setUserName(session.user.name || session.user.email || userId);
      } else {
        try {
          const userRes = await fetch(`/api/users/${userId}`);
          if (!userRes.ok) {
            console.warn(
              `Échec de la récupération du nom d'utilisateur pour ${userId}: ${userRes.statusText}`
            );
            setUserName(userId);
          } else {
            const userData = await userRes.json();
            setUserName(userData.name || userData.email || userId);
          }
        } catch (fetchError) {
          console.error(
            `Erreur lors de la tentative de récupération du nom d'utilisateur: ${fetchError.message}`
          );
          setUserName(userId);
        }
      }

      try {
        const clientRes = await fetch(`/api/client/${clientId}`);
        if (!clientRes.ok) {
          console.warn(
            `Échec de la récupération du nom du client pour ${clientId}: ${clientRes.statusText}`
          );
          setClientName("Client Inconnu");
        } else {
          const clientData = await clientRes.json();
          setClientName(clientData.nom_client || "Client Inconnu");
        }
      } catch (fetchError) {
        console.error(
          `Erreur lors de la tentative de récupération du nom du client: ${fetchError.message}`
        );
        setClientName("Client Inconnu");
      }

      const reportRes = await fetch(
        `/api/reports/client-monthly?userId=${userId}&year=${year}&month=${month}&clientId=${clientId}`
      );
      if (!reportRes.ok) {
        const errorText = await reportRes.text();
        throw new Error(
          `Échec de la récupération des données du rapport par client : ${reportRes.statusText} - ${errorText}`
        );
      }
      const data = await reportRes.json();
      setReportData(data);
    } catch (err) {
      console.error(
        "Erreur lors de la récupération des données du rapport par client :",
        err
      );
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, year, month, clientId, session]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100 text-xl text-gray-700">
        Chargement du rapport client...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-100 text-xl text-red-600 p-4 text-center">
        <p>Erreur lors du chargement du rapport client : {error}</p>
        <p className="text-base text-gray-700 mt-4">
          Veuillez vérifier que les paramètres sont corrects dans l'URL.
        </p>
      </div>
    );
  }

  const processedReportData = reportData.map((activity) => ({
    ...activity,
    date_activite: activity.date_activite
      ? parseISO(activity.date_activite)
      : null,
  }));

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <MonthlyClientReport
        reportData={processedReportData}
        userId={userId}
        year={year}
        month={month}
        clientId={clientId}
        userName={userName}
        clientName={clientName}
      />
    </div>
  );
}
