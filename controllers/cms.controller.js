const StaticPage = require("../models/staticPage.model");
const AppError = require("../utilities/appError.utility.js");
const catchAsync = require("../utilities/catchAsync.utility.js");

// Fetches CMS page content
exports.getPageContent = catchAsync(async (req, res, next) => {
    const { pageName } = req.params;
    
    let page = await StaticPage.findOne({ pageName });
    
    if (!page) {
        page = {
            pageName,
            content: ""
        };
    }

    res.status(200).json({
        status: "success",
        data: page
    });
});

// Updates CMS page content
exports.updatePageContent = catchAsync(async (req, res, next) => {
    const { pageName, content } = req.body;

    const page = await StaticPage.findOneAndUpdate(
        { pageName },
        { content },
        { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
        status: "success",
        message: `Page '${pageName}' content updated successfully`,
        data: page
    });
});

const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

// Uploads and sanitizes Hero Image for CMS
exports.uploadHeroImage = catchAsync(async (req, res, next) => {
    if (!req.file) {
        return next(new AppError("No image file provided", 400));
    }

    const ext = path.extname(req.file.originalname || "").toLowerCase() || ".png";
    const newFilename = `${crypto.randomUUID()}${ext}`;
    const oldPath = req.file.path;
    let newPath = path.join(path.dirname(oldPath), newFilename);

    fs.renameSync(oldPath, newPath);

    const uploadMiddleware = require("../middlewares/upload.middleware");
    if (uploadMiddleware.compressUploadedFile) {
        const compressedPath = await uploadMiddleware.compressUploadedFile(newPath, { generateXs: true });
        if (compressedPath) {
            newPath = compressedPath;
        }
    }

    const finalFilename = path.basename(newPath);
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${finalFilename}`;

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.status(200).json({
        status: "success",
        url: fileUrl,
        filename: finalFilename
    });
});