import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../../models/User.js';


// 1. MANUALLY RECREATE __dirname (Required for ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. LOAD ENV FROM THE ROOT FOLDER
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });


const MONGODB_URI = process.env.MONGODB_URI ;

async function seedAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB...");


    
    

    const adminEmail = process.env.ADMIN_SEED_EMAIL 
    const existingAdmin = await User.findOne({ email: adminEmail, role:"admin" });

    if (existingAdmin) {
      console.log("Admin already exists!");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash(process.env.ADMIN_SEED_PASS, 12);

    await User.create({

      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      emailVerified: true,
      onBoardingStatus: "completed" 
    });

    console.log("Admin user created successfully! ");
    process.exit();
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
}

seedAdmin();