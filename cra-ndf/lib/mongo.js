import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MONGODB_URI to .env.local");
}

if (process.env.NODE_ENV === "development") {
  // En mode développement, on utilise une variable globale
  // pour que le client soit réutilisé à chaque "hot reload"
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // En production, on crée un nouveau client à chaque fois (plus sûr)
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Exportation de la fonction getMongoDb
export async function getMongoDb() {
  const client = await clientPromise;
  // Utilise MONGODB_DB depuis .env.local, avec une valeur par défaut si non définie
  return client.db(process.env.MONGODB_DB || "cra-ndf");
}
