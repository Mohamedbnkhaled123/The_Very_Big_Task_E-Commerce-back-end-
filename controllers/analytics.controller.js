const Order = require("../models/order.model");
const Product = require("../models/product.model");
const Review = require("../models/review.model");
const AppError = require("../utilities/appError.utility.js");
const catchAsync = require("../utilities/catchAsync.utility.js");

// Helper function to build date filter from range query parameter (includes previous period for comparison)
const getDateRangeFilter = (query) => {
    const range = (query.range || "month").toLowerCase();
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (range === "today") {
        startDate.setHours(0, 0, 0, 0);
    } else if (range === "week") {
        startDate.setDate(now.getDate() - 7);
    } else if (range === "month") {
        startDate.setDate(now.getDate() - 30);
    } else if (range === "year") {
        startDate.setFullYear(now.getFullYear() - 1);
    } else if (range === "custom" && query.from) {
        startDate = new Date(query.from);
        if (query.to) endDate = new Date(query.to);
    } else {
        startDate.setDate(now.getDate() - 30);
    }

    const duration = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime());
    const prevStartDate = new Date(startDate.getTime() - (duration > 0 ? duration : 86400000));

    return { startDate, endDate, prevStartDate, prevEndDate };
};

// Growth delta percentage formula helper
const calcGrowth = (current, previous) => {
    if (previous === null || previous === undefined || previous === 0) return null;
    return Math.round(((current - previous) / previous) * 1000) / 10;
};

