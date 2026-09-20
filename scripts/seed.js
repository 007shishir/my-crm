const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'employee', 'guest'], default: 'guest' },
  permissions: {
    canAddLead: { type: Boolean, default: false },
    canEditLead: { type: Boolean, default: false },
    canWriteComment: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false }
  },
  assignedBusinesses: [{ type: String }],
  isActive: { type: Boolean, default: true }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error("No MONGODB_URI found");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for seeding...");

    // Create Admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    await User.findOneAndUpdate(
      { email: 'admin@example.com' },
      {
        name: 'Super Admin',
        passwordHash: adminPassword,
        role: 'admin',
        assignedBusinesses: ['nestvibe', 'next_impression', 'no_chinta', 'study_first'],
        permissions: { canAddLead: true, canEditLead: true, canWriteComment: true, canDelete: true }
      },
      { upsert: true, new: true }
    );
    console.log("Admin seeded: admin@example.com / admin123");

    // Create Guest
    const guestPassword = await bcrypt.hash('guest123', 10);
    await User.findOneAndUpdate(
      { email: 'guest@example.com' },
      {
        name: 'Guest User',
        passwordHash: guestPassword,
        role: 'guest',
        assignedBusinesses: [], 
        permissions: { canAddLead: false, canEditLead: false, canWriteComment: false, canDelete: false }
      },
      { upsert: true, new: true }
    );
    console.log("Guest seeded: guest@example.com / guest123");

    // Create Employee
    const empPassword = await bcrypt.hash('emp123', 10);
    await User.findOneAndUpdate(
      { email: 'employee@example.com' },
      {
        name: 'John the Agent',
        passwordHash: empPassword,
        role: 'employee',
        assignedBusinesses: ['nestvibe'], 
        permissions: { canAddLead: true, canEditLead: false, canWriteComment: true, canDelete: false }
      },
      { upsert: true, new: true }
    );
    console.log("Employee seeded: employee@example.com / emp123");

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
