import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

// Connect to MongoDB using native driver for Better Auth
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db();
import { admin } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [admin()],
  database: mongodbAdapter(db),
  user: {
    modelName: "users",
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "guest",
      },
      assignedBusinesses: {
        type: "string[]",
        required: false,
        defaultValue: [],
      },
      permissions: {
        type: "object",
        required: false,
        defaultValue: { canAddLead: false, canEditLead: false, canWriteComment: false, canDelete: false },
      }
    }
  },
  session: {
    modelName: "sessions"
  },
  account: {
    modelName: "accounts"
  },
  emailAndPassword: {
    enabled: true,
  }
});
