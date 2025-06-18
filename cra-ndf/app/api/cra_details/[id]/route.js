// app/api/cra-details/[id]/route.js
import { NextResponse } from "next/server";
import {
  getCraDetailById,
  updateCraDetail,
  deleteCraDetail,
} from "../../../../controllers/craDetailController";

// Gère les requêtes GET pour récupérer un détail de CRA par ID
export async function GET(request, { params }) {
  const { id } = params;
  const mockRes = {
    status: (statusCode) => ({
      json: (data) => NextResponse.json(data, { status: statusCode }),
      send: () => new NextResponse(null, { status: statusCode }),
    }),
  };
  return getCraDetailById({ params: { id: id } }, mockRes);
}

// Gère les requêtes PUT pour mettre à jour un détail de CRA par ID
export async function PUT(request, { params }) {
  const { id } = params;
  const body = await request.json();
  const mockRes = {
    status: (statusCode) => ({
      json: (data) => NextResponse.json(data, { status: statusCode }),
      send: () => new NextResponse(null, { status: statusCode }),
    }),
  };
  return updateCraDetail({ params: { id: id }, body: body }, mockRes);
}

// Gère les requêtes DELETE pour supprimer un détail de CRA par ID
export async function DELETE(request, { params }) {
  const { id } = params;
  const mockRes = {
    status: (statusCode) => ({
      json: (data) => NextResponse.json(data, { status: statusCode }),
      send: () => new NextResponse(null, { status: statusCode }),
    }),
  };
  return deleteCraDetail({ params: { id: id } }, mockRes);
}
