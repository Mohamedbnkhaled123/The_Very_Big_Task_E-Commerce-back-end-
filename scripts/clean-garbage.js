const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('../models/product.model.js');
const Order = require('../models/order.model.js');

mongoose.connect(process.env.DB_URI).then(async () => {
    const orders = await Order.find().lean();
    const usedIds = new Set();
    orders.forEach(o => {
        if (o.items) {
            o.items.forEach(i => {
                if (i.productId) usedIds.add(i.productId.toString());
            });
        }
    });

    const result = await Product.deleteMany({
        _id: { $nin: Array.from(usedIds) },
        isActive: false,
        stock: 0
    });
    console.log('Deleted garbage products:', result.deletedCount);
    process.exit(0);
});