// 1. Financial & Revenue Analytics (KPIs + Period-over-Period Growth + Daily Trend)
exports.getFinancialAnalytics = catchAsync(async (req, res, next) => {
    const { startDate, endDate, prevStartDate, prevEndDate } = getDateRangeFilter(req.query);

    const periodFacet = await Order.aggregate([
        {
            $facet: {
                currentPeriod: [
                    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
                    {
                        $group: {
                            _id: null,
                            grossRevenue: {
                                $sum: {
                                    $cond: [
                                        { $in: ["$orderStatus", ["shipped", "received"]] },
                                        { $ifNull: ["$grossTotal", "$totalPrice"] },
                                        0
                                    ]
                                }
                            },
                            totalDiscounts: {
                                $sum: {
                                    $cond: [
                                        { $in: ["$orderStatus", ["shipped", "received"]] },
                                        { $ifNull: ["$totalDiscount", 0] },
                                        0
                                    ]
                                }
                            },
                            totalShipping: {
                                $sum: {
                                    $cond: [
                                        { $in: ["$orderStatus", ["shipped", "received"]] },
                                        { $ifNull: ["$shippingFee", 0] },
                                        0
                                    ]
                                }
                            },
                            netRevenue: {
                                $sum: {
                                    $cond: [
                                        { $in: ["$orderStatus", ["shipped", "received"]] },
                                        { $ifNull: ["$netTotal", "$totalPrice"] },
                                        0
                                    ]
                                }
                            },
                            approvedOrderCount: {
                                $sum: {
                                    $cond: [{ $in: ["$orderStatus", ["shipped", "received"]] }, 1, 0]
                                }
                            },
                            lostRevenue: {
                                $sum: {
                                    $cond: [
                                        { $in: ["$orderStatus", ["rejected", "cancelledByAdmin", "cancelledByUser"]] },
                                        { $ifNull: ["$netTotal", "$totalPrice"] },
                                        0
                                    ]
                                }
                            },
                            cancelledOrderCount: {
                                $sum: {
                                    $cond: [{ $in: ["$orderStatus", ["rejected", "cancelledByAdmin", "cancelledByUser"]] }, 1, 0]
                                }
                            },
                            pendingRevenue: {
                                $sum: {
                                    $cond: [
                                        { $in: ["$orderStatus", ["pending", "prepared"]] },
                                        { $ifNull: ["$netTotal", "$totalPrice"] },
                                        0
                                    ]
                                }
                            },
                            pendingOrderCount: {
                                $sum: {
                                    $cond: [{ $in: ["$orderStatus", ["pending", "prepared"]] }, 1, 0]
                                }
                            },
                            returnedOrderCount: {
                                $sum: {
                                    $cond: [{ $in: ["$orderStatus", ["returned", "refunded"]] }, 1, 0]
                                }
                            },
                            returnedRevenue: {
                                $sum: {
                                    $cond: [
                                        { $in: ["$orderStatus", ["returned", "refunded"]] },
                                        { $ifNull: ["$netTotal", "$totalPrice"] },
                                        0
                                    ]
                                }
                            },
                            totalOrders: { $sum: 1 }
                        }
                    }
                ],
                previousPeriod: [
                    { $match: { createdAt: { $gte: prevStartDate, $lte: prevEndDate } } },
                    {
                        $group: {
                            _id: null,
                            netRevenue: {
                                $sum: {
                                    $cond: [
                                        { $in: ["$orderStatus", ["shipped", "received"]] },
                                        { $ifNull: ["$netTotal", "$totalPrice"] },
                                        0
                                    ]
                                }
                            },
                            approvedOrderCount: {
                                $sum: {
                                    $cond: [{ $in: ["$orderStatus", ["shipped", "received"]] }, 1, 0]
                                }
                            },
                            totalOrders: { $sum: 1 }
                        }
                    }
                ]
            }
        }
    ]);

    const currentRaw = (periodFacet[0]?.currentPeriod[0]) || {
        grossRevenue: 0,
        totalDiscounts: 0,
        totalShipping: 0,
        netRevenue: 0,
        approvedOrderCount: 0,
        lostRevenue: 0,
        cancelledOrderCount: 0,
        pendingRevenue: 0,
        pendingOrderCount: 0,
        returnedOrderCount: 0,
        returnedRevenue: 0,
        totalOrders: 0
    };

    const previousRaw = (periodFacet[0]?.previousPeriod[0]) || {
        netRevenue: 0,
        approvedOrderCount: 0,
        totalOrders: 0
    };

    const averageOrderValue = currentRaw.approvedOrderCount > 0 ? (currentRaw.netRevenue / currentRaw.approvedOrderCount) : 0;
    const prevAOV = previousRaw.approvedOrderCount > 0 ? (previousRaw.netRevenue / previousRaw.approvedOrderCount) : 0;

    const fulfilledCount = currentRaw.approvedOrderCount + currentRaw.returnedOrderCount;
    const returnRate = fulfilledCount > 0 ? Math.round((currentRaw.returnedOrderCount / fulfilledCount) * 10000) / 100 : 0;

    const kpis = {
        grossRevenue: Math.round(currentRaw.grossRevenue * 100) / 100,
        totalDiscounts: Math.round(currentRaw.totalDiscounts * 100) / 100,
        totalShipping: Math.round(currentRaw.totalShipping * 100) / 100,
        netRevenue: Math.round(currentRaw.netRevenue * 100) / 100,
        approvedOrderCount: currentRaw.approvedOrderCount,
        lostRevenue: Math.round(currentRaw.lostRevenue * 100) / 100,
        cancelledOrderCount: currentRaw.cancelledOrderCount,
        pendingRevenue: Math.round(currentRaw.pendingRevenue * 100) / 100,
        pendingOrderCount: currentRaw.pendingOrderCount,
        returnedOrderCount: currentRaw.returnedOrderCount,
        returnedRevenue: Math.round(currentRaw.returnedRevenue * 100) / 100,
        totalOrders: currentRaw.totalOrders,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        returnRate
    };

    const growth = {
        netRevenueGrowth: calcGrowth(currentRaw.netRevenue, previousRaw.netRevenue),
        orderCountGrowth: calcGrowth(currentRaw.approvedOrderCount, previousRaw.approvedOrderCount),
        aovGrowth: calcGrowth(averageOrderValue, prevAOV)
    };

    // Daily Revenue Trend for Line Chart (Approved Orders - Dual Dataset: Net vs Gross)
    const revenueTrend = await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate },
                orderStatus: { $in: ["shipped", "received"] }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                dailyNetRevenue: { $sum: { $ifNull: ["$netTotal", "$totalPrice"] } },
                dailyGrossRevenue: { $sum: { $ifNull: ["$grossTotal", "$totalPrice"] } },
                orderCount: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
        status: "success",
        data: {
            kpis,
            growth,
            revenueTrend: revenueTrend.map(point => ({
                date: point._id,
                revenue: Math.round(point.dailyNetRevenue * 100) / 100,
                grossRevenue: Math.round(point.dailyGrossRevenue * 100) / 100,
                orders: point.orderCount
            }))
        }
    });
});

// 2. Top-Selling Active Products & Category Breakdown
exports.getProductAnalytics = catchAsync(async (req, res, next) => {
    const { startDate, endDate } = getDateRangeFilter(req.query);

    // Pipeline: Top 10 Best Selling Products (Filtered strictly for active/published items)
    const topProducts = await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate },
                orderStatus: { $in: ["shipped", "received"] }
            }
        },
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.productId",
                totalQuantitySold: { $sum: "$items.quantity" },
                totalRevenue: { $sum: { $multiply: ["$items.priceAtPurchase", "$items.quantity"] } }
            }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 15 },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" },
        {
            $match: {
                "product.isActive": true,
                "product.isDeleted": false
            }
        },
        {
            $lookup: {
                from: "categories",
                localField: "product.category",
                foreignField: "_id",
                as: "category"
            }
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: "$product._id",
                name: "$product.name",
                imgURL: "$product.imgURL",
                price: "$product.price",
                categoryName: { $ifNull: ["$category.name", "Uncategorized"] },
                totalQuantitySold: 1,
                totalRevenue: 1
            }
        },
        { $limit: 10 }
    ]);

    // Pipeline: Sales Breakdown by Category
    const categoryBreakdown = await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate },
                orderStatus: { $in: ["shipped", "received"] }
            }
        },
        { $unwind: "$items" },
        {
            $lookup: {
                from: "products",
                localField: "items.productId",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" },
        {
            $match: {
                "product.isActive": true,
                "product.isDeleted": false
            }
        },
        {
            $lookup: {
                from: "categories",
                localField: "product.category",
                foreignField: "_id",
                as: "category"
            }
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: { $ifNull: ["$category.name", "Uncategorized"] },
                revenue: { $sum: { $multiply: ["$items.priceAtPurchase", "$items.quantity"] } },
                quantitySold: { $sum: "$items.quantity" }
            }
        },
        { $sort: { revenue: -1 } }
    ]);

    res.status(200).json({
        status: "success",
        data: {
            topProducts,
            categoryBreakdown
        }
    });
});

