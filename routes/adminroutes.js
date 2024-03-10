const express = require('express');
const router = express.Router();
const admincontroller = require('../controllers/admincontroller'); 
const upload = require('../config/multer');
require('dotenv').config();

router.get('/admin',admincontroller.admindashbord);
router.get('/adminlogin',admincontroller.loginpage);
router.post('/admin',admincontroller.logindatas);
router.post('/toggleBlock',admincontroller.blockuser);
router.get('/userlist',admincontroller.userslist);
// router.get('/blocked',admincontroller.renderindexblock)
router.get('/categorie-list',admincontroller.categorilist);
router.get('/categories-add',admincontroller.categoriesadd);
router.post('/categories-add',admincontroller.updatecategory);
router.get('/categories-edit/:id', admincontroller.categorieedit);
router.post('/categories-edit/:id',admincontroller.categorieeditdatas);
router.post('/categories-delete/:id', admincontroller.deletecategorie);
router.get('/product-list',admincontroller.productlist);
router.get('/product-add',admincontroller.productadd);
router.post('/product-add', upload.array('image', 1), admincontroller.AddProductlist);
router.get('/product-edit/:id',admincontroller.productedit); 
router.post('/product-edit/:id',upload.array('image',1), admincontroller.updateProduct);
router.get('/product-delete/:id',admincontroller.deleteproduct)
router.get('/admin-logout',admincontroller.adminlogout)



module.exports = router;