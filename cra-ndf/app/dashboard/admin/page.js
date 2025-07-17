import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";

export default async function AdminDashboard() {
  const session = await auth();

  if (!session?.user?.roles?.includes("Admin")) {
    return redirect("/dashboard/user");
  }

  return (
    <div className="p-10 text-center">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <p>Bienvenue {session.user.name}</p>

      <div className="flex justify-center gap-4 mt-6">
        <Link
          href="/profile"
          className="bg-green-700 text-white px-4 py-2 rounded-md hover:opacity-80"
        >
          Profile
        </Link>
        <LogoutButton />
        <Link
          href="/note-de-frais"
          className="bg-blue-700 text-white px-4 py-2 rounded-md hover:opacity-80"
        >
          Mes notes de frais
        </Link>
        <Link
          href="/cra-manager"
          className="bg-purple-700 text-white px-4 py-2 rounded-md hover:opacity-80"
        >
          Gérer CRA
        </Link>
        <Link
          href="/projets/admin"
          className="bg-orange-700 text-white px-4 py-2 rounded-md hover:opacity-80"
        >
          Projets
        </Link>
      </div>
    </div>
  );
}