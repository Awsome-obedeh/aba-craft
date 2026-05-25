// lib/mongodb.js

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error(
        "Please define the MONGODB_URI environment variable"
    );
}

// Global cache
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = {
        conn: null,
        promise: null,
    };
}

async function connectDB() {
    // If connection already exists
    if (cached.conn) {
        return cached.conn;
    }

    // If no connection promise exists
    if (!cached.promise) {
        const options = {
            bufferCommands: false,
        };

        cached.promise = mongoose
            .connect(MONGODB_URI, options)
            .then((mongoose) => {
                console.log(
                    "MongoDB Connected Successfully"
                );

                return mongoose;
            });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null;

        console.log("MongoDB Connection Error:", error);

        throw error;
    }

    return cached.conn;
}

export default connectDB;