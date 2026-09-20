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

export async function GET(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const url = new URL(request.url);
  const businessSlug = url.searchParams.get("businessSlug");

  await client.connect();
  const db = client.db();

  let query = {};
  
  // If the user is an employee, they should only see leads for their assigned businesses
  if (session.user.role === "employee" && session.user.assignedBusinesses?.length > 0) {
     query.businessSlug = { $in: session.user.assignedBusinesses };
  } else if (session.user.role === "guest") {
     // Guests see nothing by default unless specified
     return NextResponse.json([]);
  }

  // If a specific portal is selected, filter by that portal
  if (businessSlug) {
    query.businessSlug = businessSlug;
  }

  const leads = await db.collection("leads").find(query).sort({ _id: -1 }).toArray();
  
  return NextResponse.json(leads);
}

export async function POST(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  // Permissions check for employees
  if (session.user.role === "employee" && !session.user.permissions?.canAddLead) {
    return NextResponse.json({ error: "Forbidden: No permission to add leads" }, { status: 403 });
  }

  const body = await request.json();
  const now = new Date();
  const createdBy = session.user.id;
  
  await client.connect();
  const db = client.db();

  if (Array.isArray(body)) {
    // Bulk insertion
    const leadsToInsert = body.map(lead => ({
      ...lead,
      createdAt: now,
      createdBy: createdBy
    }));
    
    if (leadsToInsert.length === 0) return NextResponse.json({ error: "Empty array" }, { status: 400 });
    
    const result = await db.collection("leads").insertMany(leadsToInsert);
    return NextResponse.json({ success: true, count: result.insertedCount });
  } else {
    // Single insertion
    body.createdAt = now;
    body.createdBy = createdBy;

    const result = await db.collection("leads").insertOne(body);
    return NextResponse.json({ success: true, id: result.insertedId, lead: body });
  }
}
