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
        res.redirect('/login');
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
        res.redirect('/block'); // Redirect to blocked page if user is blocked
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
const blockpage =(req,res)=>{

    res.render('user/error404',{errormessage:"You Are Blocked !!"});
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
    res.redirect('/');
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
    res.render('user/editpassword', { userId, errorMessage: req.errorMessage });
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
            // Setting error message to req.errorMessage
            req.errorMessage = "Current password is not correct";
            return changepassword(req, res);
        }

        if (newPassword !== confirmPassword) {
            // Clearing previous error message if any
            req.errorMessage = "";
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


  const shoppage = async (req, res) => {
    try {
        const data = await Products.findOne();

        if (!data || !data.products || data.products.length === 0) {
            return res.status(404).json({ error: "Data not found or empty" });
        }

        const uniqueCategories = [...new Set(data.products.map(product => product.category))];
        // console.log(uniqueCategories);

        res.render('user/shop', { categor: data.products, uniqueCategories });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}


const getproductdetails = async (req, res) => {
    try {
        const category = req.params.category;

        const data = await Products.findOne({ 'products.category': category });

        if (!data) {
            return res.render('user/error404', { error: "Product Not Available Now !!" });
        }

        const categor = data.products.filter(produ => produ.category === category);

        const allCategories = await Products.distinct("products.category");
        
        res.render('user/shop', { categor, uniqueCategories: allCategories });

    } catch (error) {
        console.error("Error:", error);
        res.render('user/error404', { errormessage: "Product Not Available" });
    }
}
const addToCart = async (req, res) => {
    const productId = req.params.id;

    // Check if the user is authenticated
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    const userId = req.session.userId;

    try {
        // Find the product by ID
        const product = await Products.findOne({ 'products._id': productId });
       
        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Find the user by ID
        const user = await User.findById(userId);
       
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Check if the product already exists in the cart
        const existingProduct = user.cart.products.find(item => item.productId == productId);
        if (existingProduct) {
            // If the product already exists, update its quantity
            existingProduct.quantity += 1;
        } else {
            // If the product doesn't exist, add it to the cart
            const productData = product.products.find(prod => prod._id == productId);
            user.cart.products.push({
                productId: productData._id,
                productName: productData.productName,
                productPrice: productData.productPrice,
                image: productData.image,
                quantity: 1
            });
        }

        // Calculate the sum of product prices in the cart
        const totalPrice = user.cart.products.reduce((total, product) => {
            return total + (product.productPrice * product.quantity);
        }, 0);

        // Update the total price in the cart object
        user.cart.total = totalPrice;

        // Save the updated user cart
        await user.save();

        // Redirect to the shop page
        res.redirect('/cart');

    } catch (error) {
        
        console.error(error);
        res.status(500).send('Internal Server Error'); 
    }
}

const cartpage = async (req, res) => {
    try {
        // Check if the user is authenticated
        if (!req.session.userId) {

            return   res.redirect('/login')
            
        }

        // Find the logged-in user by ID
        const user = await User.findById(req.session.userId);
       
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Extract the cart data from the user document
        const usercartdata = user.cart.products.map(item => ({
            productId: item.productId,
            productName: item.productName,
            productPrice: item.productPrice,
            image: item.image,
            quantity: item.quantity
        }));
        totalPrice = user.cart.total 
     
        // Render the cart page with the cart data
        res.render('user/cart', { usercartdata, totalPrice});
      
        
    } catch (error) {
        // Handle error
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}

const deletecartproduct = async (req, res) => {
    try {
        const productId = req.params.productId; // Access productId from req.params
        
        const user = await User.findByIdAndUpdate(
            req.session.userId,
            { $pull: { 'cart.products': { productId: productId } } },
            { new: true }
        );

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Recalculate the total price of all products in the cart after deletion
        const totalPrice = user.cart.products.reduce((total, product) => {
            return total + (product.productPrice * product.quantity);
        }, 0);
 
        user.cart.total = totalPrice;
           
        await user.save();

        res.render('user/cart', { usercartdata: user.cart.products, totalPrice: totalPrice });
    } catch (error) {
        // Handle error
        console.error(error);
        res.status(500).send('Internal Server Error'); 
    }
}

const checkoutpage =(req,res)=>{
      res.render('user/chackout');
}






const succesGoogleLogin = async (req, res) => {
    try {
      if (!req.user) {
        return res.redirect('/failure');
      }
  
      console.log('Google Login Email:', req.user.email);
      let user = await User.findOne({ email: req.user.email });
  
      if (!user) {
        user = new User({
          name: req.user.displayName,
          email: req.user.email
        });
        await user.save();
        console.log('User Data Saved.');
        req.session.user = user; // Store user data in session
        return res.redirect('/profile');
      } else {
        if (user.blocked) {
          console.log('User is blocked');
          return res.render('users/error404', { errormessage : 'Your Account has been restricted by the Admin' });
        }
  
        console.log('Login with Google');
        req.session.user = user; // Store user data in session
        return res.redirect('/');
      }
    } catch (error) {
      console.error('Error in Google authentication:', error);
      return res.redirect('/failure');
    }
  };
  
  const failureGooglelogin = (req, res) => {
    res.send('Error');
  };
  let googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });


  

module.exports={
    Homepage,
    userprofilepage,
    loginpage,
    blockpage,
    dataslogin,
    signuppage,
    getsignupdata,
    logout,
    changepassword,
    editpassword,
    shoppage,
    getproductdetails ,
    addToCart,
    cartpage,
    deletecartproduct,
    checkoutpage,
    succesGoogleLogin,
    failureGooglelogin,
    googleAuth,

}






