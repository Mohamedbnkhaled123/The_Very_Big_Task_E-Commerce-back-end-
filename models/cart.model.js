const mongoose = require("mongoose");


module.exports = cartItemSchema = new mongoose.Schema({
    productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Product", // ربط مباشر بجدول المنتجات (Normalization)
        required: true 
    },
    name: { 
        type: String, 
        // required: true,
        trim: true // (Denormalization للاسم)
    },
    quantity: { 
        type: Number, 
        required: true, 
        min: 1, 
        default: 1 
    },
    priceAtAddition: { 
        type: Number, 
        // required: true,
        min: 0 // لقطة للسعر وقت ما العميل ضغط على الزرار
    },
    isPriceChanged: { 
        type: Boolean, 
        default: false // علم بيتغير لـ true لو السعر الحالي اختلف عن السعر وقت الإضافة
    }
});