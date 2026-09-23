import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
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
  try {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const businessSlug = searchParams.get("businessSlug");
    const assignedToParam = searchParams.get("assignedTo");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Missing date range" }, { status: 400 });
    }

    const start = new Date(startDate);
    start.setHours(0,0,0,0);
    const end = new Date(endDate);
    end.setHours(23,59,59,999);

    let query = {};
    if (businessSlug && businessSlug !== "all") {
      query.businessSlug = businessSlug;
    }
    
    if (session.user.role === "employee") {
      query.assignedTo = session.user.name;
      
      if (session.user.assignedBusinesses?.length > 0) {
        if (query.businessSlug) {
          if (!session.user.assignedBusinesses.includes(query.businessSlug)) {
            return NextResponse.json({ results: { follow_up: [], visit: [], remark: [] } });
          }
        } else {
          query.businessSlug = { $in: session.user.assignedBusinesses };
        }
      }
    } else if (session.user.role === "admin") {
      if (assignedToParam && assignedToParam !== "all") {
        query.assignedTo = assignedToParam;
      }
    }

    // Optimization: Only scan leads that have been modified (have activities) OR have a conversation history (for remarks)
    query.$or = [
      { activities: { $exists: true, $not: { $size: 0 } } },
      { lastConversation: { $exists: true, $type: "string", $ne: "" } }
    ];

    await client.connect();
    const db = client.db();
    
    // Optimization: Project only the fields we need to reduce memory usage and transfer time
    const leads = await db.collection("leads")
      .find(query)
      .project({ name: 1, phone: 1, businessSlug: 1, activities: 1, lastConversation: 1 })
      .toArray();
    
    let followUpResults = [];
    let visitResults = [];
    let remarkResults = [];

    leads.forEach(lead => {
      let hasFollowUp = false;
      let hasVisit = false;
      let hasRemark = false;

      // 1. Check Follow Ups
      const followUpActivities = (lead.activities || []).filter(act => {
        if (act.type === "visit") return false; 
        const actDate = new Date(act.date);
        return actDate >= start && actDate <= end;
      });
      if (followUpActivities.length > 0) {
        followUpResults.push({
          _id: lead._id,
          name: lead.name,
          phone: lead.phone,
          businessSlug: lead.businessSlug,
          activities: followUpActivities
        });
      }

      // 2. Check Visits
      const visitActivities = (lead.activities || []).filter(act => {
        if (act.type !== "visit") return false;
        const actDate = new Date(act.date);
        return actDate >= start && actDate <= end;
      });
      if (visitActivities.length > 0) {
        visitResults.push({
          _id: lead._id,
          name: lead.name,
          phone: lead.phone,
          businessSlug: lead.businessSlug,
          activities: visitActivities
        });
      }

      // 3. Check Remarks (Parsing lastConversation)
      if (lead.lastConversation) {
        const remarks = lead.lastConversation.split('\n');
        const validRemarks = [];
        remarks.forEach(r => {
          const match = r.match(/^\[(.*?)\] (.*?): (.*)$/);
          if (match) {
            const dateStr = match[1];
            const employee = match[2];
            const text = match[3];
            
            // Exclude "Imported via CSV"
            if (text.includes("Imported via CSV")) return;

            const remarkDate = new Date(dateStr);
            if (!isNaN(remarkDate) && remarkDate >= start && remarkDate <= end) {
              validRemarks.push({ date: dateStr, employee, text });
            }
          }
        });
        if (validRemarks.length > 0) {
          remarkResults.push({
            _id: lead._id,
            name: lead.name,
            phone: lead.phone,
            businessSlug: lead.businessSlug,
            remarks: validRemarks
          });
        }
      }
    });

    return NextResponse.json({ 
      results: {
        follow_up: followUpResults,
        visit: visitResults,
        remark: remarkResults
      } 
    });
  } catch (err) {
    console.error("Reports API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
