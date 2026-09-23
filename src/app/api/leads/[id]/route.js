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

  const body = await request.json();
  delete body._id; // Prevent updating the immutable _id field

  await client.connect();
  const db = client.db();

  // Fetch the old lead to compare for activity logging
  const oldLead = await db.collection("leads").findOne({ _id: new ObjectId(id) });
  
  if (!oldLead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const activities = oldLead.activities || [];
  const now = new Date().toISOString();
  const userName = session.user.name || "Unknown User";

  // Check for assignment change
  if (body.assignedTo && oldLead.assignedTo !== body.assignedTo) {
    body.assignedAt = now;
  }

  // Check for status change
  if (oldLead.leadStatus !== body.leadStatus) {
    activities.push({
      type: "status_change",
      date: now,
      by: userName,
      details: `Status changed to ${body.leadStatus}`
    });
  }

  // Check for office visit checks
  const oldVisited = oldLead.interestedOn?.filter(p => p.isVisited).length || 0;
  const newVisited = body.interestedOn?.filter(p => p.isVisited).length || 0;
  if (newVisited > oldVisited) {
    activities.push({
      type: "visit",
      date: now,
      by: userName,
      details: "Marked property/office as visited"
    });
  }

  // Check for tasks and inject timestamps
  const oldTasksCount = oldLead.taskScheduled?.length || 0;
  const newTasksCount = body.taskScheduled?.length || 0;
  if (newTasksCount > oldTasksCount) {
    activities.push({
      type: "task_added",
      date: now,
      by: userName,
      details: "New task added"
    });
  }

  // Inject timestamps into tasks
  if (body.taskScheduled && Array.isArray(body.taskScheduled)) {
    body.taskScheduled = body.taskScheduled.map((task, index) => {
      // Find corresponding old task by index (since no unique IDs exist)
      const oldTask = (oldLead.taskScheduled && oldLead.taskScheduled.length > index) 
        ? oldLead.taskScheduled[index] 
        : null;

      const updatedTask = { ...task };

      // Ensure createdAt exists
      if (!updatedTask.createdAt) {
        if (oldTask && oldTask.createdAt) {
          updatedTask.createdAt = oldTask.createdAt;
        } else {
          updatedTask.createdAt = now;
        }
      }

      // Track completedAt
      if (updatedTask.taskStatus === "Completed") {
        if (!updatedTask.completedAt) {
          if (oldTask && oldTask.taskStatus === "Completed" && oldTask.completedAt) {
            updatedTask.completedAt = oldTask.completedAt;
          } else {
            updatedTask.completedAt = now;
          }
        }
      } else {
        // If it's not completed anymore, we might want to clear completedAt
        delete updatedTask.completedAt;
      }

      return updatedTask;
    });
  }

  // Check for remarks
  if (oldLead.lastConversation !== body.lastConversation) {
    activities.push({
      type: "remark",
      date: now,
      by: userName,
      details: "Added remark"
    });
  }

  body.activities = activities;
  body.updatedAt = now;

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
