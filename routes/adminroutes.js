const express = require('express');
const router = express.Router();
const admincontroller = require('../controllers/admincontroller'); 
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Specify the directory where you want to store uploaded files
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // Set the filename to be unique
    }
});
const upload = multer({ storage: storage });

router.get('/admin',admincontroller.adminlogin);
router.post('/admin',admincontroller.logindatas);
router.post('/toggleBlock',admincontroller.blockuser);
router.get('/userlist',admincontroller.userslist);
router.get('/blocked',admincontroller.renderindexblock)
router.get('/categorie-list',admincontroller.categorilist);
router.get('/categories-add',admincontroller.categoriesadd);
router.post('/categories-add',admincontroller.updatecategory);
router.get('/categories-edit/:id', admincontroller.categorieedit);
router.post('/categories-edit/:id',admincontroller.categorieeditdatas);
router.post('/categories-delete/:id', admincontroller.deletecategorie);
router.get('/product-list',admincontroller.productlist);
router.get('/product-add',admincontroller.productadd);
router.post('/product-add', upload.single('image'), admincontroller.AddProductlist);
router.get('/product-edit/:id', admincontroller.productedit); 
router.post('/product-edit/:id', upload.single('image'), admincontroller.updateProduct);
router.get('/product-delete/:id',admincontroller.deleteproduct)



module.exports = router;