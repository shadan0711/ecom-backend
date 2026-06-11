const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Importing the blueprint we just made

const router = express.Router();

// --- 1. USER REGISTRATION ---
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Fact: Never trust the client. Validate data exists.
        if (!name || !email || !password) {
            return res.status(400).json({ error: "Name, email, and password are required." });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "A user with this email already exists." });
        }

        // Security: Hash the password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create and save the new user
        const newUser = new User({
            name,
            email,
            passwordHash: hashedPassword
        });

        const savedUser = await newUser.save();
        res.status(201).json({ message: "User registered successfully.", userId: savedUser._id });

    } catch (err) {
        res.status(500).json({ error: "Server error during registration.", details: err.message });
    }
});

// --- 2. USER LOGIN ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }

        // Find the user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials." }); // Do not specify that the email was wrong
        }

        // Compare the provided password with the database hash
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        // Generate a JWT to prove the user is authenticated
        const token = jwt.sign(
            { userId: user._id, isAdmin: user.isAdmin, name: user.name }, 
            process.env.JWT_SECRET, 
            { expiresIn: '3d' } // Token expires in 3 days
        );

        res.status(200).json({ message: "Login successful.", token });

    } catch (err) {
        res.status(500).json({ error: "Server error during login.", details: err.message });
    }
});

module.exports = router;