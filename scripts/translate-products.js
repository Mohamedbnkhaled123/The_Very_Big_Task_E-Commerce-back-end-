const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/product.model');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const DB_URI = process.env.DB_URI || 'mongodb://127.0.0.1:27017/shopro'; // Fallback if missing

async function translateText(text, targetLang) {
    if (!text || text.trim() === '') return text;
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        const data = await response.json();
        // The Google Translate API returns a nested array. The translations are at data[0][i][0]
        if (data && data[0]) {
            return data[0].map(segment => segment[0]).join('');
        }
        return text;
    } catch (error) {
        console.error(`[Translation Error] Failed to translate to ${targetLang}:`, error.message);
        throw error;
    }
}

async function run() {
    try {
        console.log('Connecting to database...', DB_URI);
        await mongoose.connect(DB_URI);
        console.log('Connected to MongoDB.');

        // Find products that are missing either Arabic or English names
        const products = await Product.find({
            $or: [
                { name_ar: { $exists: false } },
                { name_en: { $exists: false } },
                { name_ar: "" },
                { name_en: "" }
            ]
        });

        console.log(`Found ${products.length} products to translate.`);

        let successCount = 0;
        let failCount = 0;

        // Process in batches to avoid overwhelming the API
        const batchSize = 10;
        for (let i = 0; i < products.length; i += batchSize) {
            const batch = products.slice(i, i + batchSize);
            console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(products.length / batchSize)}...`);

            await Promise.all(batch.map(async (product) => {
                try {
                    // Translate Name
                    if (!product.name_ar) {
                        product.name_ar = await translateText(product.name, 'ar');
                    }
                    if (!product.name_en) {
                        product.name_en = await translateText(product.name, 'en');
                    }

                    // Translate Description if it exists
                    if (product.desc) {
                        if (!product.desc_ar) {
                            product.desc_ar = await translateText(product.desc, 'ar');
                        }
                        if (!product.desc_en) {
                            product.desc_en = await translateText(product.desc, 'en');
                        }
                    }

                    await product.save();
                    successCount++;
                    console.log(`  [OK] Translated: ${product.name} (ID: ${product._id})`);
                } catch (err) {
                    failCount++;
                    console.error(`  [FAIL] Product ID ${product._id}:`, err.message);
                }
            }));

            // Delay between batches to respect API limits (500ms)
            if (i + batchSize < products.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log('-----------------------------------');
        console.log(`Migration Complete.`);
        console.log(`Success: ${successCount}`);
        console.log(`Failed: ${failCount}`);
        console.log('-----------------------------------');

    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
        process.exit(0);
    }
}

run();
