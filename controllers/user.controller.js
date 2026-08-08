//user controller.js
const User = require("../models/user.model.js");
const catchAsync = require("../utilities/catchAsync.utility.js");
const AppError = require("../utilities/appError.utility.js");
const jwt = require("jsonwebtoken");
const { validatePasswordStrength } = require("../utilities/validation.utility.js");

const signToken = (user) => {
    return jwt.sign(
        { id: user._id, name: user.name, role: user.role },
        process.env.SECRET_KEY,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

// Public endpoint to check if Super Admin account exists
exports.checkSuperAdminStatus = catchAsync(async (req, res, next) => {
    const count = await User.countDocuments({ role: 'superadmin' });
    res.status(200).json({
        status: "success",
        exists: count > 0
    });
});

// One-time zero-knowledge Super Admin setup
exports.setupSuperAdmin = catchAsync(async (req, res, next) => {
    const count = await User.countDocuments({ role: 'superadmin' });
    if (count > 0) {
        return next(new AppError("Super Admin account already exists in the system!", 403));
    }

    const { name, email, setupKey, password } = req.body;
    if (!name || !email || !setupKey || !password) {
        return next(new AppError("Please provide all required fields (name, email, setupKey, password)!", 400));
    }

    const configuredKey = process.env.SUPERADMIN_SETUP_KEY;
    if (!configuredKey || setupKey.trim() !== configuredKey.trim()) {
        return next(new AppError("Invalid Super Admin setup key!", 401));
    }

    if (!validatePasswordStrength(password)) {
        return next(new AppError("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.", 400));
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
        return next(new AppError("An account with this email address already exists!", 400));
    }

    const superAdminUser = await User.create({
        name,
        email: email.toLowerCase().trim(),
        password,
        role: "superadmin",
        isActive: true,
        canPurchase: true
    });

    const token = signToken(superAdminUser);

    res.status(201).json({
        status: "success",
        message: "Super Admin account setup completed successfully!",
        JWT: token,
        data: {
            id: superAdminUser._id,
            name: superAdminUser.name,
            email: superAdminUser.email,
            role: superAdminUser.role
        }
    });
});

exports.createUser = (assignedRole) => {
    return catchAsync(async (req, res, next) => {
        const { name, email, phoneNumbers, addresses, password } = req.body;

        const myUser = await User.create({
            name,
            email,
            phoneNumbers,
            addresses,
            password,
            role: assignedRole // Role is strictly set by Router, ignoring req.body.role
        });

        res.status(201).json({
            status: "success",
            data: {
                id: myUser._id,
                name: myUser.name,
                email: myUser.email,
                role: myUser.role
            }
        });
    });
};

exports.getUsers = catchAsync(async (req, res, next) => {
    const users = await User.find().select('-password -__v').lean();
    const formattedUsers = users.map(u => {
        const lastActive = u.lastActiveAt ? new Date(u.lastActiveAt).getTime() : 0;
        // Online if active within last 5 minutes (300,000 ms)
        const isOnline = lastActive > 0 && (Date.now() - lastActive) < 5 * 60 * 1000;
        return {
            ...u,
            canPurchase: u.canPurchase !== false,
            isOnline
        };
    });
    res.status(200).json({
        status: "success",
        results: formattedUsers.length,
        data: formattedUsers
    });
});

exports.toggleUserStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
        return next(new AppError("User account not found", 404));
    }

    if (user.role !== 'user') {
        return next(new AppError("Use dedicated admin governance controls for admin accounts.", 400));
    }

    user.canPurchase = user.canPurchase === false ? true : false;
    user.isActive = user.canPurchase;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        status: "success",
        message: `User purchasing permissions updated to ${user.canPurchase ? 'Allowed' : 'Restricted'}.`,
        data: {
            ...user.toObject(),
            canPurchase: user.canPurchase
        }
    });
});

// Super Admin toggles sub-admin active/disabled status
exports.toggleAdminStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const adminUser = await User.findById(id);

    if (!adminUser) {
        return next(new AppError("Admin account not found", 404));
    }

    if (adminUser.role !== 'admin') {
        return next(new AppError("Can only toggle status of sub-admin accounts.", 400));
    }

    adminUser.isActive = adminUser.isActive === false ? true : false;
    await adminUser.save({ validateBeforeSave: false });

    res.status(200).json({
        status: "success",
        message: `Admin account status updated to ${adminUser.isActive ? 'Active' : 'Disabled'}.`,
        data: {
            ...adminUser.toObject(),
            isActive: adminUser.isActive
        }
    });
});

// Super Admin permanently deletes a sub-admin account
exports.deleteAdmin = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const adminUser = await User.findById(id);

    if (!adminUser) {
        return next(new AppError("Admin account not found", 404));
    }

    if (adminUser.role !== 'admin') {
        return next(new AppError("Only sub-admin accounts can be deleted through this endpoint.", 400));
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
        status: "success",
        message: "Admin account deleted successfully."
    });
});

