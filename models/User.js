const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    cart: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, default: 1 }
    }],
    // NEW: Persistent Address Book Profiles
    savedAddress: {
        houseNo: { type: String, default: "" },
        landmark: { type: String, default: "" },
        streetAddress: { type: String, default: "" },
        phone: { type: String, default: "" }
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);