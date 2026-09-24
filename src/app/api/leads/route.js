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
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "all";
  const tag = url.searchParams.get("tag") || "all";
  const task = url.searchParams.get("task") || "all";
  const assignedTo = url.searchParams.get("assignedTo") || "all";
  const startDate = url.searchParams.get("startDate") || "";
  const endDate = url.searchParams.get("endDate") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "15");

  await client.connect();
  const db = client.db();

  let query = {};
  
  // If the user is an employee, they should only see leads assigned to them and for their assigned businesses
  if (session.user.role === "employee") {
     query.assignedTo = session.user.name;
     if (session.user.assignedBusinesses?.length > 0) {
        query.businessSlug = { $in: session.user.assignedBusinesses };
     }
  } else if (session.user.role === "guest") {
     // Guests see nothing by default unless specified
     return NextResponse.json({ leads: [], totalCount: 0, totalPages: 0, currentPage: 1 });
  } else {
     // Admin
     if (assignedTo === "unassigned") {
       query.assignedTo = { $in: ["", null] };
     } else if (assignedTo !== "all") {
       query.assignedTo = assignedTo;
     }
  }

  // If a specific portal is selected, filter by that portal
  if (businessSlug) {
    query.businessSlug = businessSlug;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { lastConversation: { $regex: search, $options: "i" } }
    ];
  }

  if (status !== "all") {
    query.leadStatus = status;
  }

  if (tag !== "all") {
    query.leadTag = tag;
  }

  if (task !== "all") {
    query["taskScheduled.taskStatus"] = task;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const skip = (page - 1) * limit;

  const [leads, totalCount, uniqueTags] = await Promise.all([
    db.collection("leads").find(query).sort({ _id: -1 }).skip(skip).limit(limit).toArray(),
    db.collection("leads").countDocuments(query),
    db.collection("leads").distinct("leadTag", businessSlug ? { businessSlug } : {})
  ]);
  
  const totalPages = Math.ceil(totalCount / limit);
  
  return NextResponse.json({ leads, totalCount, totalPages, currentPage: page, uniqueTags });
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
