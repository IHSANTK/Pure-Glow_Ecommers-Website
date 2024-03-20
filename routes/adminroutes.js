const admincontroller = require('../controllers/admincontroller');
const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const adminMiddleware = require('../middlewears/adminMiddleware'); // Corrected typo
const preventBack = require("../middlewears/preventback");

router.get('/admin',preventBack, adminMiddleware, admincontroller.admindashbord);
router.get('/adminlogin',preventBack, adminMiddleware,admincontroller.loginpage);
router.post('/admin',preventBack, adminMiddleware, admincontroller.logindatas);
router.post('/toggleBlock', adminMiddleware, admincontroller.blockuser);
router.get('/userlist', adminMiddleware, admincontroller.userslist);
router.get('/categorie-list', adminMiddleware, admincontroller.categorilist);
router.get('/categories-add', adminMiddleware, admincontroller.categoriesadd);
router.post('/categories-add', adminMiddleware, admincontroller.updatecategory);
router.get('/categories-edit/:id', admincontroller.categorieedit);
router.post('/categories-edit/:id', admincontroller.categorieeditdatas);
router.post('/categories-delete/:id', admincontroller.deletecategorie);
router.get('/product-list', adminMiddleware, admincontroller.productlist);
router.get('/product-add', admincontroller.productadd);
router.post('/product-add', upload.array('image', 2), admincontroller.AddProductlist);
router.get('/product-edit/:id', admincontroller.productedit);
router.post('/product-edit/:id', upload.array('image', 2), admincontroller.updateProduct);
router.get('/product-delete/:id', admincontroller.deleteproduct);
router.get('/product-disable/:id',admincontroller.productdisable)

router.get('/admin-logout', adminMiddleware, admincontroller.adminlogout);

module.exports = router;