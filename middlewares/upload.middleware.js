const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const fileFilter = (req, file, cb) => {
    const fileNameLower = (file.originalname || "").toLowerCase();
    const ext = path.extname(fileNameLower);
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.ico', '.gif', '.svg', '.avif'];
    if (!allowed.includes(ext)) {
        return cb(new Error('Only images (.jpg, .jpeg, .png, .webp) are allowed'));
    }
    cb(null, true);
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const lowerName = (file.originalname || "").toLowerCase().replace(/\s+/g, '_');
        cb(null, Date.now() + '_' + lowerName);
    }
});

const sharp = require('sharp');

const MB = 1024 * 1024;
const upload = multer({ storage: storage, fileFilter, limits: { fileSize: MB * 5 } });

// Helper to auto-compress uploaded images and generate responsive variants
upload.compressUploadedFile = async (filePath, options = { generateXs: false }) => {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const tempPath = filePath + '.tmp';
    const tempSmPath = filePath + '.sm.tmp';
    const tempXsPath = filePath + '.xs.tmp';
    try {
        // Generate main variant (max 1920x1920)
        await sharp(filePath)
            .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85 })
            .toFile(tempPath);
            
        // Generate small variant (max 640x640)
        await sharp(filePath)
            .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85 })
            .toFile(tempSmPath);

        if (options.generateXs) {
            // Generate extra-small variant (max 320x320) for LCP mobile slots
            await sharp(filePath)
                .resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 85 })
                .toFile(tempXsPath);
        }

        fs.unlinkSync(filePath);
        
        const newFilePath = filePath.replace(/\.[^/.]+$/, "") + ".webp";
        const newSmFilePath = filePath.replace(/\.[^/.]+$/, "") + "-sm.webp";
        const newXsFilePath = filePath.replace(/\.[^/.]+$/, "") + "-xs.webp";
        
        fs.renameSync(tempPath, newFilePath);
        fs.renameSync(tempSmPath, newSmFilePath);
        
        if (options.generateXs) {
            fs.renameSync(tempXsPath, newXsFilePath);
        }
        
        return newFilePath;
    } catch {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        if (fs.existsSync(tempSmPath)) fs.unlinkSync(tempSmPath);
        if (fs.existsSync(tempXsPath)) fs.unlinkSync(tempXsPath);
        return null;
    }
};

module.exports = upload;
