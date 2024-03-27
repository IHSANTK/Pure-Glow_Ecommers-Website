const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
    try {
        const token = req.cookies.user_jwt;
        if (!token) {
            return res.redirect('/login');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.redirect('/login');
        }
        req.decoded = decoded;
        next();
    } catch (error) {
        console.error("Error:", error);
        return res.redirect('/login');
    }
};

module.exports = authenticateJWT;