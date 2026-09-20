import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  await db.collection("leads").updateMany(
    { leadTag: "nextimpression", businessSlug: "nestvibe" },
    { $set: { businessSlug: "next_impression" } }
  );

  console.log("Fixed incorrectly routed leads.");
  await client.close();
}

run().catch(console.dir);
