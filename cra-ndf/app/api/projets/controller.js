import * as projetModel from "./model";
import { NextResponse } from "next/server";

export async function getAllProjetsController() {
    try {
        const projets = await projetModel.getAllProjets();
        return NextResponse.json(projets, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { message: "Erreur lors de la récupération des projets.", error: error.message },
            { status: 500 }
        );
    }
}

export async function getProjetByIdController(id) {
    try {
        const projet = await projetModel.getProjetById(id);
        if (projet) {
            return NextResponse.json(projet, { status: 200 });
        }
        return NextResponse.json({ message: "Projet non trouvé." }, { status: 404 });
    } catch (error) {
        return NextResponse.json({ message: "Erreur serveur.", error: error.message }, { status: 500 });
    }
}

export async function createProjetController(projetData) {
    if (!projetData.nom) {
        return NextResponse.json({ message: "Le nom du projet est requis." }, { status: 400 });
    }
    try {
        // Si tu veux éviter les doublons sur le nom :
        const existing = await projetModel.getAllProjets();
        if (existing.some(p => p.nom === projetData.nom)) {
            return NextResponse.json({ message: "Un projet avec ce nom existe déjà." }, { status: 409 });
        }
        const newProjet = await projetModel.createProjet(projetData);
        return NextResponse.json(newProjet, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: "Erreur lors de la création du projet.", error: error.message }, { status: 500 });
    }
}

export async function updateProjetController(id, updateData) {
    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ message: "Aucune donnée fournie pour la mise à jour." }, { status: 400 });
    }
    try {
        const success = await projetModel.updateProjet(id, updateData);
        if (success) {
            return NextResponse.json({ message: "Projet mis à jour avec succès." }, { status: 200 });
        }
        return NextResponse.json({ message: "Projet non trouvé ou aucune modification effectuée." }, { status: 404 });
    } catch (error) {
        return NextResponse.json({ message: "Erreur serveur.", error: error.message }, { status: 500 });
    }
}

export async function deleteProjetController(id) {
    try {
        const success = await projetModel.deleteProjet(id);
        if (success) {
            return new NextResponse(null, { status: 204 });
        }
        return NextResponse.json({ message: "Projet non trouvé." }, { status: 404 });
    } catch (error) {
        return NextResponse.json({ message: "Erreur serveur.", error: error.message }, { status: 500 });
    }
}