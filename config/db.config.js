const mongoose = require("mongoose");
exports.connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.DB_URI)
        console.log(`Connected to MongoDB ${conn.connection.host}`)
    } catch (err) {
        console.log(`DB connection failed ${err.message}`);
        process.exit(1);
    }
}
