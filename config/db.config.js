const mongoose = require("mongoose");

let isConnecting = false;

exports.connectDB = async () => {
    if (mongoose.connection.readyState >= 1) {
        return;
    }

    if (isConnecting) {
        return;
    }

    try {
        isConnecting = true;
        const uri = process.env.DB_URI;
        if (!uri) {
            console.error("DB_URI environment variable is missing!");
            isConnecting = false;
            return;
        }

        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000 // 5 sec timeout instead of default 30s
        });
        console.log(`Connected to MongoDB ${conn.connection.host}`);
        isConnecting = false;
    } catch (err) {
        isConnecting = false;
        console.error(`DB connection failed: ${err.message}`);
        // DO NOT call process.exit(1) in Serverless environment (Vercel)
    }
};
