const express = require('express');
const router = express.Router();
const userController = require('../controllers/usercontroller');  



router.get('/',userController.Homepage);
router.get('/profile',userController.userprofilepage);
router.get('login',userController.loginpage);
router.post('/login',userController.dataslogin);
router.get('/signup',userController.signuppage);
router.post('/signup',userController.getsignupdata);
router.get('/logout',userController.logout);


module.exports = router;


