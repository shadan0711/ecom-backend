const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

// --- 1. CHECK IF USER HAS SAVED ADDRESS ---
router.get('/check-profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: "User missing." });
        
        const hasSavedDetails = user.savedAddress && user.savedAddress.phone ? true : false;
        res.json({ hasSavedDetails, addressBook: user.savedAddress });
    } catch (err) {
        res.status(500).json({ error: "Profile lookup failed." });
    }
});

// --- 2. ADVANCED PROCESS CHECKOUT ---
router.post('/checkout', auth, async (req, res) => {
    try {
        const { houseNo, landmark, streetAddress, phone } = req.body;
        
        if (!houseNo || !streetAddress || !phone) {
            return res.status(400).json({ error: "Missing required shipping components." });
        }

        const user = await User.findById(req.user.userId).populate('cart.product');
        if (!user || user.cart.length === 0) {
            return res.status(400).json({ error: "Cannot checkout an empty cart." });
        }

        // Save address profile back to User Document if it doesn't exist
        if (!user.savedAddress || !user.savedAddress.phone) {
            user.savedAddress = { houseNo, landmark, streetAddress, phone };
        }

        let totalAmount = 0;
        const orderItems = [];

        for (let item of user.cart) {
            const productRecord = item.product;
            if (!productRecord) continue;
            
            if (productRecord.stockQuantity < item.quantity) {
                return res.status(400).json({ error: `Stock exhausted for ${productRecord.name}.` });
            }

            totalAmount += (productRecord.price * item.quantity);
            orderItems.push({
                product: productRecord._id,
                name: productRecord.name,
                quantity: item.quantity,
                priceAtPurchase: productRecord.price
            });
        }

        for (let item of orderItems) {
            await Product.findByIdAndUpdate(item.product, { $inc: { stockQuantity: -item.quantity } });
        }

        const computedFlatAddress = `H.No: ${houseNo}, Near: ${landmark}, Addr: ${streetAddress} | Tel: ${phone}`;

        const newOrder = new Order({
            user: req.user.userId,
            customerName: user.name,   
            customerEmail: user.email, 
            items: orderItems,
            totalAmount,
            shippingAddress: computedFlatAddress,
            status: 'Pending'
        });
        
        const savedOrder = await newOrder.save();
        user.cart = [];
        await user.save();

        res.status(201).json({ message: "COD Order processed.", orderId: savedOrder._id });
    } catch (err) {
        res.status(500).json({ error: "Checkout sequence failure.", details: err.message });
    }
});

// --- 3. GET ALL ORDERS (Admin Only) ---
router.get('/', auth, async (req, res) => {
    try {
        const userCheck = await User.findById(req.user.userId);
        if (!userCheck || !userCheck.isAdmin) {
            return res.status(403).json({ error: "Access denied. Administrative privileges required." });
        }

        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: "Failed to compile order queue.", details: err.message });
    }
});

// --- 4. UPDATE ORDER STATUS (Admin Only) ---
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const userCheck = await User.findById(req.user.userId);
        if (!userCheck || !userCheck.isAdmin) {
            return res.status(403).json({ error: "Access denied. Admin rights required." });
        }

        const { status } = req.body;
        const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid operational status state." });
        }

        const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!order) return res.status(404).json({ error: "Order timeline not found." });

        res.json({ message: `Order mapped to ${status}.`, order });
    } catch (err) {
        res.status(500).json({ error: "State mutation failed.", details: err.message });
    }
});

module.exports = router;