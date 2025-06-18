// app/api/client/route.js
import { NextResponse } from "next/server";
import {
  getClients,
  createClient,
} from "../../../controllers/clientController";

// Gère les requêtes GET pour récupérer tous les clients
export async function GET(request) {
  const mockRes = {
    status: (statusCode) => ({
      json: (data) => NextResponse.json(data, { status: statusCode }),
      send: () => new NextResponse(null, { status: statusCode }),
    }),
  };
  return getClients(request, mockRes);
}

// Gère les requêtes POST pour créer un nouveau client
export async function POST(request) {
  const body = await request.json();
  const mockRes = {
    status: (statusCode) => ({
      json: (data) => NextResponse.json(data, { status: statusCode }),
      send: () => new NextResponse(null, { status: statusCode }),
    }),
  };
  return createClient({ body: body }, mockRes);
}
