const SubCategory = require("../models/subCategory.model");
const AppError = require("../utilities/appError.utility.js");
const catchAsync = require("../utilities/catchAsync.utility.js");

exports.getSubCategoriesByMain = catchAsync(async (req, res, next) => {
    const { categoryId } = req.params;
    const subCategories = await SubCategory.find({ categoryId, isDeleted: false });

    res.status(200).json({
        status: "success",
        results: subCategories.length,
        data: subCategories
    });
});

// add sub category
exports.addSubCategory = catchAsync(async (req, res, next) => {
    const { name, slug, categoryId } = req.body; 

    const newSubCategory = await SubCategory.create({ name, slug, categoryId });

    res.status(201).json({
        status: "success",
        message: "SubCategory created successfully",
        data: newSubCategory
    });
});

// soft delete 
exports.deleteSubCategory = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const subCategory = await SubCategory.findByIdAndUpdate(id, { isDeleted: true }, { new: true });

    if (!subCategory) {
        return next(new AppError("SubCategory not found", 404));
    }

    res.status(200).json({
        status: "success",
        message: "SubCategory deleted successfully"
    });
});