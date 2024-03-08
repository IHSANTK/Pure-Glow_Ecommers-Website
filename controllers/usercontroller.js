const bcrypt = require('bcrypt');
const User = require('../models/user');
const Products = require('../models/Products');
const passport = require('passport');


let Homepage = (req, res) => {
    res.render('user/index');
}

let userprofilepage = async (req, res) => {


    if (req.session.userId) {
        res.render('user/profile', { userName: req.session.userName, email: req.session.userEmail, phoneNumber: req.session.phoneNumber, userId:req.session.userId });
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
        req.session.userEmail = user.email;
        req.session.phoneNumber = user.phoneNumber;
        res.redirect('/');
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
    req.session.userEmail = newUser.email;
    req.session.phoneNumber = newUser.phoneNumber;
    res.redirect('/profile');
}
let logout =(req, res) => {
    delete req.session.userId;
    delete req.session.userName;
    delete req.session.userEmail;
    delete req.session.phoneNumber;
    res.redirect('/');
  };

  const changepassword = (req, res) => {

       const userId = req.params.id;

    res.render('user/editpassword',{userId});
  };
  
  const editpassword = async (req, res) => {
    const userId = req.params.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;
  
    try {
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
  
      if (!isPasswordMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
  
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "New password and confirm password do not match" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      user.password = hashedPassword;
      await user.save();
  
      res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Error updating password" });
    }
  };

  const shoppage = async (req,res)=>{

       


    const data = await Products.findOne();

    if (!data) {
        return res.status(404).json({ error: "data not found" });
    }

    const categor = data.products.filter(produ => produ.category);
    

    res.render('user/shop',{categor})


  }

  const getproductdeteils =  async (req,res)=>{
try{
    const category = req.params.category;

    // console.log(category);

    const data = await Products.findOne({ 'products.category': category });

    if (!data) {
        res.render('user/error404',{ error: "Product Not Availble Now !!" });
    }
   
 
    const categor = data.products.filter(produ => produ.category === category);
    

    res.render('user/shop',{categor})
}catch{
    res.render('user/error404',{ errormessage: "Product Not Availble Now !!" });
}
    

    


  }

  const productdatalist = (req,res)=>{


  }
  






  let googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });


  

module.exports={
  
    Homepage,
    userprofilepage,
    loginpage,
    dataslogin,
    signuppage,
    getsignupdata,
    logout,
    changepassword,
    editpassword,
    shoppage,
    getproductdeteils,
    productdatalist,
    googleAuth,

}














// const userlogout = (req, res) => {
//     delete req.session.userId;
//     delete req.session.userName;
//     delete req.session.userEmail;
//     delete req.session.phoneNumber;
//     res.redirect('/');
// };