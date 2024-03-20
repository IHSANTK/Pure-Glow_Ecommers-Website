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
            return res.render('user/error404',{ errormessage: "Data not found or empty" });
        }
      
        // Extracting unique categories
        const uniqueCategories = [...new Set(data.products.map(product => product.category))];
        
        // Fetch latest product from each category
        const latestProducts = uniqueCategories.map(category => {
            return data.products.filter(product => product.category === category).sort((a, b) => b.createdAt - a.createdAt)[0];
        });

        let userWishlist = [];
        if (req.session.userId) {
           
                const user = await User.findById(req.session.userId);
    
                if (user) {  
                    userWishlist = user.wishlist; 

                    totalCartCount = user.cart.products.length;
                   
                }   
        }else{
            totalCartCount = "";
        }

        // Render the homepage with the latest product from each category and user's wishlist
        res.render('user/index', { uniqueCategories, categor: latestProducts, wishlist: userWishlist,totalCartCount }); // Replace 'user/index' with your actual template file path
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

let userprofilepage = async (req, res) => {
    let message = req.query.passwordUpdate; // Retrieve the password update message from query parameters
  
    if (req.session.userId) {
        res.render('user/profile', { 
            userName: req.session.userName,
            email: req.session.userEmail, 
            phoneNumber: req.session.phoneNumber,
            profileImage: req.session.profileImage,
            userId: req.session.userId,
            errorMessage: req.errorMessage,
            successMessage: message, // Pass the password update message to the template
            wishlist: req.session.wishlist
        });
    } else {
        res.redirect('/login');
    }
}

// Login page route
let loginpage = (req, res) => {
    if (req.session.userId) {
        res.redirect('/profile');
    } else {
        res.render('user/login', { errorMessage: req.query.errorMessage });
    }
};

// Handle user login
let dataslogin =  async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).populate('wishlist');

    if (user && bcrypt.compareSync(password, user.password)) {
        req.session.userId = user._id;
        req.session.userName = user.name;
        req.session.userEmail = user.email;
        req.session.phoneNumber = user.phoneNumber;
        req.session.profileImage = user.image,
        req.session.wishlist = user.wishlist.map(product => product._id.toString()); // Store wishlist data in session as array of product ids
        res.redirect('/');
    } else {
        res.render('user/login', { errorMessage: 'Invalid email or password. Please sign up.' });
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
let logout = (req, res) => {
    delete req.session.userId;
    delete req.session.userName;
    delete req.session.userEmail;
    delete req.session.phoneNumber;
    delete req.session.profileImage;
    res.redirect('/');

    // Call the function to clear wishlist data from local storage
    
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
            return res.redirect('/profile?passwordUpdate= current password is not match'); // Password update failed
        }

        if (newPassword !== confirmPassword) {
            return res.redirect('/profile?passwordUpdate=false'); // Password update failed
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        await user.save();

        // Redirect to the profile page with a query parameter indicating successful password update
        res.redirect('/profile?passwordUpdate= password update sccesfully');

    } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).json({ message: "Error updating password" });
    }
};

const editprofile = async (req, res) => {
    const userId = req.params.id;
    const { userName, email, phoneNumber } = req.body;

    try {
        let imageUrl = req.session.profileImage; // Initialize with an empty string

        // Handle image upload
        if (req.files && req.files.length > 0) {
            // Upload the file to Cloudinary
            const result = await cloudinary.uploader.upload(req.files[0].path);
            imageUrl = result.secure_url; // Get the uploaded image URL
        }

        // Update user data including the image URL
        const userUpdate = {
            name: userName,
            email: email,
            phoneNumber: phoneNumber,
            image: imageUrl // Update the user's image URL
        };

        const user = await User.findByIdAndUpdate(userId, userUpdate, { new: true });

        if (!user) {
            return res.status(404).send("User not found");
        }

        // Update session with new profile information
        req.session.userName = userName;
        req.session.userEmail = email;
        req.session.phoneNumber = phoneNumber;
        req.session.profileImage = imageUrl; // Update the profile image in the session

        // Render the profile view with updated data
        res.redirect('/profile?passwordUpdate= profile updated successfully');

    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).send("An error occurred while updating profile");
    }
};

