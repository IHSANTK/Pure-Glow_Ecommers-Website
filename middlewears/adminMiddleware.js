const adminMiddleware = (req, res, next) => {
    if (!req.session.userId) {
        // If the user is not logged in, proceed to the next middleware
        next();
  
    } else {
       
        res.redirect('/');
    }
};

module.exports = adminMiddleware;