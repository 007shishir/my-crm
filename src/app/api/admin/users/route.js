import { MongoClient, ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { betterFetch } from "@better-fetch/fetch";
import bcrypt from "bcryptjs"; // fallback for direct creation if better-auth API isn't used

// Use native mongo client to connect
const client = new MongoClient(process.env.MONGODB_URI);

async function isAdmin(request) {
  const { data: session } = await betterFetch(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    }
  );
  return session?.user?.role === "admin";
}

export async function GET(request) {
  const { data: session } = await betterFetch(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: { cookie: request.headers.get("cookie") || "" },
    }
  );
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  
  await client.connect();
  const db = client.db();
  const users = await db.collection("users").find({}, { projection: { password: 0 } }).toArray();
  
  return NextResponse.json(users);
}

export async function POST(request) {
  if (!(await isAdmin(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await request.json();
  await client.connect();
  const db = client.db();

  // Basic manual user creation for better auth's schema if API fails
  // Better Auth stores passwords natively, but we will store a basic hashed pass if needed.
  // Actually, for a fully robust Better Auth integration, the admin should use authClient.signUp 
  // on the frontend, which handles the exact schema perfectly.
  // We will expect the frontend to handle creation, and this POST is just for fallback or we don't need it.
  
  return NextResponse.json({ message: "Use better-auth signUp for creation" });
}

export async function PUT(request) {
  if (!(await isAdmin(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await request.json();
  const { id, _id, role, assignedBusinesses, permissions } = body;

  if (!id && !_id) {
    return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
  }

  await client.connect();
  const db = client.db();

  const query = id ? { id: id } : { _id: new ObjectId(_id) };

  await db.collection("users").updateOne(
    query,
    { $set: { role, assignedBusinesses, permissions } }
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  if (!(await isAdmin(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const _id = url.searchParams.get("_id");

  if (!id && !_id) {
    return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
  }

  await client.connect();
  const db = client.db();

  const query = id ? { id: id } : { _id: new ObjectId(_id) };

  await db.collection("users").deleteOne(query);
  
  if (id) {
    await db.collection("sessions").deleteMany({ userId: id });
    await db.collection("accounts").deleteMany({ userId: id });
  }

  return NextResponse.json({ success: true });
}
