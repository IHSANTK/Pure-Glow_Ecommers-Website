const express = require('express');
const router = express.Router();
const userController = require('../controllers/usercontroller');
const passport = require('passport');

// Include the passport initialization
router.use(passport.initialize());

// Routes
router.get('/', userController.Homepage);
router.get('/profile', userController.userprofilepage);
router.get('/login', userController.loginpage);
router.post('/login', userController.dataslogin);
router.get('/signup', userController.signuppage);
router.post('/signup', userController.getsignupdata);
router.get('/logout', userController.logout);
router.get('/change-password/:id',userController.changepassword)
router.post('/edit-password/:id',userController.editpassword)
router.get('/shop',userController.shoppage)
router.get('/getshopproduct/:category',userController.getproductdetails)
router.post('/cart/:id', userController.addToCart);
router.get('/cart', userController.cartpage);
router.post('/deletecartproduct/:productId', userController.deletecartproduct);

router.get('/auth/google', userController.googleAuth);

router.get('/auth/google/callback',
 passport.authenticate('google',{successRedirect: '/success', failureRedirect:'/failure'})
);

router.get('/success', userController.succesGoogleLogin);
router.get('/failure', userController.failureGooglelogin);

module.exports = router;