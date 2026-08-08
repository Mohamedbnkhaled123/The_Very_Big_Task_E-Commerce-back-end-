//server.js
const dotEnv = require("dotenv");
dotEnv.config();
const express = require("express");
const path = require("path");
const compression = require("compression");
const helmet = require("helmet");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Attach io to the Express app context for controllers
app.set("io", io);
// Enable Gzip/Brotli compression for all API responses and static files
app.use(compression());

// Security HTTP Headers
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const corsMiddleware = require('./middlewares/cors.middleware');
app.use(corsMiddleware);
const { authLimiter } = require('./middlewares/rateLimiter.middleware');

const port = process.env.PORT || 3000;
const { connectDB } = require("./config/db.config.js");
connectDB();

// Ensure DB is connected for serverless invocations
app.use(async (req, res, next) => {
    try {
        await connectDB();
    } catch (e) {
        console.error("DB middleware error:", e);
    }
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static uploads with long-term browser caching (1 year)
app.use('/uploads', express.static(path.join(__dirname, "uploads"), {
    maxAge: '1y',
    immutable: true
}));

app.use('/api/v1/user', require('./routes/user.route'));
app.use('/api/v1/auth', authLimiter, require('./routes/auth.route'));
app.use('/api/v1/product', require('./routes/product.route'));
app.use('/api/v1/order', require('./routes/order.route'));
app.use('/api/v1/cart', require('./routes/cart.route'));
app.use('/api/v1/category', require('./routes/category.route'));
app.use('/api/v1/subcategory', require('./routes/subCategory.route'));
app.use('/api/v1/review', require('./routes/review.route'));
app.use('/api/v1/cms', require('./routes/cms.route'));
app.use('/api/v1/analytics', require('./routes/analytics.route'));
app.use('/api/v1/coupon', require('./routes/coupon.route'));
app.use('/api/v1/contact', require('./routes/contact.route'));

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';

    const isProduction = process.env.NODE_ENV === 'production';
    const isJWTError = err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError';

    res.status(statusCode).json({
        status: status,
        message: err.message,
        stack: err.stack
    });
});

if (!process.env.VERCEL) {
    server.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

module.exports = app;