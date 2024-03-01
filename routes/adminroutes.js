const express = require('express');
const router = express.Router();
const admincontroller = require('../controllers/admincontroller'); 

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



module.exports = router;