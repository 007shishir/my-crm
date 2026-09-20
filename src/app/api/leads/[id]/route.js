import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { betterFetch } from "@better-fetch/fetch";

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Get current user session
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

export async function PUT(request, { params }) {
  const { id } = await params;
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  // Add permissions checks if necessary
  if (session.user.role === "employee" && !session.user.permissions?.canAddLead) {
    return NextResponse.json({ error: "Forbidden: No permission to edit leads" }, { status: 403 });
  }

  const body = await request.json();
  delete body._id; // Prevent updating the immutable _id field

  await client.connect();
  const db = client.db();

  const result = await db.collection("leads").updateOne(
    { _id: new ObjectId(id) },
    { $set: body }
  );

  return NextResponse.json({ success: true, count: result.modifiedCount });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  // Add permissions checks if necessary
  if (session.user.role === "employee" && !session.user.permissions?.canDelete) {
    return NextResponse.json({ error: "Forbidden: No permission to delete leads" }, { status: 403 });
  }

  await client.connect();
  const db = client.db();

  const result = await db.collection("leads").deleteOne({ _id: new ObjectId(id) });

  return NextResponse.json({ success: true, count: result.deletedCount });
}
