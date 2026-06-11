const express = require('express');
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// --- MULTER DISK STORAGE CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Destination folder
    },
    filename: (req, file, cb) => {
        // Generate completely unique filename using current timestamp + original extension
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Enforce validation constraints: Only images allowed, max 5MB
const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 },
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png|webp/;
        const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimeType = fileTypes.test(file.mimetype);

        if (extName && mimeType) {
            return cb(null, true);
        } else {
            cb(new Error('Only system image files (.jpeg, .jpg, .png, .webp) are allowed.'));
        }
    }
});

// --- 1. GET ALL PRODUCTS (Public) ---
router.get('/', async (req, res) => {
    try {
        const products = await Product.find({});
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: "Failed to retrieve catalog.", details: err.message });
    }
});

// --- 2. GET SINGLE PRODUCT DETAILS (Public) ---
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: "Product not found." });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: "Error fetching details.", details: err.message });
    }
});

// --- 3. CREATE A NEW PRODUCT (Admin Only + Handles File Upload) ---
// Note: upload.single('image') intercepts the file upload stream before running our code
router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({ error: "Access denied. Administrative privileges required." });
        }

        const { name, description, price, stockQuantity } = req.body;

        if (!name || !description || !price || !stockQuantity) {
            return res.status(400).json({ error: "All structural descriptive fields are required." });
        }

        // Construct local URL reference pointing to our static asset path if file was uploaded
        let imageUrl = '';
        if (req.file) {
            imageUrl = `http://localhost:5001/uploads/${req.file.filename}`;
        }

        const newProduct = new Product({
            name,
            description,
            // Multipart data interprets numbers as text strings; we must convert them back explicitly
            price: parseFloat(price),
            stockQuantity: parseInt(stockQuantity),
            imageUrl
        });

        const savedProduct = await newProduct.save();
        res.status(201).json({ message: "Product published successfully.", product: savedProduct });

    } catch (err) {
        res.status(500).json({ error: "Failed to process admin form submission.", details: err.message });
    }
});

// --- 4. UPDATE AN EXISTING PRODUCT (Admin Only + Optional New Image Upload) ---
router.put('/:id', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({ error: "Access denied. Administrative privileges required." });
        }

        const { name, description, price, stockQuantity } = req.body;
        
        // Build updated payload object
        let updateData = {
            name,
            description,
            price: parseFloat(price),
            stockQuantity: parseInt(stockQuantity)
        };

        // If the admin uploaded a completely new image file, swap the path string
        if (req.file) {
            updateData.imageUrl = `http://localhost:5001/uploads/${req.file.filename}`;
        }

        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after' });
        
        if (!updatedProduct) {
            return res.status(404).json({ error: "Product not found inside records." });
        }

        res.json({ message: "Product updated successfully.", product: updatedProduct });

    } catch (err) {
        res.status(500).json({ error: "Failed to update target product.", details: err.message });
    }
});

// --- 5. DELETE A PRODUCT FROM THE DATABASE (Admin Only) ---
router.delete('/:id', auth, async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({ error: "Access denied. Administrative privileges required." });
        }

        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        
        if (!deletedProduct) {
            return res.status(404).json({ error: "Target item did not exist inside collection." });
        }

        res.json({ message: "Product permanently expunged from database catalog." });

    } catch (err) {
        res.status(500).json({ error: "Failed to execute database deletion loop.", details: err.message });
    }
});

module.exports = router;