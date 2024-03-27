const jwt = require('jsonwebtoken');

const authenticateJWT = async (req, res, next) => {
    try {
        const token = req.cookies.admin_jwt;
        if (!token) {
            return res.redirect('/adminlogin');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.redirect('/adminlogin');
        }
        req.decoded = decoded;
        next();
    } catch (error) {
        console.error("Error:", error);
        return res.redirect('/adminlogin');
    }
};

module.exports = authenticateJWT;