import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'employee', 'guest'], 
    default: 'guest' 
  },
  permissions: {
    canAddLead: { type: Boolean, default: false },
    canEditLead: { type: Boolean, default: false },
    canWriteComment: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false }
  },
  // Which businesses this employee has access to
  assignedBusinesses: [{ 
    type: String, 
    enum: ['nestvibe', 'next_impression', 'no_chinta', 'study_first'] 
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
