import * as clientModel from "./model";
import { NextResponse } from "next/server";

export async function getAllClientsController() {
  try {
    const clients = await clientModel.getAllClients();
    return NextResponse.json(clients, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur lors de la récupération des clients.", error: error.message },
      { status: 500 }
    );
  }
}

export async function getClientByIdController(id) {
  try {
    const client = await clientModel.getClientById(id);
    if (client) {
      return NextResponse.json(client, { status: 200 });
    }
    return NextResponse.json({ message: "Client non trouvé." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ message: "Erreur serveur.", error: error.message }, { status: 500 });
  }
}

export async function createClientController(clientData) {
  if (!clientData.nom_client) {
    return NextResponse.json(
      { message: "Nom du client est requis." },
      { status: 400 }
    );
  }
  try {
    const existing = await clientModel.getAllClients();
    if (existing.some(c => c.nom_client === clientData.nom_client)) {
      return NextResponse.json(
        { message: "Un client avec ce nom existe déjà." },
        { status: 409 }
      );
    }
    const newClient = await clientModel.createClient(clientData);
    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur lors de la création du client.", error: error.message },
      { status: 500 }
    );
  }
}

export async function updateClientController(id, updateData) {
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { message: "Aucune donnée fournie pour la mise à jour." },
      { status: 400 }
    );
  }
  try {
    const success = await clientModel.updateClient(id, updateData);
    if (success) {
      return NextResponse.json({ message: "Client mis à jour avec succès." }, { status: 200 });
    }
    return NextResponse.json(
      { message: "Client non trouvé ou aucune modification effectuée." },
      { status: 404 }
    );
  } catch (error) {
    return NextResponse.json({ message: "Erreur serveur.", error: error.message }, { status: 500 });
  }
}

export async function deleteClientController(id) {
  try {
    const success = await clientModel.deleteClient(id);
    if (success) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json({ message: "Client non trouvé." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ message: "Erreur serveur.", error: error.message }, { status: 500 });
  }
}