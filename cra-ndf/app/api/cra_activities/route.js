// app/api/cra_activities/route.js
import {
  getAllCraActivitiesController,
  createCraActivityController,
  updateCraActivityController,
  deleteCraActivityController,
} from "./controller"; // Le chemin est relatif au dossier courant

// GET /api/cra_activities?userId=...
export async function GET(request) {
  // Dans l'App Router, la fonction GET reçoit l'objet Request.
  // Le contrôleur doit extraire userId de request.nextUrl.searchParams.
  return getAllCraActivitiesController(request);
}

// POST /api/cra_activities
export async function POST(request) {
  // Le contrôleur doit extraire le body via await request.json().
  return createCraActivityController(request);
}

// Si vous avez une route dynamique pour PUT/DELETE (ex: /api/cra_activities/[id]/route.js),
// les fonctions recevront un deuxième argument 'context' avec 'params'.
// Pour l'instant, je suppose que l'ID est passé dans le corps ou que c'est une route non dynamique.
// Si vous avez un fichier [id]/route.js, le code ci-dessous devrait être dans ce fichier.

// Exemple pour PUT /api/cra_activities/[id] (si vous avez un fichier app/api/cra_activities/[id]/route.js)
// export async function PUT(request, { params }) {
//   const id = params.id; // L'ID est dans params
//   return updateCraActivityController(request, id);
// }

// Exemple pour DELETE /api/cra_activities/[id]
// export async function DELETE(request, { params }) {
//   const id = params.id; // L'ID est dans params
//   return deleteCraActivityController(request, id);
// }

// Si toutes les opérations (GET, POST, PUT, DELETE) sont dans le même route.js
// et que l'ID pour PUT/DELETE est dans le corps de la requête ou dans les query params,
// alors les contrôleurs doivent gérer l'extraction de l'ID en interne.
// Pour l'instant, je vais laisser les contrôleurs PUT/DELETE tels quels,
// en supposant que l'ID leur est passé par le fichier de route dynamique [id]/route.js
// ou qu'ils l'extraient du body/query si la route est statique.
