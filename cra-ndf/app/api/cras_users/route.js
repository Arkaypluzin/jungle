// app/api/cras_users/route.js
import { getMongoDb } from "@/lib/mongo";
import { NextResponse } from "next/server";
import { auth } from "@/auth"; // Assurez-vous que le chemin est correct

export async function GET() {
  try {
    const session = await auth();
    // Optionnel: Vérifier si l'utilisateur a le rôle 'Admin' ou 'Manager'
    if (
      !session?.user?.roles?.includes("Admin") &&
      !session?.user?.roles?.includes("Manager")
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const db = await getMongoDb();
    const monthlyReportsCollection = db.collection("monthly_cra_reports");

    const uniqueUsers = await monthlyReportsCollection
      .aggregate([
        {
          $group: {
            _id: "$user_id",
            fullName: {
              $first: { $ifNull: ["$userName", "Utilisateur inconnu"] },
            },
          },
        },
        {
          $project: {
            _id: 0,
            azureAdUserId: "$_id",
            fullName: 1,
          },
        },
        { $sort: { fullName: 1 } },
      ])
      .toArray();

    const filteredUsers = uniqueUsers.filter(
      (user) => user.fullName !== "Utilisateur inconnu"
    );

    return NextResponse.json(filteredUsers);
  } catch (error) {
    console.error("Failed to fetch unique CRA users for filter:", error);
    return NextResponse.json(
      { message: "Failed to fetch unique CRA users", error: error.message },
      { status: 500 }
    );
  }
}
