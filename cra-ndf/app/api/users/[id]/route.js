// app/api/users/[userId]/route.js
import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongo"; // Assurez-vous que le chemin est correct
import { ObjectId } from "mongodb";

export async function GET(request, { params }) {
  const { userId } = params; // C'est l'ID de l'utilisateur (chaîne Clerk/NextAuth)

  if (!userId) {
    return NextResponse.json(
      { message: "User ID is required" },
      { status: 400 }
    );
  }

  try {
    const db = await getMongoDb();
    const usersCollection = db.collection("users"); // Assurez-vous que c'est le bon nom de collection

    // Recherchez l'utilisateur en utilisant le champ qui stocke l'ID de Clerk/NextAuth
    // Si votre ID est un ObjectId MongoDB, utilisez : { _id: new ObjectId(userId) }
    // Si c'est une chaîne simple (comme "user_xxxx" de Clerk), utilisez : { clerkUserId: userId }
    // J'utilise 'clerkUserId' comme dans les précédents contrôleurs.
    const user = await usersCollection.findOne({ clerkUserId: userId });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Retourne les informations de base de l'utilisateur
    return NextResponse.json(
      {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        // N'incluez pas de données sensibles ici
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`API Error /api/users/${userId}:`, error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
