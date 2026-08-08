require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/product.model");
const Category = require("../models/category.model");
const { setCategoryDictionary, transformProduct } = require("../utilities/product-sync.adapter");

const BATCH_SIZE = 50; // Items per API request/bulk write
const MAX_PRODUCTS = 1000; // Limit for this script to prevent infinite loops
const DUMMY_JSON_API = "https://dummyjson.com/products";

async function setupCategories(products) {
    console.log("Setting up dynamic Category Dictionary...");
    
    // Extract all unique category names from fetched products
    const categoryNames = new Set(["Uncategorized"]);

    for (const p of products) {
        let catName = '';
        if (typeof p.category === 'string') {
            catName = p.category;
        } else if (p.category && p.category.name) {
            catName = p.category.name;
        }
        if (catName && catName.trim()) {
            categoryNames.add(catName.trim());
        }
    }

    const dictionary = {};

    for (let rawName of categoryNames) {
        // Ignore garbage category names with UUIDs, config strings, or overly long names
        if (
            rawName.length > 25 || 
            /config/i.test(rawName) || 
            /[0-9a-f]{8}/i.test(rawName) || 
            /somethingcrazy/i.test(rawName) ||
            /test/i.test(rawName)
        ) {
            continue;
        }

        // Format display name (e.g. "mens-shirts" -> "Mens Shirts")
        let displayName = rawName
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
            
        // Find or Create in DB
        let category = await Category.findOne({ 
            $or: [
                { name: new RegExp(`^${displayName}$`, 'i') },
                { name: new RegExp(`^${rawName}$`, 'i') }
            ]
        });

        if (!category) {
            console.log(`Creating category in DB: ${displayName}`);
            category = await Category.create({ name: displayName });
        }

        dictionary[rawName.toLowerCase()] = category._id.toString();
        dictionary[displayName.toLowerCase()] = category._id.toString();
    }

    dictionary['UNCATEGORIZED'] = dictionary['uncategorized'];
    setCategoryDictionary(dictionary);

    console.log(`Category Dictionary Ready with ${Object.keys(dictionary).length} mappings.`);
}

