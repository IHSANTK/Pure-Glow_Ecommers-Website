const admincontroller = require('../controllers/admincontroller');
const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const authenticateJWT = require('../middlewears/adminauthenticateJWT'); // Corrected typo
const preventBack = require("../middlewears/preventback");
const  adminMiddleware = require('../middlewears/adminMiddleware')

router.get('/admin', preventBack,adminMiddleware, authenticateJWT, admincontroller.admindashbord);
router.get('/adminlogin', preventBack,adminMiddleware, admincontroller.loginpage);
router.post('/admin', preventBack, admincontroller.logindatas);
router.post('/toggleBlock', authenticateJWT, admincontroller.blockuser);
router.get('/userlist', authenticateJWT,adminMiddleware, admincontroller.userslist);
router.get('/categorie-list', authenticateJWT,adminMiddleware, admincontroller.categorilist);
router.get('/categories-add', authenticateJWT,adminMiddleware, admincontroller.categoriesadd);
router.post('/categories-add', authenticateJWT,adminMiddleware ,admincontroller.updatecategory);
router.get('/categories-edit/:id', authenticateJWT,adminMiddleware, admincontroller.categorieedit);
router.post('/categories-edit/:id', authenticateJWT,adminMiddleware, admincontroller.categorieeditdatas);
router.post('/categories-delete/:id', authenticateJWT,adminMiddleware, admincontroller.deletecategorie);
router.get('/product-list', authenticateJWT,adminMiddleware, admincontroller.productlist);
router.get('/product-add',adminMiddleware, admincontroller.productadd);
router.post('/product-add',adminMiddleware, upload.array('image', 2), admincontroller.AddProductlist);
router.get('/product-edit/:id',adminMiddleware, authenticateJWT, admincontroller.productedit);
router.post('/product-edit/:id',adminMiddleware, authenticateJWT, upload.array('image', 2), admincontroller.updateProduct);
router.get('/product-delete/:id',adminMiddleware, authenticateJWT, admincontroller.deleteproduct);
router.post('/product-disable/:id',adminMiddleware, authenticateJWT, admincontroller.productdisable);
router.get('/admin-profile',adminMiddleware, authenticateJWT, admincontroller.adminprofile);
router.get('/productdetiel/:id',adminMiddleware, authenticateJWT, admincontroller.productdetiel);

router.get('/orederslist',adminMiddleware, authenticateJWT, admincontroller.orderslist);

router.post('/orederstatus', adminMiddleware, authenticateJWT,admincontroller.orederstatus);

router.get('/coupon-manage',adminMiddleware, authenticateJWT,admincontroller.couponmanage)
router.get('/add-coupon',adminMiddleware, authenticateJWT,admincontroller.addcoupon)
router.post('/add-coupon',adminMiddleware, authenticateJWT,admincontroller.addcoupondatas)

router.get('/edit-coupon/:id',adminMiddleware, authenticateJWT,admincontroller.editcoupon)
router.post('/update-coupon/:id',adminMiddleware, authenticateJWT,admincontroller.updateeditcoupon)

router.get('/deletecoupon/:id',adminMiddleware, authenticateJWT,admincontroller.deletecoupon);



router.post('/download-order-report',adminMiddleware, authenticateJWT,admincontroller.downloadOrdrReport)





router.get('/admin-logout',adminMiddleware, authenticateJWT, admincontroller.adminlogout);

module.exports = router;