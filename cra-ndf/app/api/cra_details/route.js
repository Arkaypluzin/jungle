// app/api/cra-details/route.js
import { NextResponse } from "next/server";
import {
  getCraDetails,
  createCraDetail,
} from "../../../controllers/craDetailController";

// Gère les requêtes GET pour récupérer tous les détails de CRA
export async function GET(request) {
  const mockRes = {
    status: (statusCode) => ({
      json: (data) => NextResponse.json(data, { status: statusCode }),
      send: () => new NextResponse(null, { status: statusCode }),
    }),
  };
  return getCraDetails(request, mockRes);
}

// Gère les requêtes POST pour créer un nouveau détail de CRA
export async function POST(request) {
  const body = await request.json();
  const mockRes = {
    status: (statusCode) => ({
      json: (data) => NextResponse.json(data, { status: statusCode }),
      send: () => new NextResponse(null, { status: statusCode }),
    }),
  };
  return createCraDetail({ body: body }, mockRes);
}
