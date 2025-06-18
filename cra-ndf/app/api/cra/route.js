// app/api/cra/route.js
import { NextResponse } from "next/server";
import { getCRAs, createCRA } from "../../../controllers/craController";

// Gère les requêtes GET pour récupérer tous les CRAs
export async function GET(request) {
  const mockRes = {
    status: (statusCode) => ({
      json: (data) => NextResponse.json(data, { status: statusCode }),
      send: () => new NextResponse(null, { status: statusCode }),
    }),
  };
  return getCRAs(request, mockRes);
}

// Gère les requêtes POST pour créer un nouveau CRA
export async function POST(request) {
  const body = await request.json();
  const mockRes = {
    status: (statusCode) => ({
      json: (data) => NextResponse.json(data, { status: statusCode }),
      send: () => new NextResponse(null, { status: statusCode }),
    }),
  };
  return createCRA({ body: body }, mockRes);
}
