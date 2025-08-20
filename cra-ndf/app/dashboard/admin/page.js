import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";
import { User, FileText, ClipboardList, Briefcase, LogOut } from "lucide-react";

export default async function AdminDashboard() {
  const session = await auth();

  if (!session?.user?.roles?.includes("Admin")) {
    return redirect("/dashboard/user");
  }

  const cards = [
    {
      href: "/profile",
      icon: <User className="w-8 h-8 text-green-600 mb-2" />,
      label: "Profil",
      description: "Gérer mon profil utilisateur"
    },
    {
      href: "/note-de-frais",
      icon: <FileText className="w-8 h-8 text-blue-600 mb-2" />,
      label: "Mes notes de frais",
      description: "Accéder et gérer les notes de frais"
    },
    {
      href: "/cra-manager",
      icon: <ClipboardList className="w-8 h-8 text-purple-600 mb-2" />,
      label: "Gérer CRA",
      description: "Gérer les comptes rendus d'activité"
    },
    {
      href: "/projets/admin",
      icon: <Briefcase className="w-8 h-8 text-orange-600 mb-2" />,
      label: "Gestionnaire",
      description: "Voir et gérer les projets, clients et activités"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 py-12">
      <div className="w-full max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Tableau de bord Administrateur</h1>
        <p className="text-gray-600 text-center mb-8">
          Bienvenue <span className="font-semibold">{session.user.name}</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="bg-white rounded-xl shadow-md hover:shadow-xl border p-6 flex flex-col items-center transition group"
            >
              {card.icon}
              <span className="text-lg font-semibold mb-1 text-gray-900 group-hover:text-primary">{card.label}</span>
              <span className="text-sm text-gray-500 text-center">{card.description}</span>
            </Link>
          ))}
        </div>

        <div className="flex justify-center">
          <LogoutButton>
            <div className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition">
              <LogOut className="w-5 h-5" /> Déconnexion
            </div>
          </LogoutButton>
        </div>
      </div>
    </div>
  );
}