const mongoose = require("mongoose");

const staticPageSchema = new mongoose.Schema(
    {
        pageName: {
            type: String,
            required: [true, "Page name is required"],
            unique: true,
            enum: ["Home", "About", "Policy", "FAQ", "Contact"] 
        },
        content: {
            type: String,
            required: [true, "Page content cannot be empty"]
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("StaticPage", staticPageSchema);