import mongoose from 'mongoose';
import { Lead } from './Lead.js';

export const NestVibeLead = mongoose.models.NestVibeLead || Lead.discriminator('nestvibe', new mongoose.Schema({
  realEstateData: {
    propertyInterests: [{ type: String }],
    targetLocation: { type: String },
    budget: { type: Number },
    siteVisitStatus: { 
      type: String, 
      enum: ['pending', 'scheduled', 'completed', 'cancelled'],
      default: 'pending'
    }
  }
}));

export const NextImpressionLead = mongoose.models.NextImpressionLead || Lead.discriminator('next_impression', new mongoose.Schema({
  marketingData: {
    servicesNeeded: [{ 
      type: String, 
      enum: ['SEO', 'Branding', 'Social Media Ads', 'Web Development'] 
    }],
    monthlyRetainerBudget: { type: Number },
    currentWebsite: { type: String }
  }
}));

export const NoChintaLead = mongoose.models.NoChintaLead || Lead.discriminator('no_chinta', new mongoose.Schema({
  healthcareData: {
    patientAge: { type: Number },
    requiredCareType: { 
      type: String,
      enum: ['Post-Op', 'Elderly Care', 'Physiotherapy', 'General Nursing']
    },
    scheduleRequired: { type: String }
  }
}));

export const StudyFirstLead = mongoose.models.StudyFirstLead || Lead.discriminator('study_first', new mongoose.Schema({
  studentData: {
    targetCountry: { type: String },
    primaryTargetCountry: { type: String },
    secondaryTargetCountry: { type: String },
    intendedDegree: { type: String },
    intendedIntake: { type: String },
    ieltsScore: { type: Number, min: 0, max: 9 },
    greScore: { type: Number },
    highestEducation: { type: String },
    sscResult: { type: String },
    hscResult: { type: String },
    diplomaHonorsResult: { type: String },
    mastersResult: { type: String },
    fileOpened: { type: String },
    officeVisited: { type: String },
    leadSource: { type: String }
  }
}));
