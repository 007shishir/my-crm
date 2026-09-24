import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { betterFetch } from "@better-fetch/fetch";

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function isAdmin(request) {
  const { data: session } = await betterFetch(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: { cookie: request.headers.get("cookie") || "" },
    }
  );
  return session?.user?.role === "admin";
}

export async function GET(request) {
  if (!(await isAdmin(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const url = new URL(request.url);
  const portal = url.searchParams.get("portal");
  const employee = url.searchParams.get("employee");

  await client.connect();
  const db = client.db();

  const query = {
    businessSlug: portal,
    $or: [
      { assignedTo: employee },
      { lastConversation: { $regex: employee, $options: "i" } }
    ]
  };

  const leads = await db.collection("leads").find(query).toArray();
  
  return NextResponse.json(leads);
}
