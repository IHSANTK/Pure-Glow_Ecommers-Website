const bcrypt = require('bcrypt');
const User = require('../models/user');
const passport = require('passport');


let Homepage = (req, res) => {
    res.render('user/index');
}

let userprofilepage = async (req, res) => {


    if (req.session.userId) {
        res.render('user/profile', { userName: req.session.userName, email: req.session.email, phoneNumber: req.session.phoneNumber });
    } else {
        res.render('user/login', { errorMessage: req.errorMessage });
    }
}

let loginpage = (req, res) => {
    if (req.session.userId) {
        res.redirect('/profile');
    } else {
        res.render('user/login', { errorMessage: req.query.errorMessage });
    }
};


let dataslogin =  async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && user.blocked) {
        res.redirect('/blocked'); // Redirect to blocked page if user is blocked
        return;
    }

    if (user && bcrypt.compareSync(password, user.password)) {
        req.session.userId = user._id;
        req.session.userName = user.name;
        req.session.email = user.email;
        req.session.phoneNumber = user.phoneNumber;
        res.redirect('/profile');
    } else {
        res.render('user/login',{errorMessage:'Invalid email or password. Please sign up.'});
    }
}


let signuppage = (req, res) => {
    if (req.session.userId) {
        res.redirect('/profile');
    }else{
    res.render('user/signup', { signupSuccessful: req.signupSuccessful });
    }
}

let getsignupdata = async (req, res) => {
    const { name, email, phoneNumber, password } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        res.render('user/signup', { signupSuccessful: "User already exists" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = new User({
        name,
        email,
        password: hashedPassword,
        phoneNumber,
    });

    await newUser.save();

    req.session.userId = newUser._id;
    req.session.userName = newUser.name;
    req.session.email = newUser.email;
    req.session.phoneNumber = newUser.phoneNumber;
    res.redirect('/profile');
}
let logout =(req, res) => {
    req.session.destroy();
    res.redirect('/');
  };



  let googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });


  

module.exports={
  
    Homepage,
    userprofilepage,
    loginpage,
    dataslogin,
    signuppage,
    getsignupdata,
    logout,
    googleAuth,

}


