const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },
    name_ar: { type: String, trim: true },
    name_en: { type: String, trim: true },
    price: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    discount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    desc: { 
        type: String, 
        trim: true 
    },
    desc_ar: { type: String, trim: true },
    desc_en: { type: String, trim: true },
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
    isDeleted:   { type: Boolean, default: false },
    externalProductId: { 
        type: String, 
        unique: true, 
        sparse: true // Only enforces uniqueness if the field exists
    },
    syncSessionId: { 
        type: String 
    }
}, { timestamps: true });

// Mongoose Indexes for high-speed database queries (Microsecond-level performance)
productSchema.index({ mostPopular: 1, isActive: 1, isDeleted: 1 });
productSchema.index({ newArrived: 1, isActive: 1, isDeleted: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ category: 1, isActive: 1, isDeleted: 1 });

module.exports = mongoose.model("Product", productSchema);