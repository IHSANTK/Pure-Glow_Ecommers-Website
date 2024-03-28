const bcrypt = require('bcrypt');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const Products = require('../models/Products');
const passport = require('passport');
const cloudinary = require('../config/cloudinary')
const upload = require('../config/multer.js');
const otpService = require('../services/otpService');

const Homepage = async (req, res) => {
    try {
        const data = await Products.findOne();

        if (!data || !data.products || data.products.length === 0) {
            return res.render('user/error404', { errormessage: "Data not found or empty" });
        }

        const uniqueCategories = [...new Set(data.products.map(product => product.category))];

        // Fetch latest product from each category
        const latestProducts = uniqueCategories.map(category => {
            return data.products.filter(product => product.category === category).sort((a, b) => b.createdAt - a.createdAt)[0];
        });

        let userWishlist = [];
        let totalCartCount = "";

        const token = req.cookies.user_jwt;

        if (token) {
            try {
                // Verify the JWT token to get user ID
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded && decoded.id) {
                    // Fetch user details from the database using the user ID from the JWT payload
                    const user = await User.findById(decoded.id);
                    if (user) {
                        userWishlist = user.wishlist;
                        totalCartCount = user.cart.products.length;
                    }
                }
            } catch (error) {
                if (error instanceof jwt.TokenExpiredError) {
                    // Handle token expiration only if redirection hasn't already occurred
                    if (!res.locals.tokenExpiredHandled) {
                        console.error("Token has expired:", error);
                        res.locals.tokenExpiredHandled = true; // Set flag to indicate that redirection has occurred
                        return res.render('user/index', { uniqueCategories, categor: latestProducts, wishlist: userWishlist, totalCartCount:totalCartCount });
                    } 
                } else {
                    // Handle other JWT verification errors
                    console.error("JWT verification error:", error);
                    return res.status(500).json({ error: "Internal server error" });
                }
            }
        }

        // Render the homepage with the latest product from each category and user's wishlist
        res.render('user/index', { uniqueCategories, categor: latestProducts, wishlist: userWishlist, totalCartCount:totalCartCount });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal server error" }); 
    }
};

 

const userprofilepage = async (req, res) => {
    let message = req.query.passwordUpdate;

    try {
        const token = req.cookies.user_jwt;
        if (!token) {
            return res.redirect('/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.redirect('/login');
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.redirect('/login');
        }

        res.render('user/profile', {
            userName: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            profileImage: user.image,
            userId: user._id,
            errorMessage: req.errorMessage,
            successMessage: message,
            addrress:user.address,
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return res.redirect('/login'); // Ensure to use 'return' to prevent further execution
    }
};

// Login page route
let loginpage = (req, res) => { 
    const token = req.cookies.user_jwt; 

    if (token) {
        // Verify the JWT token to check if it's still valid
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                
                res.render('user/login', { errorMessage: req.query.errorMessage });
            } else {
               
                res.redirect('/profile');
            }
        }); 
    } else {
        // No JWT token found, render login page
        res.render('user/login', { errorMessage: req.query.errorMessage });
    }
};

// Handle user login
const dataslogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.render('user/login', { errorMessage: 'Invalid email or password. Please sign up.' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.cookie('user_jwt', token, { httpOnly: true });
        res.redirect('/');

    } catch (error) {
        console.error('Error logging in:', error);
        res.render('user/login', { errorMessage: 'Something went wrong. Please try again.' });
    }
};

const blockpage =(req,res)=>{

    res.render('user/error404',{errormessage:"You Are Blocked !!"});
}

let signuppage = (req, res) => {
    const token = req.cookies.user_jwt;

    if (token) {
        // Verify the JWT token to check if it's still valid
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                // JWT token is invalid or expired, render signup page
                res.render('user/signup', { signupSuccessful: req.signupSuccessful });
            } else {
                // JWT token is valid, redirect to profile page
                res.redirect('/profile');
            }
        });
    } else {
        // No JWT token found, continue to signup page
        res.render('user/signup', { signupSuccessful: req.signupSuccessful });
    }
};

const getsignupdata = async (req, res) => {
    const { name, email, phoneNumber, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.render('user/signup', { signupSuccessful: "User already exists" });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            phoneNumber,
        });

        await newUser.save();

        // Generate JWT token
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        
        // Set JWT token in the cookie
        res.cookie('user_jwt', token, { httpOnly: true });

        // Redirect the user to the homepage or any desired page after successful signup
        res.redirect('/');
    } catch (error) {
        console.error('Error signing up:', error);
        res.status(500).json({ error: "Internal server error" });
    }
};



