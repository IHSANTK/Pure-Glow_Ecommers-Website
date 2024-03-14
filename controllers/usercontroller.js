const bcrypt = require('bcrypt');

const User = require('../models/user');
const Products = require('../models/Products');
const passport = require('passport');
const cloudinary = require('../config/cloudinary')
const upload = require('../config/multer.js');

const Homepage = async (req, res) => {
    try {
        const data = await Products.findOne();

        if (!data || !data.products || data.products.length === 0) {
            return res.status(404).json({ error: "Data not found or empty" });
        }
      
        // Extracting unique categories
        const uniqueCategories = [...new Set(data.products.map(product => product.category))];
        
        // Create a map to store products by category
        const productsByCategory = new Map();
        data.products.forEach(product => {
            if (!productsByCategory.has(product.category)) {
                productsByCategory.set(product.category, product);
            }
        });

        // Extract one product from each category
        const categor = Array.from(productsByCategory.values()).slice(0, 4);

        // Pass uniqueCategories and categor to the template
        res.render('user/index', { uniqueCategories, categor }); // Replace 'user/index' with your actual template file path

        console.log(uniqueCategories);

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}


let userprofilepage = async (req, res) => {


    if (req.session.userId) {
        res.render('user/profile', { userName: req.session.userName,
               email: req.session.userEmail, 
               phoneNumber: req.session.phoneNumber,
               userId:req.session.userId,
               errorMessage:req.errorMessage,
               successMessage:req.successMessage,
               profileImage:req.image
              });
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

// const changepassword = (req, res) => {
//     const userId = req.params.id;
//     res.render('user/editpassword', { userId, errorMessage: req.errorMessage ,successMessage:req.successMessage });
// };

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
            return res.render('user/profile', {
                errorMessage: "Current password is not correct",
                userId: userId,
                userName: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                successMessage: null, // Clear success message
                profileImage: user.image
            });
        }

        if (newPassword !== confirmPassword) {
            return res.render('user/profile', {
                errorMessage: "New password and confirm password do not match",
                userId: userId,
                userName: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                successMessage: null, // Clear success message
                profileImage: user.image
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        await user.save();

        // Render the edit password page with success message
        res.render('user/profile', {
            userId: userId,
            userName: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            errorMessage: null,
            successMessage: "Password successfully updated",
            profileImage: user.image
        });
    } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).json({ message: "Error updating password" });
    }
};

const editprofile = async (req, res) => {
    const userId = req.params.id;
    const { userName, email, phoneNumber } = req.body;

    try {
        // Handle image upload
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            // Upload each file to Cloudinary
            for (const file of req.files) {
                const result = await cloudinary.uploader.upload(file.path);
                imageUrls.push(result.secure_url);
            }
        }

        // Update user data including the image URLs
        const user = await User.findByIdAndUpdate(userId, {
            name: userName,
            email: email,
            phoneNumber: phoneNumber,
            image: imageUrls
        }, { new: true });

        if (!user) {
            return res.status(404).send("User not found");
        }

        // Render the profile view with updated data
        return res.render('user/profile', {
            userId: userId,
            userName: user.name,
            email: user.email,
            errorMessage: null,
            phoneNumber: user.phoneNumber,
            successMessage: "Profile updated successfully",
            profileImage: user.image
        });

    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).send("An error occurred while updating profile");
    }
};



    // const productData = req.body;

    // try {
    //     const { ProductName, Price, description, Category } = productData;
    //     const imageUrls = [];

      

    //     // console.log("imageUrls:", imageUrls);

    //     const newProduct = {
    //         productName: ProductName,
    //         productPrice: Price,
    //         description: description,
    //         category: Category,
           
    //     };

    //     let product = await Products.findOne();
        
    //     if (!product) {
    //         return res.status(400).send('Product not found');
    //     }

    //     product.products.push(newProduct);
    //     await product.save();

    //     res.redirect('/product-list');
        
    // } catch (error) {
    //     console.log(error);
    //     res.status(500).send('Internal Server Error');
    // }






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

       
        const existingProduct = user.cart.products.find(item => item.productId == productId);
        if (existingProduct) {
           
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

        
        user.cart.total = totalPrice;

        // Save the updated user cart
        await user.save();

      
        res.redirect('/cart');

    } catch (error) {
        
        console.error(error);
        res.status(500).send('Internal Server Error'); 
    }
}

const cartpage = async (req, res) => {
    try {
      
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
// const latestproduct = async (req, res) => {
//     try {
//         const data = await Products.findOne();

//         if (!data || !data.products || data.products.length === 0) {
//             return res.status(404).json({ error: "Data not found or empty" });
//         }

//         const uniqueCategories = [...new Set(data.products.map(product => product.category))];
       
//         // Pass uniqueCategories to the template
//         res.render('user/index', { uniqueCategories }); // Replace 'user/index' with your actual template file path

//     } catch (error) {
//         console.error("Error:", error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// }

const latestproduct = async (req, res) => {
    try {
        const category = req.body.category;

        const data = await Products.findOne({ 'products.category': category }).sort({ createdAt: -1 }).limit(1);

        if (!data) {
            return res.render('user/error404', { error: "Product Not Available Now !!" });
        }

        const categor = data.products.filter(produ => produ.category === category).slice(0, 4);

        const allCategories = await Products.distinct("products.category");

        res.render('user/index', { categor, uniqueCategories: allCategories });

    } catch (error) {
        console.error("Error:", error);
        res.render('user/error404', { errormessage: "Product Not Available" });
    }
}

const whishlist =(rwq,res)=>{

     res.render('user/whishlist')

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
    // changepassword,
    editpassword,
    editprofile,
    // editprofileget,
    shoppage,
    getproductdetails ,
    addToCart,
    cartpage,
    deletecartproduct,
    // latestproduct,
    latestproduct,
    whishlist,
    checkoutpage,
    succesGoogleLogin,
    failureGooglelogin,
    googleAuth,

}






