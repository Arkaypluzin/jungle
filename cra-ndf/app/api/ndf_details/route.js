import { handleGetAll, handlePost } from "./controller";

export async function GET(req) {
    return handleGetAll(req);
}

export async function POST(req) {
    return handlePost(req);
}