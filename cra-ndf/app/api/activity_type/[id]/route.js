// app/api/activity_type/[id]/route.js
import {
  getActivityTypeByIdController,
  updateActivityTypeController,
  deleteActivityTypeController,
} from "../controller"; // Le chemin est relatif au dossier parent

// Gère les requêtes GET pour récupérer un type d'activité par son ID
export async function GET(request, { params }) {
  const { id } = params; // L'ID est extrait des paramètres dynamiques de l'URL
  return getActivityTypeByIdController(id);
}

// Gère les requêtes PUT pour mettre à jour un type d'activité par son ID
export async function PUT(request, { params: awaitedParams }) {
  // Renommé params pour éviter la confusion
  console.log("ROUTE API: Fonction PUT pour /api/activity_type/[id] atteinte.");
  // Await params explicitement comme suggéré par Next.js
  const { id } = awaitedParams; // Accéder à l'ID après l'await
  console.log("ROUTE API: ID extrait des params:", id); // Nouveau log pour vérifier l'ID après l'await

  const updateData = await request.json(); // Récupère les données du corps de la requête
  return updateActivityTypeController(id, updateData);
}

// Gère les requêtes DELETE pour supprimer un type d'activité par son ID
export async function DELETE(request, { params }) {
  const { id } = params; // L'ID est extrait des paramètres dynamiques de l'URL
  return deleteActivityTypeController(id);
}
