// app/api/cra-details/[craId]/details/route.js
import { NextResponse } from "next/server";
import { getDetailsByCraId } from "../../../../../controllers/craDetailController";

// Gère les requêtes GET pour récupérer tous les détails pour un CRA spécifique
export async function GET(request, { params }) {
  const { craId } = params;
  const mockRes = {
    status: (statusCode) => ({
      json: (data) => NextResponse.json(data, { status: statusCode }),
      send: () => new NextResponse(null, { status: statusCode }),
    }),
  };
  return getDetailsByCraId({ params: { craId: craId } }, mockRes);
}