const logout = (req, res) => {
    res.clearCookie('user_jwt');
    res.redirect('/');
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
            return res.redirect('/profile?passwordUpdate= current password is not match'); // Password update failed
        }

        if (newPassword !== confirmPassword) {
            return res.redirect('/profile?passwordUpdate=false'); // Password update failed
        } 

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        await user.save();

        
        res.redirect('/profile?passwordUpdate= password update sccesfully');

    } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).json({ message: "Error updating password" });
    }
};

const editprofile = async (req, res) => {
    const token = req.cookies.user_jwt;
    const { userName, email, phoneNumber } = req.body;

    try {
        if (!token) {
            return res.redirect('/login');
        }

        // Verify the JWT token to get user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.redirect('/login');
        }

        const userId = decoded.id;

        let imageUrl = ''; // Initialize with an empty string

        // Handle image upload only if a new image is provided
        if (req.files && req.files.length > 0) {
            // Upload the file to Cloudinary
            const result = await cloudinary.uploader.upload(req.files[0].path);
            imageUrl = result.secure_url; 
        }

        // Get the existing user data
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send("User not found");
        }

        // Update user data with the new information
        user.name = userName;
        user.email = email;
        user.phoneNumber = phoneNumber;

        // Update the image URL only if a new image is provided
        if (imageUrl) {
            user.image = imageUrl;
        }

        // Save the updated user data
        await user.save();

        // Update the JWT token with new user information
        const newToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.cookie('user_jwt', newToken, { httpOnly: true });

        res.redirect('/profile?passwordUpdate=profile updated successfully');

    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).send("An error occurred while updating profile"); 
    }
};

const deleteProfileImage = async (req, res) => {
    const token = req.cookies.user_jwt;

    try {
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Verify the JWT token to get user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = decoded.id;

        // Find the user by userId and remove the profile image
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Remove the profile image field from the user document
        user.image = undefined;
        await user.save();

        return res.sendStatus(200); // Respond with success status
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const contactpage = async (req,res)=>{
    const token = req.cookies.user_jwt;
   try{
        if (!token) {
            return res.redirect('/login');
        }

        // Verify the JWT token to get user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.json({ message: 'Please Login' });
        }
        const user = await User.findById(decoded.id);
        if (user) {  
            totalCartCount = user.cart.products.length;
         
          }else{
               totalCartCount = "";
          }
        res.render('user/contact',{cartcount:req.cartcount,talCartCount: totalCartCount})
     
    }catch (error) {
        // Handle error, including token expiration
        console.error(error);
        if (error instanceof jwt.TokenExpiredError) {
            // Redirect to login page if token has expired
            return res.redirect('/login');
        } else {
            // Handle other errors
            res.status(500).send('Internal Server Error');
        }
    }

}


const shoppage = async (req, res) => {
    const cartcount = req.params.count;

    try {
        const data = await Products.findOne();

        if (!data || !data.products || data.products.length === 0) {
            return res.status(404).json({ error: "Data not found or empty" });
        }

        const uniqueCategories = [...new Set(data.products.map(product => product.category))];
        
        if (req.cookies.user_jwt) {
            jwt.verify(req.cookies.user_jwt, process.env.JWT_SECRET, async (err, decodedToken) => {
                if (err) {
                    return res.render('user/shop', { categor: data.products, uniqueCategories, cartcount, user: undefined });
                } else {
                    req.user = decodedToken;
                    const user = await User.findOne({ _id: req.user.id });
                    return res.render('user/shop', { categor: data.products, uniqueCategories, cartcount, user });
                }
            });
        } else {
            return res.render('user/shop', { categor: data.products, uniqueCategories, cartcount, user: undefined });
        }

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}


const getproductdetails = async (req, res) => {
    try {
        const category = req.params.category;

        const product = await Products.findOne({ 'products.category': category });

        if (!product) {
            return res.render('user/error404', { error: "Product Not Available Now !!" });
        }

        const categorProducts = product.products.filter(produ => produ.category === category);

        let user = undefined;
        if (req.cookies.user_jwt) {
            jwt.verify(req.cookies.user_jwt, process.env.JWT_SECRET, async (err, decodedToken) => {
                if (!err) {
                    req.user = decodedToken;
                    user = await User.findOne({ _id: req.user.id });
                }
                res.json({ categor: categorProducts, product, user });
            });
        } else {
            res.json({ categor: categorProducts, product, user });
        }
    } catch (error) {
        console.error("Error:", error);
        res.render('user/error404', { errormessage: "Product Not Available" });
    }
}


const addToCart = async (req, res) => {
    const productId = req.params.id;
    const token = req.cookies.user_jwt;

    try {
        if (!token) {
            return res.status(401).json({ message: 'Please log in' });
        }

        // Verify the JWT token to get user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.status(401).json({ message: 'Please log in' });
        }

        const userId = decoded.id;

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
                quantity: 1,
                disable:productData.disable
            });
        }

        // Calculate the sum of product prices in the cart
        const totalPrice = user.cart.products.reduce((total, product) => {
            return total + (product.productPrice * product.quantity);
        }, 0);

        user.cart.total = totalPrice;

        // Save the updated user cart
        await user.save();

        res.json({ message: 'Product added to cart' });

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error ');
    }
};
const cartpage = async (req, res) => {
    const token = req.cookies.user_jwt;

    try {
        if (!token) {
            return res.redirect('/login');
        }

        // Verify the JWT token to get user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.redirect('/login');
        }

        // Find the logged-in user by ID
        const user = await User.findById(decoded.id);
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
        const totalPrice = user.cart.total;

       
        if (user) {  
            totalCartCount = user.cart.products.length;
         
          }else{
               totalCartCount = "";
          }
        res.render('user/cart', { usercartdata, totalPrice,totalCartCount:totalCartCount });

    }  catch (error) {
        // Handle error, including token expiration
        console.error(error);
        if (error instanceof jwt.TokenExpiredError) {
            // Redirect to login page if token has expired
            return res.redirect('/login');
        } else {
            // Handle other errors
            res.status(500).send('Internal Server Error');
        }
    }
};

