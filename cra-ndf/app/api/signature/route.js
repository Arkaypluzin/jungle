// app/api/signature/route.js

import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server'; // Import NextResponse for App Router

// Variables lues depuis .env.local
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'cra-ndf'; // Utilise MONGODB_DB, avec 'cra-ndf' comme fallback
const collectionName = 'signatures'; // Nom de la collection pour les signatures

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }
  
  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = client.db(dbName); // Utilise le dbName lu depuis l'environnement

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// Handler for GET requests (to retrieve signature)
export async function GET(request) {
  try {
    const { db } = await connectToDatabase();
    const signaturesCollection = db.collection(collectionName); // Utilise le collectionName global

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required for GET.' }, { status: 400 });
    }

    const signatureDoc = await signaturesCollection.findOne({ userId: userId });
    return NextResponse.json({ image: signatureDoc ? signatureDoc.image : null }, { status: 200 });

  } catch (error) {
    console.error('MongoDB GET operation error:', error);
    return NextResponse.json({ message: 'Database error.', error: error.message }, { status: 500 });
  }
}

// Handler for POST requests (to save signature)
export async function POST(request) {
  try {
    const { db } = await connectToDatabase();
    const signaturesCollection = db.collection(collectionName); // Utilise le collectionName global

    const { userId, image } = await request.json();

    if (!userId || !image) {
      return NextResponse.json({ message: 'User ID and image are required for POST.' }, { status: 400 });
    }

    await signaturesCollection.updateOne(
      { userId: userId },
      { $set: { image: image, timestamp: new Date() } },
      { upsert: true } // Creates new document if it doesn't exist
    );
    return NextResponse.json({ message: 'Signature saved successfully.' }, { status: 200 });

  } catch (error) {
    console.error('MongoDB POST operation error:', error);
    return NextResponse.json({ message: 'Database error.', error: error.message }, { status: 500 });
  }
}

// Handler for DELETE requests (to delete signature)
export async function DELETE(request) {
  try {
    const { db } = await connectToDatabase();
    const signaturesCollection = db.collection(collectionName); // Utilise le collectionName global

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required for DELETE.' }, { status: 400 });
    }

    await signaturesCollection.deleteOne({ userId: userId });
    return NextResponse.json({ message: 'Signature deleted successfully.' }, { status: 200 });

  } catch (error) {
    console.error('MongoDB DELETE operation error:', error);
    return NextResponse.json({ message: 'Database error.', error: error.message }, { status: 500 });
  }
}
