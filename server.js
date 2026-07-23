//server.js
const dotEnv = require("dotenv");
dotEnv.config();
const express = require("express");
const path = require("path");
const app = express();
const corsMiddleware = require('./middlewares/cors.middleware');
app.use(corsMiddleware);
const port = process.env.PORT;
const { connectDB } = require("./config/db.config.js")
connectDB();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, "uploads")));


app.use('/api/v1/user', require('./routes/user.route'))
app.use('/api/v1/auth', require('./routes/auth.route'))
app.use('/api/v1/product',require('./routes/product.route'))
app.use('/api/v1/order', require('./routes/order.route'));
app.use('/api/v1/cart', require('./routes/cart.route'));
app.use('/api/v1/category', require('./routes/category.route'));
app.use('/api/v1/subcategory', require('./routes/subCategory.route'));
app.use('/api/v1/review', require('./routes/review.route'));
app.use('/api/v1/cms', require('./routes/cms.route'));

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';
    res.status(statusCode).json({
        status: status,
        message: err.message,
        error: err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' 
            ? 'Invalid or expired token. Please log in again.' 
            : err.message
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});