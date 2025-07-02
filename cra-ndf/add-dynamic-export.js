// add-dynamic-export.js
const fs = require("fs");
const path = require("path");
const glob = require("glob"); // Nécessite l'installation: npm install glob

const targetString = "export const dynamic = 'force-dynamic';";
const apiRoutesPath = "app/api/**/*.js"; // Chemin pour les routes de l'App Router

console.log(`Recherche des fichiers de routes API dans: ${apiRoutesPath}`);

glob(apiRoutesPath, (err, files) => {
  if (err) {
    console.error("Erreur lors de la recherche des fichiers:", err);
    return;
  }

  if (files.length === 0) {
    console.log("Aucun fichier de route API trouvé. Vérifiez le chemin.");
    return;
  }

  console.log(`Found ${files.length} API route files.`);

  files.forEach((file) => {
    const filePath = path.resolve(file);
    try {
      let content = fs.readFileSync(filePath, "utf8");

      if (content.includes(targetString)) {
        console.log(`- ${file}: La ligne existe déjà. Ignoré.`);
      } else {
        // Ajoute la ligne au tout début du fichier
        content = `${targetString}\n\n${content}`;
        fs.writeFileSync(filePath, content, "utf8");
        console.log(`- ${file}: Ligne ajoutée avec succès.`);
      }
    } catch (readErr) {
      console.error(`Erreur lors du traitement du fichier ${file}:`, readErr);
    }
  });

  console.log(
    "\nProcessus terminé. N'oubliez pas de redémarrer votre serveur de développement !"
  );
});
