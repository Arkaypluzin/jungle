/** @type {import('tailwindcss').Config} */
module.exports = {
    // Configure les fichiers où Tailwind doit rechercher les classes CSS
    content: [
      './app/**/*.{js,ts,jsx,tsx,mdx}', // Pour les fichiers de l'application (Next.js App Router)
      './pages/**/*.{js,ts,jsx,tsx,mdx}', // Pour les fichiers de pages (Next.js Pages Router)
      './components/**/*.{js,ts,jsx,tsx,mdx}', // Pour les composants React
      // Ajoutez d'autres chemins si vous avez des fichiers dans d'autres répertoires
    ],
    theme: {
      // La section 'extend' permet d'ajouter vos personnalisations sans écraser les valeurs par défaut de Tailwind
      extend: {
        // Définition de couleurs personnalisées (utilisant des formats compatibles comme rgb ou hex)
        colors: {
          // Exemple de couleurs personnalisées
          'primary-blue': '#3B82F6', // Un bleu standard
          'secondary-green': '#10B981', // Un vert standard
          'accent-yellow': '#F59E0B', // Un jaune standard
          'dark-gray-800': '#1F2937', // Un gris foncé pour le texte ou les fonds
          'light-gray-100': '#F3F4F6', // Un gris clair pour les fonds
        },
        // Définition de polices personnalisées
        fontFamily: {
          inter: ['Inter', 'sans-serif'], // Exemple d'utilisation de la police Inter
          // Ajoutez d'autres polices si nécessaire
        },
        // Autres extensions (par exemple, espacements, tailles, etc.)
        spacing: {
          '128': '32rem',
          '144': '36rem',
        },
        borderRadius: {
          '4xl': '2rem',
        }
      },
    },
    // Plugins Tailwind CSS (si vous en utilisez)
    plugins: [],
  }
  
  