// 3. Comprehensive Order Audit Log (Paginated Transaction Audit)
exports.getOrderAudit = catchAsync(async (req, res, next) => {
    const { startDate, endDate } = getDateRangeFilter(req.query);
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;

    const matchStage = {
        createdAt: { $gte: startDate, $lte: endDate }
    };

    if (req.query.status && req.query.status !== "all") {
        const reqStatus = req.query.status.toLowerCase();
        if (reqStatus === "approved") {
            matchStage.orderStatus = { $in: ["shipped", "received"] };
        } else if (reqStatus === "pending") {
            matchStage.orderStatus = { $in: ["pending", "prepared"] };
        } else if (reqStatus === "cancelled") {
            matchStage.orderStatus = { $in: ["rejected", "cancelledByAdmin", "cancelledByUser"] };
        } else if (reqStatus === "returned") {
            matchStage.orderStatus = { $in: ["returned", "refunded"] };
        } else {
            matchStage.orderStatus = req.query.status;
        }
    }

    console.log("Analytics GET /orders matchStage:", JSON.stringify(matchStage, null, 2));

    const totalOrders = await Order.countDocuments(matchStage);

    const orders = await Order.find(matchStage)
        .populate("user", "name email")
        .populate("items.productId", "name imgURL price")
        .sort("-createdAt")
        .skip(skip)
        .limit(limit);

    // Funnel Breakdown Counts
    const statusCounts = await Order.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        {
            $group: {
                _id: "$orderStatus",
                count: { $sum: 1 }
            }
        }
    ]);

    const funnelMap = {
        approved: 0, // shipped + received
        pending: 0,  // pending + prepared
        cancelled: 0, // rejected + cancelledByAdmin + cancelledByUser
        returned: 0
    };

    statusCounts.forEach(item => {
        if (["shipped", "received"].includes(item._id)) {
            funnelMap.approved += item.count;
        } else if (["pending", "prepared"].includes(item._id)) {
            funnelMap.pending += item.count;
        } else if (["rejected", "cancelledByAdmin", "cancelledByUser"].includes(item._id)) {
            funnelMap.cancelled += item.count;
        } else if (["returned", "refunded"].includes(item._id)) {
            funnelMap.returned += item.count;
        }
    });

    res.status(200).json({
        status: "success",
        data: {
            orders,
            funnel: funnelMap,
            pagination: {
                total: totalOrders,
                page,
                limit,
                totalPages: Math.ceil(totalOrders / limit) || 1
            }
        }
    });
});

// 4. Testimonials & Customer Reviews Analytics
exports.getReviewAnalytics = catchAsync(async (req, res, next) => {
    const reviewFacet = await Review.aggregate([
        {
            $facet: {
                // Star breakdown for Approved reviews only
                approvedStarBreakdown: [
                    { $match: { status: "Approved" } },
                    {
                        $group: {
                            _id: "$rating",
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: -1 } }
                ],
                // Overall average score for Approved reviews only
                approvedStats: [
                    { $match: { status: "Approved" } },
                    {
                        $group: {
                            _id: null,
                            avgRating: { $avg: "$rating" },
                            totalApproved: { $sum: 1 }
                        }
                    }
                ],
                // Moderation Status Percentages
                moderationBreakdown: [
                    {
                        $group: {
                            _id: "$status",
                            count: { $sum: 1 }
                        }
                    }
                ]
            }
        }
    ]);

    const facetResult = reviewFacet[0] || {};
    const approvedStats = facetResult.approvedStats[0] || { avgRating: 0, totalApproved: 0 };
    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    (facetResult.approvedStarBreakdown || []).forEach(item => {
        if (item._id >= 1 && item._id <= 5) {
            starCounts[item._id] = item.count;
        }
    });

    const moderationMap = { Approved: 0, Pending: 0, Cancelled: 0 };
    let totalReviews = 0;

    (facetResult.moderationBreakdown || []).forEach(item => {
        if (moderationMap.hasOwnProperty(item._id)) {
            moderationMap[item._id] = item.count;
        }
        totalReviews += item.count;
    });

    res.status(200).json({
        status: "success",
        data: {
            averageRating: Math.round((approvedStats.avgRating || 0) * 10) / 10,
            totalApprovedReviews: approvedStats.totalApproved,
            totalAllReviews: totalReviews,
            starBreakdown: starCounts,
            moderationBreakdown: moderationMap
        }
    });
});
