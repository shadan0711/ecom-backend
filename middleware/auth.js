const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Get the token from the request header
    const token = req.header('Authorization');

    // Fact: If there's no token, access is completely denied
    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    try {
        // Tokens are sent as "Bearer <token>". We need to split the string to extract just the token.
        const actualToken = token.split(' ')[1];
        
        // Verify token validity against our secret key
        const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
        
        // Attach the decoded user payload (userId, isAdmin) to the request object
        req.user = decoded;
        
        // Call next() to pass execution to the actual route handler
        next();
    } catch (err) {
        res.status(400).json({ error: "Invalid token or session expired." });
    }
};