async function runSeeder() {
    console.log("Starting Electronics API Sync Engine...");

    try {
        await mongoose.connect(process.env.DB_URI);
        console.log("Connected to MongoDB.");

        const syncSessionId = `SYNC_${Date.now()}`;
        console.log(`Sync Session ID: ${syncSessionId}`);

        let allExternalProducts = [];

        // 1. Fetch from DummyJSON API
        console.log(`Fetching from DummyJSON API...`);
        let dummySkip = 0;
        let dummyHasMore = true;
        while (dummyHasMore) {
            const res = await fetch(`${DUMMY_JSON_API}?limit=${BATCH_SIZE}&skip=${dummySkip}&select=id,title,price,discountPercentage,description,thumbnail,images,category,stock,rating`);
            if (res.ok) {
                const data = await res.json();
                if (data.products && data.products.length > 0) {
                    // Add prefix to id to avoid collisions
                    const dummyProds = data.products.map(p => ({ ...p, id: 'dj_' + p.id }));
                    allExternalProducts.push(...dummyProds);
                    dummySkip += BATCH_SIZE;
                    if (dummySkip >= data.total) dummyHasMore = false;
                } else {
                    dummyHasMore = false;
                }
            } else {
                console.error("DummyJSON fetch failed:", res.statusText);
                dummyHasMore = false;
            }
        }
        console.log(`Fetched ${allExternalProducts.length} products from DummyJSON.`);

        // 2. Fetch from Platzi API (EscuelaJS)
        console.log(`Fetching from Platzi Fake Store API...`);
        try {
            const platziRes = await fetch('https://api.escuelajs.co/api/v1/products?offset=0&limit=500');
            if (platziRes.ok) {
                const platziData = await platziRes.json();
                if (platziData && platziData.length > 0) {
                    const platziProds = platziData.map(p => ({ ...p, id: 'pz_' + p.id }));
                    allExternalProducts.push(...platziProds);
                    console.log(`Fetched ${platziData.length} products from Platzi API.`);
                }
            }
        } catch (e) {
            console.error("Platzi API fetch failed:", e.message);
        }

        console.log(`Total base products fetched from APIs: ${allExternalProducts.length}`);

        // Sanitize: Strictly filter out garbage products (from open sandbox APIs like Platzi)
        allExternalProducts = allExternalProducts.filter(p => {
            const title = (p.title || p.name || '');
            const titleLower = title.toLowerCase();
            
            // Filter gibberish, UUIDs, and sandbox test entries
            const isGarbageTitle = title.length < 5 || 
                                 title.length > 60 ||
                                 /[0-9a-f]{8}-[0-9a-f]{4}/i.test(title) || // UUIDs
                                 /[0-9a-f]{20}/i.test(title) || // Long hex strings
                                 /(updatedname|config|test|new product|asd|qwe|dfd|gdj)/i.test(titleLower) ||
                                 (/^([a-zA-Z])\1+$/).test(titleLower); // e.g. "ssss", "aaa"
            
            // Validate Image Domains
            let hasValidImg = false;
            let firstImg = p.thumbnail || (p.images && p.images[0]);
            
            if (typeof firstImg === 'string') {
                if (firstImg.startsWith('["')) {
                    try { firstImg = JSON.parse(firstImg)[0]; } catch(e) {}
                }
                
                // Exclude known dead/placeholder/test domains
                const isBadDomain = firstImg.includes('placeimg') || 
                                    firstImg.includes('anyimg') || 
                                    firstImg.includes('placehold.co') ||
                                    firstImg.includes('lorem.space') ||
                                    firstImg.includes('yavuzceliker');
                                    
                if (firstImg && firstImg.startsWith('http') && !isBadDomain) {
                    hasValidImg = true;
                }
            }
            
            return !isGarbageTitle && hasValidImg;
        });

        console.log(`Cleaned base products: ${allExternalProducts.length}`);

        if (allExternalProducts.length === 0) {
            console.log("No valid products found. Exiting.");
            process.exit(1);
        }

        // Setup dynamic categories dictionary for all cleaned products
        await setupCategories(allExternalProducts);

        // 3. Variant Expansion Engine (To reach > 1000 products!)
        console.log("Running Variant Expansion Engine to scale catalog to 1000+ products...");
        const expandedProducts = [];
        const variantSuffixes = [
            " - Pro Edition", " - Max", " - Ultra", " - 5G", " - Lite", 
            " - 128GB Black", " - 256GB Silver", " - 512GB Gold", " - 64GB Blue",
            " - 2024 Model", " (Refurbished)", " - Special Edition", " - Carbon Fiber"
        ];

        // First, add all base products
        expandedProducts.push(...allExternalProducts);

        // Then generate variants until we hit MAX_PRODUCTS
        let variantCounter = 1;
        while (expandedProducts.length < MAX_PRODUCTS) {
            // Loop through base products and create variants
            for (const baseProd of allExternalProducts) {
                if (expandedProducts.length >= MAX_PRODUCTS) break;
                
                const suffix = variantSuffixes[variantCounter % variantSuffixes.length];
                const variantProd = { ...baseProd };
                
                // Modify variant details
                variantProd.id = `${baseProd.id}_v${variantCounter}`;
                variantProd.title = `${baseProd.title || baseProd.name}${suffix}`;
                variantProd.price = Math.round((baseProd.price || 100) * (1 + (Math.random() * 0.4 - 0.2))); // Price +/- 20%
                variantProd.stock = Math.floor(Math.random() * 200) + 10;
                
                expandedProducts.push(variantProd);
                variantCounter++;
            }
        }
        console.log(`Expansion complete! Target generated catalog size: ${expandedProducts.length}`);

        // 4. Transform and Bulk Write
        console.log(`Transforming ${expandedProducts.length} products...`);
        const bulkOps = expandedProducts.map(extProduct => {
            const mappedProduct = transformProduct(extProduct, syncSessionId);
            return {
                updateOne: {
                    filter: { externalProductId: mappedProduct.externalProductId },
                    update: { $set: mappedProduct },
                    upsert: true
                }
            };
        });

        console.log(`Executing MongoDB bulkWrite for ${bulkOps.length} operations...`);
        
        // Execute in chunks of 500 to prevent BSON size limits
        const CHUNK_SIZE = 500;
        let totalMatched = 0;
        let totalUpserted = 0;
        
        for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
            const chunk = bulkOps.slice(i, i + CHUNK_SIZE);
            console.log(`Writing chunk ${i} to ${i + chunk.length}...`);
            const bulkResult = await Product.bulkWrite(chunk);
            totalMatched += bulkResult.matchedCount;
            totalUpserted += bulkResult.upsertedCount;
        }

        console.log(`Total Bulk Write Result -> Matched: ${totalMatched}, Upserted: ${totalUpserted}`);

        // 5. Orphaned Products Cleanup
        console.log("Running Orphaned Products Cleanup...");
        const cleanupResult = await Product.updateMany(
            { 
                externalProductId: { $exists: true }, 
                syncSessionId: { $ne: syncSessionId } 
            },
            { 
                $set: { isActive: false, stock: 0 } 
            }
        );
        console.log(`Cleanup complete. Orphaned products deactivated: ${cleanupResult.modifiedCount}`);

        // 6. Delete empty categories with 0 active products
        console.log("Cleaning empty categories...");
        const allCats = await Category.find({});
        let deletedCatCount = 0;
        for (const cat of allCats) {
            const prodCount = await Product.countDocuments({ category: cat._id, isDeleted: false, isActive: true });
            if (prodCount === 0) {
                await Category.deleteOne({ _id: cat._id });
                deletedCatCount++;
            }
        }
        console.log(`Empty categories deleted: ${deletedCatCount}`);

        console.log("Sync Session Completed Successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error during sync:", error);
        process.exit(1);
    }
}

runSeeder();
