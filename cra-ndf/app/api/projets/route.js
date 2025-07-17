import { getAllProjetsController, createProjetController } from "./controller";

export async function GET(req) {
    return getAllProjetsController();
}

export async function POST(req) {
    const data = await req.json();
    return createProjetController(data);
}