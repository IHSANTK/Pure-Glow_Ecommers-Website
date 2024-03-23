// const jwt = require('jsonwebtoken');

// const authenticateJWT = async (req, res, next) => {
//     try {
//         const token = req.cookies.user_jwt;
//         if (!token) {
//             // Redirect to login if JWT token is not present
//             return res.redirect('/login');
//         }
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         if (!decoded || !decoded.id) {
//             // Redirect to login if JWT token is invalid
//             return res.redirect('/login');
//         }
//         // Store decoded token data in request object
//         req.decoded = decoded;
//         next();
//     } catch (error) {
//         console.error("Error:", error);
//         return res.redirect('/login');
//     }
// };

// module.exports = authenticateJWT;