const deleteProfileImage = async (req, res) => {
    try {
        // Find the user by userId and remove the profile image
        const userId = req.params.userId;
        const user = await User.findById(userId);

        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Remove the profile image field from the user document
        user.image = undefined;
        req.session.profileImage = ''
        await user.save();

        return res.sendStatus(200); // Respond with success status
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

const contactpage = (req,res)=>{

    res.render('user/contact')
}


const shoppage = async (req, res) => {
    cartcount = req.params.count;
   
    try {
        const data = await Products.findOne();

        if (!data || !data.products || data.products.length === 0) {
            return res.status(404).json({ error: "Data not found or empty" });
        }

        const uniqueCategories = [...new Set(data.products.map(product => product.category))];
        // console.log(uniqueCategories);
    

        res.render('user/shop', { categor: data.products, uniqueCategories,cartcount });

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

        
        
        res.json( categor );

    } catch (error) {
        console.error("Error:", error);
        res.render('user/error404', { errormessage: "Product Not Available" });
    }
}
const addToCart = async (req, res) => {
    const productId = req.params.id;
          
    // Check if the user is authenticated
    if (!req.session.userId) {
        return res.json({  message: 'Pls Login' });
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

        res.json({  message: 'product added in to cart' });

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
        const productId = req.params.productId;
        

        const user = await User.findByIdAndUpdate(
            req.session.userId,
            { $pull: { 'cart.products': { productId: productId } } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const totalPrice = user.cart.products.reduce((total, product) => {
            return total + (product.productPrice * product.quantity);
        }, 0);
 
        user.cart.total = totalPrice;
           
        await user.save();
        
        // Sending back the updated user data
        return res.json({ totalPrice });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
const quantityminus = async (req, res) => {
    try {
        const productId = req.params.productId;

        
        // Find the user by productId and update the quantity
        const user = await User.findOneAndUpdate(
            { "cart.products.productId": productId },
            { $inc: { "cart.products.$.quantity": -1 } }, // Decrease quantity by 1
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User or product not found' });
        }

        const totalPrice = user.cart.products.reduce((total, product) => {
            return total + (product.productPrice * product.quantity);
        }, 0);
 
        user.cart.total = totalPrice;
           
        await user.save();
        return res.json({ user });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
const quantityplus = async (req, res) => {
    try {
        const productId = req.params.productId;

        // Find the user by productId and update the quantity
        const user = await User.findOneAndUpdate(
            { "cart.products.productId": productId },
            { $inc: { "cart.products.$.quantity": 1 } }, // Decrease quantity by 1
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User or product not found' });
        }

        const totalPrice = user.cart.products.reduce((total, product) => {
            return total + (product.productPrice * product.quantity);
        }, 0);
 
        user.cart.total = totalPrice;
           
        await user.save();
        return res.json({ user });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const latestproduct = async (req, res) => {
    try {
        const category = req.body.category;


        const data = await Products.findOne({ 'products.category': category }).sort({ createdAt: -1 }).limit(4);

        if (!data) {
            return res.render('user/error404', { errormessage: "Product Not Available Now !!" });
        }

        const categor = data.products.filter(produ => produ.category === category);

        const allCategories = await Products.distinct("products.category");

        res.json({ message: "successfully passed", categor, uniqueCategories: allCategories, wishlist: [] });

    } catch (error) {
        console.error("Error:", error);
        res.render('user/error404', { errormessage: "Product Not Available" });
    }
}
const whishlistget = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        // Find the logged-in user by ID
        const user = await User.findById(req.session.userId);
       
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Extract the wishlist data from the user document
        const wishlistData = user.wishlist.map(item => ({
            productId: item.productId,
            productName: item.productName,
            productPrice: item.productPrice,
            image: item.image,
            color:item.color
        }));
       

        // Render the wishlist page with the wishlist data
        res.render('user/whishlist', { wishlist: wishlistData });
      
    } catch (error) {
        // Handle error
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}

const wishlist = async (req, res) => {
    const productId = req.params.id;
    
    try {
        if (!req.session.userId) {
            return res.json({ message: 'Please Login' });
        }
        
        // Find the product by ID
        const product = await Products.findOne({ 'products._id': productId });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Find the user by ID
        const user = await User.findById(req.session.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if the product already exists in the wishlist
        const existingProductIndex = user.wishlist.findIndex(item => item.productId == productId);

        const productData = product.products.find(prod => prod._id == productId);
        
        if (existingProductIndex !== -1) {
            // If the product exists, remove it from the wishlist
            user.wishlist.splice(existingProductIndex, 1);
            await user.save();
            res.json({  message: 'Product removed from wishlist' });
        } else {
            // If the product doesn't exist, add it to the wishlist
            user.wishlist.push({
                productId: productData._id,
                productName: productData.productName,
                productPrice: productData.productPrice,
                image: productData.image[0], // Assuming image is an array and you want the first image
                color: 'red' // Set the color to 'red' by default
            });

            // Save the user data
            await user.save();

            // Access the added product from the wishlist
            const addedProduct = user.wishlist.find(item => item.productId == productId);
            let color =  addedProduct.color;

            res.json({  message: 'Product added to wishlist', color });
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' }); // Handle internal server errors
    }
};

const removewishlist = async (req, res) => {
    const productId = req.params.id;
    console.log(productId);
    try {
        // Find the user by ID and remove the product from the wishlist array
        const user = await User.findOneAndUpdate(
            { _id: req.session.userId },
            { $pull: { wishlist: { productId: productId } } }, // Use { productId: productId }
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Optionally, you may want to save the user here if necessary
        // await user.save();

        res.json({ message: 'Product removed from wishlist' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const productveiw = async (req, res) => {
    try {
        const productId = req.params.id;
       
        const product = await Products.findOne({ 'products._id': productId });

       
        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Find the exact product within the products array
        const exactProduct = product.products.find(p => p._id == productId);

        if (!exactProduct) {
            return res.status(404).send('Product not found');
        }

        res.render('user/productsingleveiw', { product: exactProduct });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}


const checkoutfromcart = async(req,res)=>{

    try{

   
    let user = await User.findOne()

    let cartdatas = user.cart.products;   
    let cartTotal = user.cart.total;  

  
    res.render('user/checkout', { products: cartdatas,cartTotal });
 } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
 }

}

const checkoutpage = async (req, res) => {
    try {
        const productId = req.params.id;
        
        
        const product = await Products.findOne({ 'products._id': productId });

        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Find the exact product within the products array
        const exactProduct = product.products.find(p => p._id == productId);


        if (!exactProduct) {
            return res.status(404).send('Product not found');
        }

        // Render the checkout page with the exact product
        res.render('user/checkout', { products: [exactProduct], cartTotal:req.cartTotal });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
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
    editpassword,
    editprofile,
    deleteProfileImage,
    shoppage,
    getproductdetails ,
    contactpage,
    addToCart,
    cartpage,
    deletecartproduct,
    quantityminus,
    quantityplus,
    latestproduct,
    wishlist,
    whishlistget,
    removewishlist,
    productveiw,
    checkoutpage,
    checkoutfromcart,
    succesGoogleLogin,
    failureGooglelogin,
    googleAuth,

}






