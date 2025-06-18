// app/api/cra-activities/[id]/route.js
import { NextResponse } from "next/server";
import {
  getCraActivityById,
  updateCraActivity,
  deleteCraActivity,
} from "../../../../controllers/craActivityController";

// Gère les requêtes GET pour récupérer une activité de CRA par ID
export async function GET(request, { params }) {
  const { id } = params;
  const mockRes = {
    status: (statusCode) => ({
      json: (data) => NextResponse.json(data, { status: statusCode }),
      send: () => new NextResponse(null, { status: statusCode }),
    }),
  };
  return getCraActivityById({ params: { id: id } }, mockRes);
}

// Gère les requêtes PUT pour mettre à jour une activité de CRA par ID
export async function PUT(request, { params }) {
  const { id } = params;
  const body = await request.json();
  const mockRes = {
    status: (statusCode) => ({
      json: (data) => NextResponse.json(data, { status: statusCode }),
      send: () => new NextResponse(null, { status: statusCode }),
    }),
  };
  return updateCraActivity({ params: { id: id }, body: body }, mockRes);
}

// Gère les requêtes DELETE pour supprimer une activité de CRA par ID
export async function DELETE(request, { params }) {
  const { id } = params;
  const mockRes = {
    status: (statusCode) => ({
      json: (data) => NextResponse.json(data, { status: statusCode }),
      send: () => new NextResponse(null, { status: statusCode }),
    }),
  };
  return deleteCraActivity({ params: { id: id } }, mockRes);
}
