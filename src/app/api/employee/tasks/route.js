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
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const taskView = searchParams.get("taskView") || "pending"; // all, pending, completed

    await client.connect();
    const db = client.db();

    // Base query: assigned to the employee and has SOME task Scheduled array
    const query = {
      assignedTo: session.user.name,
      taskScheduled: { $exists: true, $not: { $size: 0 } }
    };

    let startOfDay, endOfDay;
    if (startDateParam && endDateParam) {
      startOfDay = new Date(startDateParam);
      startOfDay.setHours(0, 0, 0, 0);
      endOfDay = new Date(endDateParam);
      endOfDay.setHours(23, 59, 59, 999);
    }

    if (taskView === "pending") {
      // Pending ignores date filter entirely
      query["taskScheduled.taskStatus"] = "Pending";
    } else if (taskView === "all") {
      // Must have a task created in this date range
      if (startOfDay && endOfDay) {
        query.taskScheduled = {
          $elemMatch: {
            createdAt: {
              $gte: startOfDay.toISOString(),
              $lte: endOfDay.toISOString()
            }
          }
        };
      }
    } else if (taskView === "completed") {
      // Must have a task completed in this date range
      if (startOfDay && endOfDay) {
        query.taskScheduled = {
          $elemMatch: {
            taskStatus: "Completed",
            completedAt: {
              $gte: startOfDay.toISOString(),
              $lte: endOfDay.toISOString()
            }
          }
        };
      }
    }

    const allTasksLeads = await db.collection("leads").find(query).toArray();

    // Sort logically depending on view
    allTasksLeads.sort((a, b) => {
      if (taskView === "pending") {
        const getEarliest = (lead) => {
          const pendingTasks = (lead.taskScheduled || []).filter(t => t.taskStatus === "Pending");
          if (pendingTasks.length === 0) return Infinity;
          return Math.min(...pendingTasks.map(t => new Date(t.taskDeadline).getTime()));
        };
        return getEarliest(a) - getEarliest(b);
      } else if (taskView === "all") {
        const getLatestCreation = (lead) => {
          const tasks = lead.taskScheduled || [];
          if (tasks.length === 0) return 0;
          return Math.max(...tasks.map(t => t.createdAt ? new Date(t.createdAt).getTime() : 0));
        };
        return getLatestCreation(b) - getLatestCreation(a); // newest first
      } else if (taskView === "completed") {
        const getLatestCompletion = (lead) => {
          const completedTasks = (lead.taskScheduled || []).filter(t => t.taskStatus === "Completed");
          if (completedTasks.length === 0) return 0;
          return Math.max(...completedTasks.map(t => t.completedAt ? new Date(t.completedAt).getTime() : 0));
        };
        return getLatestCompletion(b) - getLatestCompletion(a); // newest first
      }
      return 0;
    });

    const totalCount = allTasksLeads.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedLeads = allTasksLeads.slice((page - 1) * limit, page * limit);

    return NextResponse.json({ 
      leads: paginatedLeads, 
      totalCount, 
      totalPages 
    });
  } catch (err) {
    console.error("Employee Tasks API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
