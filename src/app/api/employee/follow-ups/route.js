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
    if (!session || session.user.role !== "employee") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const showFollowed = searchParams.get("showFollowed") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    await client.connect();
    const db = client.db();

    const query = { assignedTo: session.user.name };

    if (startDateParam && endDateParam) {
      const startOfDay = new Date(startDateParam);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(endDateParam);
      endOfDay.setHours(23, 59, 59, 999);
      query.assignedAt = {
        $gte: startOfDay.toISOString(),
        $lte: endOfDay.toISOString()
      };
    }

    // We have to fetch leads, compute follow status, and then paginate manually if we filter by follow status.
    // However, if we expect thousands of leads, this is inefficient. Assuming reasonable numbers for now.
    const allAssignedLeads = await db.collection("leads").find(query).toArray();

    const processedLeads = allAssignedLeads.map(lead => {
      let isFollowed = false;
      if (lead.assignedAt) {
        const assignedAt = new Date(lead.assignedAt);
        if (lead.activities && Array.isArray(lead.activities)) {
          const followUpAction = lead.activities.find(act => {
            if (act.type === "status_change" || act.type === "remark") {
              return new Date(act.date) > assignedAt;
            }
            return false;
          });
          if (followUpAction) isFollowed = true;
        }
      }
      return { ...lead, isFollowed };
    });

    const filteredLeads = processedLeads.filter(l => l.isFollowed === showFollowed);
    
    // Sort descending by assignedAt
    filteredLeads.sort((a, b) => new Date(b.assignedAt || 0) - new Date(a.assignedAt || 0));

    const totalCount = filteredLeads.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedLeads = filteredLeads.slice((page - 1) * limit, page * limit);

    return NextResponse.json({ 
      leads: paginatedLeads, 
      totalCount, 
      totalPages 
    });
  } catch (err) {
    console.error("Employee Follow-ups API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
