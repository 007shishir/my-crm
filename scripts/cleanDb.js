import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();

    console.log("Dropping old collections...");
    try { await db.collection("user").drop(); } catch(e) {}
    try { await db.collection("users").drop(); } catch(e) {}
    try { await db.collection("session").drop(); } catch(e) {}
    try { await db.collection("account").drop(); } catch(e) {}
    try { await db.collection("sessions").drop(); } catch(e) {}
    try { await db.collection("accounts").drop(); } catch(e) {}
    console.log("Database cleaned.");

    console.log("Note: Because Better Auth relies on Next.js runtime for password hashing, it's safer to create the new Admin dummy user through the UI.");
    console.log("Please go to the Login page and click 'Sign Up' to create the new Admin user in the 'users' collection.");

  } finally {
    await client.close();
  }
}

run().catch(console.dir);
