// app/api/public_holidays/route.js
import { NextResponse } from "next/server";

// Cette route API agit comme un proxy pour l'API date.nager.at
// Elle est appelée par le frontend, puis appelle l'API externe côté serveur,
// contournant ainsi les problèmes de CORS.

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const countryCode = searchParams.get("countryCode") || "FR"; // Par défaut à FR

  if (!year) {
    return NextResponse.json(
      { message: "L'année est requise pour récupérer les jours fériés." },
      { status: 400 }
    );
  }

  try {
    const nagerApiUrl = `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`;
    const response = await fetch(nagerApiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          message: `Échec de la récupération des jours fériés depuis l'API externe : ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const holidays = await response.json();
    return NextResponse.json(holidays);
  } catch (error) {
    return NextResponse.json(
      {
        message: `Erreur interne du serveur lors de la récupération des jours fériés : ${error.message}`,
      },
      { status: 500 }
    );
  }
}