const deletecartproduct = async (req, res) => {
    const token = req.cookies.user_jwt;
    const productId = req.params.productId;

    try {
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Verify the JWT token to get user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Find the user by ID and remove the product from the cart
        const user = await User.findByIdAndUpdate(
            decoded.id,
            { $pull: { 'cart.products': { productId: productId } } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Calculate the total price of the items in the cart
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
};

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
    const token = req.cookies.user_jwt;

    try {
        if (!token) {
            return res.redirect('/login');
        }
        // Verify the JWT token to get user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.redirect('/login');
        }

        // Find the logged-in user by ID
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Extract the wishlist data from the user document
        const wishlistData = user.wishlist.map(item => ({
            productId: item.productId,
            productName: item.productName,
            productPrice: item.productPrice,
            image: item.image,
            color: item.color
        }));
           if (user) {  
            totalCartCount = user.cart.products.length;
         
          }else{
               totalCartCount = "";
          }
        // Render the wishlist page with the wishlist data
        res.render('user/whishlist', { wishlist: wishlistData,cartcount:totalCartCount });

    }  catch (error) {
        // Handle error, including token expiration
        console.error(error);
        if (error instanceof jwt.TokenExpiredError) {
            // Redirect to login page if token has expired
            return res.redirect('/login');
        } else {
            // Handle other errors
            res.status(500).send('Internal Server Error');
        }
    }
};

const wishlist = async (req, res) => {
    const token = req.cookies.user_jwt;
    const productId = req.params.id;

    try {
        if (!token) {
            return res.json({ message: 'Please Login' });
        }

        // Verify the JWT token to get user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.json({ message: 'Please Login' });
        }

        // Find the product by ID
        const product = await Products.findOne({ 'products._id': productId });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Find the user by ID
        const user = await User.findById(decoded.id);
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
             color = false;
            res.json({  message: 'Product removed from wishlist', color });
        } else {
            // If the product doesn't exist, add it to the wishlist
            user.wishlist.push({
                productId: productData._id,
                productName: productData.productName,
                productPrice: productData.productPrice,
                image: productData.image[0], // Assuming image is an array and you want the first image
            });

            // Save the user data
            await user.save();

            // Access the added product from the wishlist
            const addedProduct = user.wishlist.find(item => item.productId == productId);
            let color = true;
            res.json({  message: 'Product added to wishlist', color });
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error' }); // Handle internal server errors
    }
};


