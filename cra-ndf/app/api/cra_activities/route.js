// app/api/cra_activities/route.js
import {
  getAllCraActivitiesController,
  createCraActivityController,
  updateCraActivityController,
  deleteCraActivityController,
} from "./controller"; // Le chemin est relatif au dossier courant

// GET /api/cra_activities?userId=...
export async function GET(request) {
  return getAllCraActivitiesController(request);
}

// POST /api/cra_activities
export async function POST(request) {
  return createCraActivityController(request);
}

// PUT /api/cra_activities?id=...
// Pour une route statique comme celle-ci, l'ID doit venir des query parameters
export async function PUT(request) {
  const id = request.nextUrl.searchParams.get("id"); // Extrait l'ID des query params
  if (!id) {
    // Utilise NextResponse pour une réponse JSON cohérente
    return new Response(
      JSON.stringify({ message: "ID manquant pour la mise à jour." }),
      { status: 400 }
    );
  }
  return updateCraActivityController(request, id);
}

// DELETE /api/cra_activities?id=...
// Pour une route statique comme celle-ci, l'ID doit venir des query parameters
export async function DELETE(request) {
  const id = request.nextUrl.searchParams.get("id"); // Extrait l'ID des query params
  if (!id) {
    // Utilise NextResponse pour une réponse JSON cohérente
    return new Response(
      JSON.stringify({ message: "ID manquant pour la suppression." }),
      { status: 400 }
    );
  }
  return deleteCraActivityController(request, id);
}
