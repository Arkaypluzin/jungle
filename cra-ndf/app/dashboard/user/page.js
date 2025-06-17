import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";

export default async function UserDashboard() {
    const session = await auth();

    if (session?.user?.roles?.includes("Admin")) {
        return redirect("/dashboard/admin"); // Redirection si Admin
    }

    return (
        <div className="p-10 text-center">
            <h1 className="text-2xl font-bold">User Dashboard</h1>
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
            </div>
        </div>
    );
}