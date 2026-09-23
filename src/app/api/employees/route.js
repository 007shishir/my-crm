import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

import { betterFetch } from "@better-fetch/fetch";

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function getSession(request) {
  const { data: session } = await betterFetch(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: { cookie: request.headers.get("cookie") || "" },
    }
  );
  return session;
}

export async function GET(request) {
  try {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await client.connect();
    const db = client.db();

    const query = session.user.role === "admin" ? {} : { role: "employee" };

    // Assuming your users collection is named "users" or "user" based on Better Auth
    const users = await db.collection("user").find(query).toArray();
    
    // Fallback if the collection is named "users"
    if (users.length === 0) {
      const usersCol = await db.collection("users").find(query).toArray();
      if (usersCol.length > 0) {
        return NextResponse.json(usersCol.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role })));
      }
    }

    return NextResponse.json(users.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role })));
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}
