import LoginButton from "@/components/LoginButton";

function Login() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-6 items-center border border-gray-200">
                <img
                    src="/logo/logo.png"
                    alt="Logo"
                    className="w-60 object-contain mb-2"
                    draggable={false}
                />
                <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
                    Connexion à votre espace
                </h1>
                <p className="text-gray-600 text-center mb-4">
                    Connectez-vous pour accéder à votre tableau de bord et gérer vos notes de frais et comptes rendus d’activité.<br/>
                    Si vous n’avez pas de compte, contactez l’administrateur.
                </p>
                <LoginButton />
            </div>
        </div>
    );
}

export default Login;