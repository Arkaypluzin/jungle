import { getAllClientsController, createClientController } from "./controller";

export async function GET(req) {
  return getAllClientsController();
}

export async function POST(req) {
  const data = await req.json();
  return createClientController(data);
}