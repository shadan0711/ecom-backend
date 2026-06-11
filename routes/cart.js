const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// --- 1. GET CLOUD CART ---
router.get('/', auth, async (req, res) => {
    try {
        // FIXED: req.user.userId matches your token payload
        const user = await User.findById(req.user.userId).populate('cart.product');
        if (!user) return res.status(404).json({ error: "User account missing." });
        
        const formattedCart = user.cart.map(item => {
            if (!item.product) return null; 
            return {
                product: item.product._id,
                name: item.product.name,
                price: item.product.price,
                quantity: item.quantity
            };
        }).filter(Boolean);

        res.json(formattedCart);
    } catch (err) {
        res.status(500).json({ error: "Server failed to pull cart.", details: err.message });
    }
});

// --- 2. SYNC FRONTEND TO CLOUD ---
router.post('/', auth, async (req, res) => {
    try {
        const { cart } = req.body; 
        
        // FIXED: req.user.userId matches your token payload
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: "User account missing." });

        user.cart = cart.map(item => ({
            product: item.product,
            quantity: item.quantity
        }));

        await user.save();
        res.json({ message: "Cart synced to MongoDB Atlas successfully." });
    } catch (err) {
        res.status(500).json({ error: "Cloud sync failed.", details: err.message });
    }
});

module.exports = router;