const removewishlist = async (req, res) => {
    const token = req.cookies.user_jwt;
    const productId = req.params.id;

    try {
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Verify the JWT token to get user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Find the user by ID and remove the product from the wishlist array
        const user = await User.findOneAndUpdate(
            { _id: decoded.id }, // Use decoded.id
            { $pull: { wishlist: { productId: productId } } },
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
};

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

        let totalCartCount = "";
        const token = req.cookies.user_jwt;
        if (token) {
            // Verify the JWT token to get user ID
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded && decoded.id) {
                // If user is authenticated, fetch the total cart count
                const user = await User.findById(decoded.id);
                if (user) {
                    totalCartCount = user.cart.products.length;
                }
            }
        }

        res.render('user/productsingleveiw', { product: exactProduct, cartcount: totalCartCount, totalCartCount: req.totalCartCount });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


const checkoutfromcart = async (req, res) => {
    try {
        // Find the user
        let user = await User.findOne();
       

        let address = user.address;

        // If user not found, send 404 error
        if (!user) {
            return res.status(404).send('User not found');
        }

        let cart = user.cart;

        let cartTotalNonDisabled = cart.products.reduce((total, product) => {
            if (!product.disable) {
                return total + parseFloat(product.productPrice);
                
            } else {
                return total;
            }
        }, 0);

        console.log(cartTotalNonDisabled);

        // Get the total number of products in the cart
        let totalCartCount = cart.products.length;

        // Render the checkout page with the relevant information
        res.render('user/checkout', { products: cart.products, cartTotal: cartTotalNonDisabled, totalCartCount, userAddresse: address });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};


const checkoutpage = async (req, res) => {
    try {
        const productId = req.params.id;

        const product = await Products.findOne({ 'products._id': productId });
        const user = await User.findOne();

        let address = user.address;

        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Find the exact product within the products array
        const exactProduct = product.products.find(p => p._id == productId);

        if (!exactProduct) {
            return res.status(404).send('Product not found');
        }

        // Render the checkout page with the exact product and user's address
        res.render('user/checkout', { products: [exactProduct], cartcount: req.cartcount, totalCartCount: req.totalCartCount, cartTotal: req.cartTotal, userAddresse: address });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}


const manageaddress = async (req, res) => {
    const { name,number, pincode, address, city, district, state, email } = req.body;
console.log(number);
    try {
        const token = req.cookies.user_jwt;
      
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Verify the JWT token to get user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Find the user by ID obtained from the decoded JWT token
        const user = await User.findById(decoded.id);

        // If user is not found, handle the situation
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Push the new address to the user's address array
        user.address.push({
            name: name,
            phone: number,
            pincode: pincode,
            address: address,
            city: city,
            district: district,
            state: state,
            email: email
        });

        // Save the changes
        await user.save();

        res.redirect('/profile?addressUpdate=address added');
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).send('Internal Server Error');
    }
};



const addressdelete = async (req, res) => {
    try {
        const addressId = req.params.id;

        // Find the user and pull the matched address from the address array
        const user = await User.findOneAndUpdate(
            { 'address._id': addressId },
            { $pull: { address: { _id: addressId } } },
            { new: true }
        );

        // Check if the user was found and updated
        if (!user) {
            return res.status(404).send('User not found');
        }
        // Redirect to the profile page with a success message
        return res.json({message:'Address deleted'})

    } catch (error) {
        console.error('Error deleting address:', error);
        return res.status(500).send('Internal Server Error');
    }
};


const placeholder = async (req, res) => {
    const { selectedAddressId, selectedPaymentMethod, productIds } = req.body;

    try {
        const token = req.cookies.user_jwt;

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Verify the JWT token to get user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Find the exact user matching the decoded user ID
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Find the address matching the selected address ID within the user's addresses
        const exactAddress = user.address.find(addr => addr._id.toString() === selectedAddressId);

        if (!exactAddress) {
            return res.status(404).json({ error: 'Address not found' });
        }

        // Find only the products whose IDs match the provided productIds within the 'products' array field
        const products = await Products.find();

        if (!products || products.length === 0) {
            return res.status(404).json({ error: 'Products not found' });
        }

        let exactProducts = [];

        if (productIds.length === 1) {
            const product = products.find(product => product.products.some(p => p._id.toString() === productIds[0]));
            exactProducts = product.products.filter(p => p._id.toString() === productIds[0]);
        } else {
            // Assuming user.cart.products is where the user's cart items are stored
            exactProducts = user.cart.products.filter(product => !product.disable);
        }

        // Calculate total amount based on the found products
        const totalAmount = exactProducts.reduce((total, product) => {
            return total + (product.productPrice * product.quantity);
        }, 0);

        // Ensure totalAmount is a number, if it's NaN set it to 0
        const sanitizedTotalAmount = isNaN(totalAmount) ? 0 : totalAmount;

        // Create new order object
        const newOrder = {
            products: exactProducts.map(product => ({
                productId: product._id,
                name:product.productName,
                qty: product.quantity,
                price: product.productPrice,
                image:product.image,
                orderStatus: "Pending",
                cancelReason: null
            })),
            totalAmount: sanitizedTotalAmount,
            orderDate: new Date(),
            shippingAddress: exactAddress,
            paymentMethod: selectedPaymentMethod
        };

        // Add the new order to the user's orders array
        user.orders.push(newOrder);

        // Save the updated user document
        await user.save();

        console.log("Product IDs:", selectedAddressId);
        console.log("Product IDs:", selectedPaymentMethod);
        console.log("Product IDs:", productIds);
        console.log("Products:", exactProducts);
        console.log(exactAddress);

        // Further processing logic here

        res.status(200).json({ products: exactProducts, exactAddress });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
}


const ordermanage = async (req, res) => {
    const token = req.cookies.user_jwt;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify the JWT token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await User.findById(decoded.id);

    // Extracting products from each order
    const userProducts = user.orders.map(order => order.products).flat();


    const userOrders = user.orders.map(order => {
        return {
            products: order.products,
            totalAmount: order.totalAmount,
            orderDate: order.orderDate,
            expectedDeliveryDate: order.expectedDeliveryDate,
            shippingAddress: order.shippingAddress,
            paymentMethod: order.paymentMethod
        };
    });

    

    // const ordersdata =user.orders;

    
    // `flat()` method is used to flatten the array of arrays into a single array

    res.render('user/orders', { products:userProducts,userOrders});
}

const cancellreson = async (req, res) => {
    let productId = req.params.id;
    const token = req.cookies.user_jwt;
 
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
 
    // Verify the JWT token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await User.findById(decoded.id);
 
    let foundProduct = null;
 
    // Iterate over each order and its products to find the product with the matching productId
    user.orders.forEach(order => {
        order.products.forEach(product => {
            if (product.productId.toString() === productId) {
                foundProduct = product;
                return; // Exit the loop once the product is found
            }
        });
    });
 
    if (!foundProduct) {
        return res.status(404).json({ error: 'Product not found' });
    }
 
    console.log(foundProduct);
 
    // You can do further operations with the found product here
 }






async function sendOTP(req, res) {
    const { email } = req.body;
   
    const otp = otpService.generateOTP();
    otpService.otpMap.set(email, otp.toString());
    try {
      await otpService.sendOTP(email, otp);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error sending OTP:', error);
      res.status(500).json({ message: error.message });
    }
  }
  
  async function loginWithOTP(req, res) {
    try {
        const { email, otp } = req.body;
        console.log(email);                                                                                                                                               `                                                                                                                                                                                                                                                                       `
        const user = await User.findOne({ email });
       
        if (!user) {
            return res.render('user/login', { errorMessage: 'Invalid email or OTP. Please sign up or try again.' });
        }
        
        const isOTPValid = otpService.verifyOTP(email, otp);
        if (!isOTPValid) {
            return res.render('user/login', { errorMessage: 'Invalid email or OTP. Please sign up or try again.' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('user_jwt', token, { httpOnly: true });
        res.redirect('/');
    } catch (error) {
        console.error('Error logging in with OTP:', error);
        res.render('user/login', { errorMessage: 'Something went wrong. Please try again.' });
    }
}




async function succesGoogleLogin(req, res) {
    try {
        if (!req.user) {
            return res.redirect('/failure');
        }

        console.log('Google Login Email:', req.user.email);
        console.log('Google Profile:', req.user.profile);

        // Find the user by email
        let user = await User.findOne({ email: req.user.email });

        if (!user) {
            // If user doesn't exist, create a new user
            user = new User({
                name: req.user.displayName,
                email: req.user.email,
                image: req.user.profile.photos[0].value, // Save profile image URL
                password: req.user.password,
            });
            await user.save();
            console.log('User Data Saved.');
        }

        // Find the user again to ensure we have the latest data
        const newUser = await User.findById(user._id);

        console.log(newUser);

        // Generate JWT token
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('user_jwt', token, { httpOnly: true });

        return res.redirect('/'); // Redirect to the profile page after successful login
    } catch (error) {
        console.error('Error in Google authentication:', error);
        return res.redirect('/failure');
    }
}
  
  // Failure route handler after Google login
  function failureGooglelogin(req, res) {
    res.send('Error');
  }

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
    manageaddress,
    addressdelete,
    placeholder,
    ordermanage,
    cancellreson,
    loginWithOTP, 
    sendOTP,
    succesGoogleLogin,
    failureGooglelogin,
    googleAuth,

}