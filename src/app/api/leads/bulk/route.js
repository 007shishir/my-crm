import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
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

export async function PUT(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  // Optional: check if they have permission to edit leads
  if (session.user.role === "employee" && !session.user.permissions?.canAddLead) {
    return NextResponse.json({ error: "Forbidden: No permission to edit leads" }, { status: 403 });
  }

  const { leadIds, updates } = await request.json();

  if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json({ error: "No leads selected" }, { status: 400 });
  }

  // Sanitize the updates object to prevent empty overwrites
  const sanitizedUpdates = {};
  if (updates.leadStatus) sanitizedUpdates.leadStatus = updates.leadStatus;
  if (updates.leadTag) sanitizedUpdates.leadTag = updates.leadTag;
  if (updates.assignedTo) sanitizedUpdates.assignedTo = updates.assignedTo;

  if (Object.keys(sanitizedUpdates).length === 0) {
    return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
  }

  await client.connect();
  const db = client.db();

  const objectIds = leadIds.map(id => new ObjectId(id));

  const result = await db.collection("leads").updateMany(
    { _id: { $in: objectIds } },
    { $set: sanitizedUpdates }
  );

  return NextResponse.json({ success: true, count: result.modifiedCount });
}
