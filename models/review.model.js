const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Review must belong to a user"]
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: false // يمكن أن يكون تقييم عام للمتجر وليس لمنتج محدد
        },
        text: {
            type: String,
            required: [true, "Review text cannot be empty"],
            trim: true
        },
        rating: {
            type: Number,
            required: [true, "Review must have a rating"],
            min: 1,
            max: 5
        },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Cancelled"],
            default: "Pending" // لا يظهر في الـ Homepage إلا بعد موافقة الأدمن
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);