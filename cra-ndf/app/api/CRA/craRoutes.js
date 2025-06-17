const express = require("express");
const router = express.Router();
const noteDeFraisController = require("../controllers/noteDeFraisController");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middlewares/authMiddleware");
const jwt = require("jsonwebtoken"); // Importez pour les tests
const { JWT_SECRET } = require("../middlewares/authMiddleware"); // Importez pour les tests

// Route pour générer un token de test (pour faciliter les tests avec Postman/cURL)
// NE PAS utiliser en production telle quelle, l'authentification doit être gérée par un système d'enregistrement/connexion
router.post("/generate-token", (req, res) => {
  const { id, role } = req.body; // Expect id (e.g., 'user1', 'admin1') and role (e.g., 'User', 'Admin')
  if (!id || !role) {
    return res
      .status(400)
      .json({ error: "ID utilisateur et rôle sont requis." });
  }
  const token = jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

// Toutes ces routes nécessitent un token
router.use(authenticateToken);

// Récupère toutes les notes de frais (Admin uniquement)
router.get(
  "/",
  authorizeRoles("Admin"),
  noteDeFraisController.getAllNotesDeFrais
);

// Récupère les notes de frais par ID utilisateur (Admin ou propriétaire)
router.get("/user/:userId", noteDeFraisController.getNotesDeFraisByUserId);

// Créer une note de frais (n'importe quel user peut créer pour lui-même, ou admin pour n'importe qui)
// La logique d'autorisation est gérée dans le contrôleur pour ce cas précis.
router.post("/", noteDeFraisController.createNoteDeFrais);

// Ajouter un détail dans une note de frais (Admin ou propriétaire)
// La logique d'autorisation est gérée dans le contrôleur.
router.post("/:id/detail", noteDeFraisController.addDetail);

// Récupérer une note de frais par id (Admin ou propriétaire)
// La logique d'autorisation est gérée dans le contrôleur.
router.get("/:id", noteDeFraisController.getNoteDeFraisById);

// Supprimer une note de frais (Admin uniquement)
router.delete(
  "/:id",
  authorizeRoles("Admin"),
  noteDeFraisController.deleteNoteDeFrais
);

// Modifier un détail (Admin ou propriétaire)
// La logique d'autorisation est gérée dans le contrôleur.
router.put("/detail/:detailId", noteDeFraisController.updateDetail);

// Supprimer un détail (Admin ou propriétaire)
// La logique d'autorisation est gérée dans le contrôleur.
router.delete("/detail/:detailId", noteDeFraisController.deleteDetail);

module.exports = router;
