import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  console.log("Seeding dummy users via Better Auth API...");

  const users = [
    { name: "Super Admin", email: "admin@example.com", password: "password123", role: "admin", businesses: [] },
    { name: "NestVibe Employee", email: "nestvibe@example.com", password: "password123", role: "employee", businesses: ["nestvibe"] },
    { name: "No Chinta Employee", email: "nochinta@example.com", password: "password123", role: "employee", businesses: ["no_chinta"] },
    { name: "Guest User", email: "guest@example.com", password: "password123", role: "guest", businesses: [] },
  ];

  for (const u of users) {
    try {
      const res = await fetch("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "http://localhost:3000"
        },
        body: JSON.stringify({
          email: u.email,
          password: u.password,
          name: u.name,
        }),
      });
      
      const data = await res.json();
      if (res.ok && data.user) {
        console.log(`Created user: ${u.email} (ID: ${data.user.id})`);
        
        // Update custom fields via direct MongoDB connection
        await db.collection("users").updateOne(
          { id: data.user.id },
          { $set: { 
              role: u.role, 
              assignedBusinesses: u.businesses,
              permissions: { canAddLead: true, canEditLead: true, canWriteComment: true, canDelete: false }
            } 
          }
        );
        console.log(`Updated custom fields for ${u.email}`);
        
      } else {
        console.error(`Failed to create ${u.email}:`, data);
      }
    } catch (e) {
      console.error(`Error for ${u.email}:`, e.message);
    }
  }

  await client.close();
}

run().catch(console.dir);
