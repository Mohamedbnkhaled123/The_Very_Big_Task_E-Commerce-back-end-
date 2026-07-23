const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },
    price: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    desc: { 
        type: String, 
        trim: true 
    },
    imgURL: { 
        type: String, 
        default: "" 
    },
    stock: { 
        type: Number, 
        required: true, 
        min: 0, 
        default: 0 
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    category: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Category", 
        required: true 
    },
    subCategory: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "SubCategory" 
    },
    newArrived: { type: Boolean, default: false },
    mostPopular: { type: Boolean, default: false },
    isActive:    { type: Boolean, default: true },
    isDeleted:   { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);