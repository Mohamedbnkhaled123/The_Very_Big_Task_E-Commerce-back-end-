//middlewares/auth.middleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/user.model.js");
const AppError = require("../utilities/appError.utility.js");
const catchAsync = require("../utilities/catchAsync.utility.js");

exports.authenticate = catchAsync(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new AppError("You are not logged in! Please log in to get access.", 401));
    }
    const token = authHeader.split(" ")[1];

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch (err) {
        return next(new AppError("Invalid or expired token. Please log in again.", 401));
    }

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError("The user belonging to this token does no longer exist.", 401));
    }
    if (!currentUser.isActive) {
        return next(new AppError("This user account is deactivated.", 403));
    }

    req.user = currentUser;
    next();
});