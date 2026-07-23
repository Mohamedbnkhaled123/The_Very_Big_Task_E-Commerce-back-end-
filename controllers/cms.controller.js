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