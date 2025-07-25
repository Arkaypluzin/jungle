import * as ndfKiloModel from "./model";
import { NextResponse } from "next/server";

export async function getAllNdfKiloByNdfController(id_ndf) {
    try {
        const list = await ndfKiloModel.getAllNdfKiloByNdf(id_ndf);
        return NextResponse.json(list, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { message: "Erreur lors de la récupération.", error: error.message },
            { status: 500 }
        );
    }
}

export async function getNdfKiloByIdController(uuid) {
    try {
        const item = await ndfKiloModel.getNdfKiloById(uuid);
        if (item) {
            return NextResponse.json(item, { status: 200 });
        }
        return NextResponse.json({ message: "Ligne kilométrique non trouvée." }, { status: 404 });
    } catch (error) {
        return NextResponse.json({ message: "Erreur serveur.", error: error.message }, { status: 500 });
    }
}

export async function createNdfKiloController(data) {
    if (!data.id_ndf || !data.date_debut || !data.depart || !data.arrivee || !data.type_vehicule || !data.cv || !data.distance) {
        return NextResponse.json({ message: "Champs requis manquants." }, { status: 400 });
    }
    try {
        const item = await ndfKiloModel.createNdfKilo(data);
        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: "Erreur lors de la création.", error: error.message }, { status: 500 });
    }
}

export async function updateNdfKiloController(uuid, updateData) {
    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ message: "Aucune donnée fournie." }, { status: 400 });
    }
    try {
        const success = await ndfKiloModel.updateNdfKilo(uuid, updateData);
        if (success) {
            return NextResponse.json({ message: "Ligne mise à jour." }, { status: 200 });
        }
        return NextResponse.json({ message: "Ligne non trouvée." }, { status: 404 });
    } catch (error) {
        return NextResponse.json({ message: "Erreur serveur.", error: error.message }, { status: 500 });
    }
}

export async function deleteNdfKiloController(uuid) {
    try {
        const success = await ndfKiloModel.deleteNdfKilo(uuid);
        if (success) {
            return new NextResponse(null, { status: 204 });
        }
        return NextResponse.json({ message: "Ligne non trouvée." }, { status: 404 });
    } catch (error) {
        return NextResponse.json({ message: "Erreur serveur.", error: error.message }, { status: 500 });
    }
}