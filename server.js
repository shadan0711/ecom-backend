const path = require('path');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());
app.use(cors());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Route Imports ---
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products'); 
const orderRoutes = require('./routes/orders'); 

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB successfully connected.'))
    .catch((err) => {
        console.error('Database connection failed.', err.message);
        process.exit(1);
    });

// --- API Endpoints ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/cart', require('./routes/cart'));

app.get('/', (req, res) => {
    res.send('E-commerce API is running.');
});

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
