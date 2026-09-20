import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export async function GET() {
  try {
    await client.connect();
    const db = client.db();

    // Assuming your users collection is named "users" or "user" based on Better Auth
    const users = await db.collection("user").find({ role: "employee" }).toArray();
    
    // Fallback if the collection is named "users"
    if (users.length === 0) {
      const usersCol = await db.collection("users").find({ role: "employee" }).toArray();
      if (usersCol.length > 0) {
        return NextResponse.json(usersCol.map(u => ({ id: u._id, name: u.name, email: u.email })));
      }
    }

    return NextResponse.json(users.map(u => ({ id: u._id, name: u.name, email: u.email })));
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}
