const jwt = require('jsonwebtoken');

const adminMiddleware = (req, res, next) => {
    // Check for JWT token in request cookies
    const token = req.cookies.user_jwt;

    if (!token) {
        // If token is not present, proceed to the next middleware
        next();
    } else {
        try {
            // Verify the JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Check if the user has admin role
            if (decoded.role !== 'admin') { 
                // If user is not an admin, render an error page
                return res.render('user/error404', { errormessage: "You do not have access to this page!" });
            }

            // If the token is valid and user is an admin, proceed to the next middleware
           
        } catch (error) {
            // If the token is invalid or expired, render an error page
            res.render('user/error404', { errormessage: "Unable to access ok!!" });
        }
    }
};

module.exports = adminMiddleware;