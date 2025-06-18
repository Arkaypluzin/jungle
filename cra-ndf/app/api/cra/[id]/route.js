// app/api/cra/[id]/route.js
import { NextResponse } from "next/server";
import {
  getCRAById,
  updateCRA,
  deleteCRA,
} from "../../../../controllers/craController";

// Gère les requêtes GET pour récupérer un CRA par ID
export async function GET(request, { params }) {
  const { id } = params;
  const mockRes = {
    status: (statusCode) => ({
      json: (data) => NextResponse.json(data, { status: statusCode }),
      send: () => new NextResponse(null, { status: statusCode }),
    }),
  };
  return getCRAById({ params: { id: id } }, mockRes);
}

// Gère les requêtes PUT pour mettre à jour un CRA par ID
export async function PUT(request, { params }) {
  const { id } = params;
  const body = await request.json();
  const mockRes = {
    status: (statusCode) => ({
      json: (data) => NextResponse.json(data, { status: statusCode }),
      send: () => new NextResponse(null, { status: statusCode }),
    }),
  };
  return updateCRA({ params: { id: id }, body: body }, mockRes);
}

// Gère les requêtes DELETE pour supprimer un CRA par ID
export async function DELETE(request, { params }) {
  const { id } = params;
  const mockRes = {
    status: (statusCode) => ({
      json: (data) => NextResponse.json(data, { status: statusCode }),
      send: () => new NextResponse(null, { status: statusCode }),
    }),
  };
  return deleteCRA({ params: { id: id } }, mockRes);
}
