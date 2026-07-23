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

const MB = 1024 * 1024;
module.exports = multer({ storage: storage, fileFilter, limits: { fileSize: MB * 5 } });
