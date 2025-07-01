import { getAllCraActivitiesController, createCraActivityController } from "./controller";

export async function GET() {
  return getAllCraActivitiesController();
}

export async function POST(request) {
  const activity = await request.json();
  return createCraActivityController(activity);
}