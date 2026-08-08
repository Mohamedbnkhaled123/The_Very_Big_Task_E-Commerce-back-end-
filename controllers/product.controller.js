const mongoose = require("mongoose");
const Product = require("../models/product.model");
require("../models/category.model");
require("../models/subCategory.model");
const jwt = require("jsonwebtoken");
const cache = require("../utilities/memoryCache.utility");
const AppError = require("../utilities/appError.utility.js");
const catchAsync = require("../utilities/catchAsync.utility.js");

const cacheKey = "products";

// Fetches all store products with server-side pagination and filtering
exports.getProduct = catchAsync(async (req, res, next) => {
    const isAdmin = req.query.all === "true";

    // Build the query object
    const query = isAdmin ? {} : { isDeleted: false, isActive: true };

    // 1. Search filter (with Arabic normalization)
    if (req.query.search) {
        // Normalize Arabic characters to support interchangeable letters
        const normalizedSearch = req.query.search
            .replace(/[اأإآ]/g, '[اأإآ]')
            .replace(/[هة]/g, '[هة]')
            .replace(/[يى]/g, '[يى]');
            
        const searchRegex = { $regex: normalizedSearch, $options: "i" };
        
        query.$or = [
            { name: searchRegex },
            { name_ar: searchRegex },
            { desc: searchRegex },
            { desc_ar: searchRegex },
            { slug: searchRegex }
        ];
    }

    // 2. Category filter
    if (req.query.category && mongoose.Types.ObjectId.isValid(req.query.category)) {
        query.category = req.query.category;
    }

    // 3. Price filters
    if (req.query.minPrice || req.query.maxPrice) {
        query.price = {};
        if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
        if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 13;
    const skip = (page - 1) * limit;

    // Execute queries in parallel for performance
    const [products, totalResults] = await Promise.all([
        Product.find(query)
            .populate("category")
            .skip(skip)
            .limit(limit)
            .lean(),
        Product.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalResults / limit) || 1;

    res.status(200).json({ 
        status: "success", 
        message: "products fetched from database",
        results: products.length,
        totalResults,
        totalPages,
        currentPage: page,
        data: products 
    });
});

// Returns paginated products result
exports.paginateProducts = catchAsync(async (req, res, next) => {
    res.status(200).json({ 
        status: "success", 
        data: res.paginatedResult 
    });
});

// Fetches product by slug
exports.getProductBySlug = catchAsync(async (req, res, next) => {
    const slug = req.params.slug;
    const myProduct = await Product.findOne({ slug });
    
    if (!myProduct) {
        return next(new AppError(`Product not found with slug: ${slug}`, 404));
    }

    res.status(200).json({ 
        status: "success", 
        data: myProduct 
    });
});

// Fetches product by ID
exports.getProductById = catchAsync(async (req, res, next) => {
    const id = req.params.id;
    const myProduct = await Product.findById(id);
    
    if (!myProduct) {
        return next(new AppError(`Product not found with ID: ${id}`, 404));
    }

    res.status(200).json({ 
        status: "success", 
        data: myProduct 
    });
});

// Fetches related category products
exports.getRelatedProducts = catchAsync(async (req, res, next) => {
    const slug = req.params.slug;
    const currentProduct = await Product.findOne({ slug });
    
    if (!currentProduct) {
        return next(new AppError("Main product not found", 404));
    }

    const query = {
        slug: { $ne: slug },
        isDeleted: false,
        isActive: true
    };

    if (currentProduct.category) {
        query.category = currentProduct.category;
    }

    const related = await Product.find(query).limit(4);

    res.status(200).json({ 
        status: "success", 
        data: related 
    });
});

// Creates new store product
exports.addProduct = catchAsync(async (req, res, next) => {
    const { name, price, discount, desc, stock, slug, category, subCategory, newArrived, mostPopular } = req.body || {};

    if (!name || price === undefined || price === null || stock === undefined || stock === null) {
        return next(new AppError("Please fill in all required fields (Name, Price, Stock).", 400));
    }

    if (!category || category === "null" || category === "undefined" || category === "") {
        return next(new AppError("Please select a Category for the product.", 400));
    }

    const imgURL = req.file ? req.file.filename : "";

    const cleanSlug = (slug && slug.trim()) 
        ? slug.trim().toLowerCase() 
        : name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-') + '-' + Date.now();

    const newProduct = await Product.create({
        name,
        price: Number(price),
        discount: discount !== undefined && discount !== null && discount !== "" ? Number(discount) : 0,
        desc: desc || "",
        stock: Number(stock),
        slug: cleanSlug,
        imgURL,
        category,
        subCategory: (subCategory && subCategory !== "null" && subCategory !== "undefined" && subCategory !== "") ? subCategory : undefined,
        newArrived: newArrived === "true" || newArrived === true,
        mostPopular: mostPopular === "true" || mostPopular === true
    });

    cache.del(cacheKey);

    res.status(201).json({ 
        status: "success", 
        message: "Product added successfully and cache invalidated", 
        data: newProduct 
    });
});

// Updates existing product details
exports.updateProduct = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError("Invalid Product ID format", 400));
    }

    const { name, price, discount, desc, stock, category, subCategory, newArrived, mostPopular, isActive } = req.body || {};

    const payload = {};
    if (name !== undefined) payload.name = name;
    if (price !== undefined && price !== null && price !== "") payload.price = Number(price);
    if (discount !== undefined && discount !== null && discount !== "") payload.discount = Number(discount);
    if (desc !== undefined) payload.desc = desc;
    if (stock !== undefined && stock !== null && stock !== "") payload.stock = Number(stock);
    if (newArrived !== undefined) payload.newArrived = newArrived === "true" || newArrived === true;
    if (mostPopular !== undefined) payload.mostPopular = mostPopular === "true" || mostPopular === true;
    if (isActive !== undefined) payload.isActive = isActive === "true" || isActive === true;

    if (req.file) {
        payload.imgURL = req.file.filename;
    }

    if (category && category !== "null" && category !== "undefined" && category !== "" && mongoose.Types.ObjectId.isValid(category)) {
        payload.category = category;
    }
    if (subCategory && subCategory !== "null" && subCategory !== "undefined" && subCategory !== "" && mongoose.Types.ObjectId.isValid(subCategory)) {
        payload.subCategory = subCategory;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
        id,
        payload,
        { new: true }
    );

    if (!updatedProduct) {
        return next(new AppError("Product not found", 404));
    }

    cache.del(cacheKey);

    res.status(200).json({ 
        status: "success", 
        message: "Product updated successfully", 
        data: updatedProduct 
    });
});

// Soft deletes product by ID
exports.deleteProduct = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const product = await Product.findByIdAndUpdate(
        id,
        { isDeleted: true, isActive: false },
        { new: true }
    );

    if (!product) {
        return next(new AppError("Product not found", 404));
    }

    cache.del(cacheKey);

    res.status(200).json({ 
        status: "success", 
        message: "Product deleted successfully" 
    });
});

// Restores soft-deleted product by ID
exports.restoreProduct = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const product = await Product.findByIdAndUpdate(
        id,
        { isDeleted: false, isActive: true },
        { new: true }
    );

    if (!product) {
        return next(new AppError("Product not found", 404));
    }

    cache.del(cacheKey);

    res.status(200).json({ 
        status: "success", 
        message: "Product restored successfully" 
    });
});

// Toggles product active status
exports.toggleProductStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
        return next(new AppError("Product not found", 404));
    }

    product.isActive = !product.isActive;
    await product.save();

    cache.del(cacheKey);

    res.status(200).json({
        status: "success",
        message: `Product status toggled to ${product.isActive}`,
        data: product
    });
});