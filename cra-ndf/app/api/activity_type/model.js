// app/api/activity_type/model.js
import { getMongoDb } from "@/lib/mongo";
import { ObjectId } from "mongodb";

// Fonction pour récupérer tous les types d'activité
export async function getAllActivityTypes() {
  const db = await getMongoDb();
  try {
    const result = await db.collection("activity_type").find({}).toArray();
    console.log(
      "MongoDB Model: Récupération de tous les types d'activité:",
      result.length,
      "documents trouvés."
    );
    return result;
  } catch (error) {
    console.error(
      "MongoDB Model: Erreur lors de la récupération de tous les types d'activité:",
      error
    );
    throw new Error("Failed to retrieve activity types.");
  }
}

// Fonction pour récupérer un type d'activité par son ID
export async function getActivityTypeById(id) {
  const db = await getMongoDb();
  try {
    console.log(
      "MongoDB Model: Tentative de récupération du type d'activité par ID:",
      id
    );
    const objectId = new ObjectId(id);
    const result = await db
      .collection("activity_type")
      .findOne({ _id: objectId });
    console.log(
      "MongoDB Model: Récupération du type d'activité par ID",
      id,
      ":",
      result ? "Trouvé" : "Non trouvé"
    );
    return result;
  } catch (error) {
    console.error(
      `MongoDB Model: Erreur lors de la récupération du type d'activité par ID ${id}:`,
      error
    );
    return null;
  }
}

// Fonction pour créer un nouveau type d'activité
export async function createActivityType(data) {
  const newActivityType = {
    name: data.name,
    is_billable: Boolean(data.is_billable),
    requires_client: data.requires_client !== false,
    is_overtime: Boolean(data.is_overtime),
    is_absence: Boolean(data.is_absence), // NOUVEAU: Ajout de is_absence
    created_at: new Date(),
    updated_at: new Date(),
  };
  const db = await getMongoDb();
  try {
    console.log(
      "MongoDB Model: Tentative de création d'un type d'activité:",
      newActivityType.name
    );
    const result = await db
      .collection("activity_type")
      .insertOne(newActivityType);
    console.log(
      "MongoDB Model: Type d'activité créé avec ID:",
      result.insertedId
    );
    return { ...newActivityType, _id: result.insertedId };
  } catch (error) {
    console.error(
      "MongoDB Model: Erreur lors de la création du type d'activité:",
      error
    );
    throw new Error("Failed to create activity type.");
  }
}

// Fonction pour mettre à jour un type d'activité existant
export async function updateActivityType(id, updateData) {
  const db = await getMongoDb();
  let objectId;
  try {
    objectId = new ObjectId(id);
    console.log(
      "MongoDB Model: Tentative de mise à jour du type d'activité avec ID string:",
      id,
      "et ObjectId:",
      objectId
    );
  } catch (e) {
    console.error(
      "MongoDB Model: ID invalide fourni pour la mise à jour:",
      id,
      e
    );
    return null; // Retourne null si l'ID n'est pas un ObjectId valide
  }

  const update = { $set: { updated_at: new Date() } };

  if (updateData.name !== undefined) update.$set.name = updateData.name;
  if (updateData.is_billable !== undefined)
    update.$set.is_billable = Boolean(updateData.is_billable);
  if (updateData.requires_client !== undefined)
    update.$set.requires_client = Boolean(updateData.requires_client);
  if (updateData.is_overtime !== undefined)
    update.$set.is_overtime = Boolean(updateData.is_overtime);
  if (updateData.is_absence !== undefined) // NOUVEAU: Ajout de is_absence
    update.$set.is_absence = Boolean(updateData.is_absence);

  try {
    const res = await db
      .collection("activity_type")
      .findOneAndUpdate({ _id: objectId }, update, { returnDocument: "after" });
    // Log détaillé de la réponse pour comprendre pourquoi res.value était null
    console.log(
      "MongoDB Model: Résultat brut de findOneAndUpdate:",
      JSON.stringify(res, null, 2)
    );

    // CORRECTION ICI : Retourner 'res' directement car le document mis à jour est à la racine de 'res'
    // Ou, si le document est dans 'res.value', alors il faut retourner res.value.
    // D'après les logs précédents, le document est à la racine de 'res'.
    if (res) {
      // Vérifier si res n'est pas null/undefined
      // Si res contient directement le document mis à jour (comme vos logs l'indiquent)
      if (res._id) {
        console.log(
          "MongoDB Model: Résultat de la mise à jour du type d'activité: Trouvé et mis à jour (ID:",
          res._id.toString(),
          ")"
        );
        return res; // Retourne le document directement
      } else if (res.value) {
        // Fallback au cas où le comportement de findOneAndUpdate change
        console.log(
          "MongoDB Model: Résultat de la mise à jour du type d'activité: Trouvé et mis à jour (ID:",
          res.value._id.toString(),
          ")"
        );
        return res.value;
      }
    }
    console.warn(
      "MongoDB Model: Type d'activité non trouvé pour la mise à jour ou résultat inattendu. ID:",
      id
    );
    return null;
  } catch (error) {
    console.error(
      `MongoDB Model: Erreur lors de la mise à jour du type d'activité par ID ${id}:`,
      error
    );
    return null;
  }
}

// Fonction pour supprimer un type d'activité
export async function deleteActivityType(id) {
  const db = await getMongoDb();
  let objectId;
  try {
    objectId = new ObjectId(id);
    console.log(
      "MongoDB Model: Tentative de suppression du type d'activité avec ID string:",
      id,
      "et ObjectId:",
      objectId
    );
  } catch (e) {
    console.error(
      "MongoDB Model: ID invalide fourni pour la suppression:",
      id,
      e
    );
    return { deleted: false }; // Retourne false si l'ID n'est pas un ObjectId valide
  }

  try {
    const res = await db
      .collection("activity_type")
      .deleteOne({ _id: objectId });
    console.log(
      "MongoDB Model: Type d'activité supprimé:",
      res.deletedCount > 0 ? "Oui" : "Non"
    );
    return { deleted: res.deletedCount > 0 };
  } catch (error) {
    console.error(
      `MongoDB Model: Erreur lors de la suppression du type d'activité par ID ${id}:`,
      error
    );
    return { deleted: false };
  }
}
