const Category = require("../models/category.model");
const AppError = require("../utilities/appError.utility.js");
const catchAsync = require("../utilities/catchAsync.utility.js");

// get all categories
exports.getCategories = catchAsync(async (req, res, next) => {
    const categories = await Category.find({ isDeleted: false, isActive: true });

    res.status(200).json({
        status: "success",
        results: categories.length,
        data: categories
    });
});

//add category
exports.addCategory = catchAsync(async (req, res, next) => {
    const { name } = req.body;
    
    
    const img = req.file ? req.file.filename : "";

    const newCategory = await Category.create({ name, img });

    res.status(201).json({
        status: "success",
        message: "Category created successfully",
        data: newCategory
    });
});


exports.updateCategory = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const updatedData = { name, isActive };
    if (req.file) {
        updatedData.img = req.file.filename;
    }

    const category = await Category.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });

    if (!category) {
        return next(new AppError("Category not found", 404));
    }

    res.status(200).json({
        status: "success",
        message: "Category updated successfully",
        data: category
    });
});

//- Soft Delete 
exports.deleteCategory = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const category = await Category.findByIdAndUpdate(id, { isDeleted: true }, { new: true });

    if (!category) {
        return next(new AppError("Category not found", 404));
    }

    res.status(200).json({
        status: "success",
        message: "Category deleted successfully (Soft Delete)"
    });
});