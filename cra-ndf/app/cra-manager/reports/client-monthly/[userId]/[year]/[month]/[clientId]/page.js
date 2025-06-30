// app/cra-manager/reports/monthly-detailed/[userId]/[year]/[month]/page.js
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import MonthlyDetailedReport from "../../../../../../components/MonthlyDetailedReport"; // Chemin relatif
import { useSession } from "next-auth/react"; // Garder pour la session utilisateur

export default function MonthlyDetailedReportPage({ params }) {
  const { userId, year, month } = params;
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState("Chargement...");
  const { data: session } = useSession(); // Accès à la session NextAuth

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Tenter de récupérer le nom de l'utilisateur de la session si l'ID correspond
      if (session?.user?.id === userId) {
        setUserName(session.user.name || session.user.email || userId);
      } else {
        // Sinon, tenter de le récupérer via une API si disponible
        // Ceci suppose que vous avez une API comme /api/users/[id] qui renvoie le nom de l'utilisateur
        // Si vous n'avez pas cette API, le nom de l'utilisateur affichera son ID.
        try {
          const userRes = await fetch(`/api/users/${userId}`);
          if (!userRes.ok) {
            console.warn(
              `Échec de la récupération du nom d'utilisateur pour ${userId}: ${userRes.statusText}`
            );
            setUserName(userId); // Fallback si l'API échoue
          } else {
            const userData = await userRes.json();
            setUserName(userData.name || userData.email || userId); // Utilise le nom ou l'email, ou l'ID
          }
        } catch (fetchError) {
          console.error(
            `Erreur lors de la tentative de récupération du nom d'utilisateur: ${fetchError.message}`
          );
          setUserName(userId); // Fallback en cas d'erreur réseau
        }
      }

      // Récupérer les activités du rapport
      const reportRes = await fetch(
        `/api/reports/monthly-detailed?userId=${userId}&year=${year}&month=${month}`
      );
      if (!reportRes.ok) {
        const errorText = await reportRes.text();
        throw new Error(
          `Échec de la récupération des données du rapport : ${reportRes.statusText} - ${errorText}`
        );
      }
      const data = await reportRes.json();
      setReportData(data);
    } catch (err) {
      console.error(
        "Erreur lors de la récupération des données du rapport :",
        err
      );
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, year, month, session]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100 text-xl text-gray-700">
        Chargement du rapport détaillé...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-100 text-xl text-red-600 p-4 text-center">
        <p>Erreur lors du chargement du rapport : {error}</p>
        <p className="text-base text-gray-700 mt-4">
          Veuillez vérifier que l'ID utilisateur, l'année et le mois sont
          corrects dans l'URL.
        </p>
      </div>
    );
  }

  // Assurez-vous que les dates sont des objets Date pour le composant MonthlyDetailedReport
  const processedReportData = reportData.map((activity) => ({
    ...activity,
    date_activite: activity.date_activite
      ? parseISO(activity.date_activite)
      : null,
  }));

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <MonthlyDetailedReport
        reportData={processedReportData}
        userId={userId}
        year={year}
        month={month}
        userName={userName} // Passer le nom de l'utilisateur au composant du rapport
      />
    </div>
  );
}
