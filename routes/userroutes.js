const express = require('express');
const router = express.Router();
const userController = require('../controllers/usercontroller');
const passport = require('passport');
const upload = require('../config/multer');
const authenticateJWT = require('../middlewears/userauthenticateJWT');
const preventBack = require("../middlewears/preventback");

// Include the passport initialization
router.use(passport.initialize());

// Routes
router.get('/', userController.Homepage);
router.get('/profile',preventBack, authenticateJWT, userController.userprofilepage);

router.get('/login',preventBack, userController.loginpage);
router.get('/block',preventBack,userController.blockpage)

router.post('/sendotp',preventBack, userController.sendtotplogin);
 router.post('/loginwithotp',preventBack, userController.loginwithotp);

router.post('/login',preventBack, userController.dataslogin);

router.post('/login-otp', preventBack, userController.sendOTP); // Add route for sending OTP
router.post('/verify-otp', preventBack,userController. signupwithotp);

router.get('/signup',preventBack, userController.signuppage);  

// router.post('/signup',preventBack, userController.getsignupdata);

router.get('/logout',preventBack, userController.logout);

// router.get('/change-password/:id',preventBack,userController.changepassword)
// router.get('/edit-profile/:id',preventBack,userController.editprofileget)
router.post('/edit-profile/:id',upload.array('profileImage', 1),userController.editprofile)
router.delete('/delete-profile-image/:userId', userController.deleteProfileImage);

router.post('/edit-password/:id',userController.editpassword)
router.get('/shop',userController.shoppage);
router.get('/newproductsshop',userController.newproducts)


router.get('/getshopproduct/:category', preventBack, userController.getproductdetails);

router.post('/cart/:id',preventBack, userController.addToCart); 

router.get('/cart',preventBack, userController.cartpage);

router.post('/deletecartproduct/:productId',preventBack, userController.deletecartproduct);

router.post('/quantityminus/:productId',userController.quantityminus)

router.post('/quantityplus/:productId',userController.quantityplus)



router.post('/latestproduct',preventBack, userController.latestproduct);

router.get('/whishlist',preventBack,userController.whishlistget);

router.post('/wishlist/:id',preventBack, userController.wishlist);



router.post('/removewishlist/:id',preventBack, userController.removewishlist);

router.get('/productveiw/:id',preventBack,userController.productveiw);

router.get('/checkoutfromcart',preventBack,userController.checkoutfromcart);

router.post('/checkout/:id',preventBack,userController.checkoutpage);

router.post('/manageaddress', userController.manageaddress); 

router.post('/addaddresscheckout', userController.addaddresscheckout);

router.post('/addressdelete/:id',userController. addressdelete);

router.post('/placeorder',userController.placeholder);
 
router.get('/orders',userController.ordermanage);

router.post('/cancellreson/:productid/:orderid',userController.cancellreson);

router.post('/editAddressForm/:id', userController.editaddress);

router.post('/editAddressFormcheckout/:id',userController.editAddressFormcheckout)

router.get('/getsearchproduct', preventBack, userController.getShopProducts);

router.get('/shopsort/:category',preventBack,userController.shopsorting)

router.post('/saveorder',userController.saveorder);

router.post('/coupenmanage',userController.coupenmanage);

router.post('/downloadinvoice/:orderId/:productId', userController.downloadinvoice);




router.get('/auth/google',passport.authenticate('google',{scope:['email','profile']}))

router.get('/auth/google/callback',
 passport.authenticate('google',{successRedirect:
                                '/success',
                                failureRedirect:'/failure'
                            }
                        )
)

router.get('/success',userController.succesGoogleLogin)

router.get('/failure',userController.failureGooglelogin)

module.exports = router;