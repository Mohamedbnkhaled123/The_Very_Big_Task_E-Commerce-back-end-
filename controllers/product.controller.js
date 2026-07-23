const mongoose = require("mongoose");
const Product = require("../models/product.model");
require("../models/category.model");
require("../models/subCategory.model");
const jwt = require("jsonwebtoken");
const cache = require("../utilities/memoryCache.utility");
const AppError = require("../utilities/appError.utility.js");
const catchAsync = require("../utilities/catchAsync.utility.js");

const cacheKey = "products";

// Fetches all store products
exports.getProduct = catchAsync(async (req, res, next) => {
    let isAdmin = req.query.all === "true";
    if (!isAdmin && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        try {
            const token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.SECRET_KEY);
            if (decoded && (decoded.role === "admin" || decoded.role === "Admin")) {
                isAdmin = true;
            }
        } catch (e) {
            // Token expired or invalid
        }
    }

    const query = isAdmin ? {} : { isDeleted: false, isActive: true };

    if (!isAdmin) {
        const cachedProducts = cache.get(cacheKey);
        if (cachedProducts) {
            return res.status(200).json({ 
                status: "success", 
                message: "products fetched from cache", 
                data: cachedProducts 
            });
        }
    }

    const products = await Product.find(query)
        .populate("category")
        .lean();
    
    if (!isAdmin) {
        cache.set(cacheKey, products);
    }

    res.status(200).json({ 
        status: "success", 
        message: "products fetched from database", 
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
    const { name, price, desc, stock, slug, category, subCategory, newArrived, mostPopular } = req.body || {};

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

    const { name, price, desc, stock, category, subCategory, newArrived, mostPopular, isActive } = req.body || {};

    const payload = {};
    if (name !== undefined) payload.name = name;
    if (price !== undefined && price !== null && price !== "") payload.price = Number(price);
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