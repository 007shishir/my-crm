import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const actionableTaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  details: { type: String, default: '' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate: { type: Date },
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed'], 
    default: 'pending' 
  },
  completedAt: { type: Date }
});

const leadBaseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  source: { type: String },

  businessSlug: { 
    type: String, 
    enum: ['nestvibe', 'next_impression', 'no_chinta', 'study_first'],
    required: true,
    index: true 
  },

  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    index: true 
  },
  
  leadStatus: { type: String, default: 'new', index: true },

  activityLog: [activityLogSchema],
  tasks: [actionableTaskSchema]

}, { 
  timestamps: true,
  discriminatorKey: 'businessSlug'
});

leadBaseSchema.index({ businessSlug: 1, assignedTo: 1, leadStatus: 1 });
leadBaseSchema.index({ businessSlug: 1, createdAt: -1 });

export const Lead = mongoose.models.Lead || mongoose.model('Lead', leadBaseSchema);
