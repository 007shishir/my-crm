import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  await db.collection("users").updateOne(
    { email: "islam7.saiful@gmail.com" },
    { $set: { role: "admin", assignedBusinesses: [] } }
  );

  await db.collection("users").updateOne(
    { email: "admin@example.com" },
    { $set: { role: "admin", assignedBusinesses: [] } }
  );

  console.log("Restored admin privileges.");
  await client.close();
}

run().catch(console.dir);
