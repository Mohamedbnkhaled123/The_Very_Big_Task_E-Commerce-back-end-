// product-sync.adapter.js

/**
 * Strict Category Dictionary
 * Maps external category strings from DummyJSON to local MongoDB ObjectIds.
 * The 'UNCATEGORIZED' key is used as a fallback for any unmapped categories.
 */
const CATEGORY_DICTIONARY = {
    // Example mapping, these should be updated with actual ObjectIds from the database
    // 'smartphones': '60d21b4667d0d8992e610c85',
    // 'laptops': '60d21b4667d0d8992e610c86',
    
    // We will initialize this dynamically in the seed script before syncing
    UNCATEGORIZED: null
};

/**
 * Sets the dynamic category dictionary from the database.
 * @param {Object} mapping - Dictionary mapping { 'smartphones': 'ObjectId', ... }
 */
const setCategoryDictionary = (mapping) => {
    Object.assign(CATEGORY_DICTIONARY, mapping);
};

/**
 * Helper to slugify a string
 */
const slugify = (text) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
};

/**
 * Transforms a raw external product payload into a local Mongoose Product object.
 * 
 * @param {Object} externalProduct - The raw product object from DummyJSON
 * @param {String} syncSessionId - The unique session ID for this sync operation
 * @returns {Object} A mapped product object ready for Mongoose bulkWrite
 */
const transformProduct = (externalProduct, syncSessionId) => {
    // Platzi API uses category.name, DummyJSON uses category string
    let categoryString = '';
    if (typeof externalProduct.category === 'string') {
        categoryString = externalProduct.category;
    } else if (externalProduct.category && externalProduct.category.name) {
        categoryString = externalProduct.category.name;
    }

    const categoryKey = categoryString.toLowerCase();
    const localCategoryId = CATEGORY_DICTIONARY[categoryKey] || CATEGORY_DICTIONARY['UNCATEGORIZED'];

    if (!localCategoryId) {
        throw new Error(`Fallback UNCATEGORIZED category is not set in dictionary. Cannot map product: ${externalProduct.title || externalProduct.title}`);
    }

    const title = externalProduct.title || externalProduct.name || 'Unknown Product';
    const generatedSlug = `${slugify(title)}-${externalProduct.id}-${Math.floor(Math.random()*10000)}`;

    // Handle images (Platzi returns images array of strings, sometimes with brackets)
    let imgURL = '';
    if (externalProduct.thumbnail) {
        imgURL = externalProduct.thumbnail;
    } else if (externalProduct.images && externalProduct.images.length > 0) {
        let firstImg = externalProduct.images[0];
        if (typeof firstImg === 'string') {
            // Platzi sometimes returns stringified arrays like '["https://..."]'
            if (firstImg.startsWith('["')) {
                try {
                    firstImg = JSON.parse(firstImg)[0];
                } catch(e) {}
            }
            imgURL = firstImg;
        }
    }

    return {
        name: title,
        price: externalProduct.price || 0,
        discount: externalProduct.discountPercentage || 0,
        desc: externalProduct.description || 'No description available',
        imgURL: imgURL || 'https://via.placeholder.com/300',
        stock: typeof externalProduct.stock === 'number' ? externalProduct.stock : Math.floor(Math.random() * 100) + 10,
        slug: generatedSlug,
        category: localCategoryId,
        newArrived: true,
        mostPopular: (externalProduct.rating && externalProduct.rating >= 4.5) || Math.random() > 0.8,
        isActive: true,
        isDeleted: false,
        externalProductId: externalProduct.id ? externalProduct.id.toString() : `ext-${Date.now()}-${Math.random()}`,
        syncSessionId: syncSessionId
    };
};

module.exports = {
    CATEGORY_DICTIONARY,
    setCategoryDictionary,
    transformProduct
};
