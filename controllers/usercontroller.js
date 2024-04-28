const bcrypt = require("bcrypt");
const User = require("../models/user");
const Admin = require("../models/admin");
const jwt = require("jsonwebtoken");
const Products = require("../models/Products");
const passport = require("passport");
const cloudinary = require("../config/cloudinary");
const upload = require("../config/multer.js");
const otpService = require("../services/otpService");
const helpers = require("../helpers/userHelpers");
const { response } = require("express");
const nodemailer = require("nodemailer");
const puppeteer = require('puppeteer');

const Homepage = async (req, res) => {
  try {
    const products = await Products.find();

    if (!products || !products.length === 0) {
      return res.render("user/error404", {
        errormessage: "Data not found or empty",
      });
    }

    const categories = products.map((product) => product.category);

    const uniqueCategories = [...new Set(categories)];


    
    const latestProducts = [];

    uniqueCategories.forEach((category) => {
      const categoryProducts = products.filter(
        (product) => product.category === category
      );

      categoryProducts.sort((a, b) => b.createdAt - a.createdAt);

      latestProducts.push(categoryProducts[0]);
    });

  
    let userWishlist = [];
    let totalCartCount = "";

    const token = req.cookies.user_jwt;

    if (token) {
      try {
       
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.id) {
          
          const user = await User.findById(decoded.id);
          if (user) {
            const wishlistData = user.wishlist.map((item) => ({
              productId: item._id,
            }));
           
            userWishlist = await Promise.all(
              wishlistData.map(async (item) => {
             
                const product = await Products.findById(item.productId);

                if (!product) {
                  
                  throw new Error(
                    `Product with ID ${item.productId} not found`
                  );
                }

 
                return {
                  productId: product._id,
                  productName: product.productName,
                  productPrice: product.productPrice,
                  image: product.image,
                };
              })
            );
            totalCartCount = user.cart.products.length;
          }
        }
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
        
          if (!res.locals.tokenExpiredHandled) {
            console.error("Token has expired:", error);
            res.locals.tokenExpiredHandled = true; 
            return res.render("user/index", {
              uniqueCategories,
              categor: latestProducts,
              wishlist: userWishlist,
              totalCartCount: totalCartCount,
            });
          }
        } else {
     
          console.error("JWT verification error:", error);
          return res.status(500).json({ error: "Internal server error" });
        }
      }
    }


    res.render("user/index", {
      uniqueCategories,
      categor: latestProducts,
      wishlist: userWishlist,
      totalCartCount: totalCartCount,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const userprofilepage = async (req, res) => {
  let message = req.query.passwordUpdate;

  console.log(message);

  try {
    const token = req.cookies.user_jwt;
    if (!token) {
      return res.redirect("/login");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.redirect("/login");
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.redirect("/login");
    }

    // Check if the URL contains an anchor for the edit profile section
    // Assuming you always want to show the edit profile section after rendering

    res.render("user/profile", {
      showEditProfile: message,
      userName: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profileImage: user.image,
      userId: user._id,
      errorMessage: req.errorMessage,
      successMessage: message,
      addrress: user.address,
      // Pass a boolean to indicate whether to show the edit profile section
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.redirect("/login"); // Ensure to use 'return' to prevent further execution
  }
};

// Login page route
let loginpage = (req, res) => {
  const token = req.cookies.user_jwt;

  if (token) {
    // Verify the JWT token to check if it's still valid
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        res.render("user/login", { errorMessage: req.query.errorMessage });
      } else {
        res.redirect("/profile");
      }
    });
  } else {
    // No JWT token found, render login page
    res.render("user/login", { errorMessage: req.query.errorMessage });
  }
};

// Handle user login
const dataslogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    // Check if user exists
    if (!user) {
      return res.render("user/login", {
        errorMessage: "Invalid email or password. Please sign up.",
      });
    }

    // Check if the user is blocked
    if (user.blocked) {
      return res.redirect("/block"); // Redirect to the blocked route
    }

    // Check if the password is correct
    if (!bcrypt.compareSync(password, user.password)) {
      return res.render("user/login", {
        errorMessage: "Invalid email or password. Please sign up.",
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    // Set the JWT token in a cookie
    res.cookie("user_jwt", token, { httpOnly: true });

    // Redirect to the home page
    res.redirect("/");
  } catch (error) {
    console.error("Error logging in:", error);
    res.render("user/login", {
      errorMessage: "Something went wrong. Please try again.",
    });
  }
};

const blockpage = (req, res) => {
  res.render("user/error404", { errormessage: "You Are Blocked !!" });
};

let signuppage = (req, res) => {
  const token = req.cookies.user_jwt;

  if (token) {
    // Verify the JWT token to check if it's still valid
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        // JWT token is invalid or expired, render signup page
        res.render("user/signup", { signupSuccessful: req.signupSuccessful });
      } else {
        // JWT token is valid, redirect to profile page
        res.redirect("/profile");
      }
    });
  } else {
    // No JWT token found, continue to signup page
    res.render("user/signup", { signupSuccessful: req.signupSuccessful });
  }
};

const logout = (req, res) => {
  res.clearCookie("user_jwt");
  res.redirect("/");
};

const editpassword = async (req, res) => {
  const userId = req.params.id;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordMatch) {
      return res.redirect(
        "/profile?passwordUpdate= current password is not match"
      ); // Password update failed
    }

    if (newPassword !== confirmPassword) {
      return res.redirect("/profile?passwordUpdate=false"); // Password update failed
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    res.redirect("/profile?passwordUpdate=password update sccesfully");
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Error updating password" });
  }
};

const editprofile = async (req, res) => {
  const token = req.cookies.user_jwt;
  const { userName, phoneNumber } = req.body;

  try {
    if (!token) {
      return res.redirect("/login");
    }

    // Verify the JWT token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.redirect("/login");
    }

    const userId = decoded.id;

    let imageUrl = ""; // Initialize with an empty string

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
    user.phoneNumber = phoneNumber;

    // Update the image URL only if a new image is provided
    if (imageUrl) {
      user.image = imageUrl;
    }

    // Save the updated user data
    await user.save();

    // Update the JWT token with new user information
    const newToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    res.cookie("user_jwt", newToken, { httpOnly: true });

    res.redirect("/profile?passwordUpdate=Profile Updated");
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).send("An error occurred while updating profile");
  }
};

const deleteProfileImage = async (req, res) => {
  const token = req.cookies.user_jwt;

  try {
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify the JWT token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = decoded.id;

    // Find the user by userId and remove the profile image
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove the profile image field from the user document
    user.image = undefined;
    await user.save();

    return res.sendStatus(200); // Respond with success status
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const shoppage = async (req, res) => {
  // const cartcount = req.params.count;

  try {
    const products = await Products.find();

    if (!products || products.length === 0) {
      return res.status(404).json({ error: "Data not found or empty" });
    }

    const uniqueCategories = [
      ...new Set(products.map((product) => product.category)),
    ];

    let totalCartCount = "";

    if (req.cookies.user_jwt) {
      jwt.verify(
        req.cookies.user_jwt,
        process.env.JWT_SECRET,
        async (err, decodedToken) => {
          if (err) {
            return res.render("user/shop", {
              categor: products,
              uniqueCategories,
              user: undefined,
              totalCartCount: totalCartCount,
              errorMessage: req.errorMessage,
            });
          } else {
            req.user = decodedToken;
            const user = await User.findOne({ _id: req.user.id });

            if (user) {
              totalCartCount = user.cart.products.length;
            }
            console.log(user);
            return res.render("user/shop", {
              categor: products,
              uniqueCategories,
              user,
              totalCartCount: totalCartCount,
              errorMessage: req.errorMessage,
            });
          }
        }
      );
    } else {
      return res.render("user/shop", {
        categor: products,
        uniqueCategories,
        user: undefined,
        totalCartCount: totalCartCount,
        errorMessage: req.errorMessage,
      });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const newproducts = async (req, res) => {
  try {
    let uniqueCategories = [];
    // Fetch the latest 10 products sorted by createdAt in descending order
    const products = await Products.find().sort({ createdAt: -1 }).limit(9);

    console.log("kkkkk");
    console.log(products);

    uniqueCategories = await Products.distinct("category");
    if (req.cookies.user_jwt) {
      jwt.verify(
        req.cookies.user_jwt,
        process.env.JWT_SECRET,
        async (err, decodedToken) => {
          if (err) {
            return res.render("user/shop", {
              categor: products,
              uniqueCategories,
              user: undefined,
              totalCartCount: req.totalCartCount,
              errorMessage: req.errorMessage,
            });
          } else {
            req.user = decodedToken;
            const user = await User.findOne({ _id: req.user.id });
            if (user) {
              totalCartCount = user.cart.products.length;
            }

            return res.render("user/shop", {
              categor: products,
              uniqueCategories,
              user,
              totalCartCount: req.totalCartCount,
              errorMessage: req.errorMessage,
            });
          }
        }
      );
    } else {
      return res.render("user/shop", {
        categor: products,
        uniqueCategories,
        user: undefined,
        totalCartCount: req.totalCartCount,
        errorMessage: req.errorMessage,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getproductdetails = async (req, res) => {
  try {
    const category = req.params.category;
    const sortingOption = req.query.sorting;

    console.log("yes");

    // Define the filter based on category
    const filter = { category: category };

    const sortCriteria = {};
    if (sortingOption === "lowToHigh") {
      sortCriteria.productPrice = 1; // Ascending order
    } else if (sortingOption === "highToLow") {
      sortCriteria.productPrice = -1; // Descending order
    }

    const products = await Products.find(filter).sort(sortCriteria);

    if (!products || products.length === 0) {
      return res.render("user/error404", {
        error: "Product Not Available Now !!",
      });
    }

    // Get user information if available
    let user = undefined;
    if (req.cookies.user_jwt) {
      jwt.verify(
        req.cookies.user_jwt,
        process.env.JWT_SECRET,
        async (err, decodedToken) => {
          if (!err) {
            req.user = decodedToken;
            user = await User.findOne({ _id: req.user.id });
          }
          res.json({ categor: products, user });
        }
      );
    } else {
      res.json({ categor: products, user });
    }
  } catch (error) {
    console.error("Error:", error);
    res.render("user/shop", {
      errorMessage: "Product Not Found",
      categor: categorProducts,
      uniqueCategories,
      cartcount: req.cartcount,
      user: req.user,
      totalCartCount: req.totalCartCount,
    });
  }
};

const addToCart = async (req, res) => {
  const productId = req.params.id;
  const token = req.cookies.user_jwt;

  try {
    if (!token) {
      return res.json({ message: "Please log in",cartcount:"0" });
    }

    // Verify the JWT token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.redirect({ message: "Please log in",cartcount:"0" });
    }

    const userId = decoded.id;

    // Find the product by ID
    const product = await Products.findOne({ _id: productId });
    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    const existingProduct = user.cart.products.find(
      (item) => item.productId == productId
    );

    console.log("hi");
    if (existingProduct) {
      console.log("exting", existingProduct);
      existingProduct.quantity += 1;
    } else {
      // If the product doesn't exist, add it to the cart
      // const productData = product.find(prod => prod._id == productId);

      console.log("product data", product);
      user.cart.products.push({
        productId: product._id,
      });
    }

    // Calculate the sum of product prices in the cart
    const totalPrice = user.cart.products.reduce((total, product) => {
      return total + product.productPrice * product.quantity;
    }, 0);

    user.cart.total = totalPrice;
    let cartcount = user.cart.products.length

    console.log(cartcount);

    // Save the updated user cart
    await user.save();

    res.json({ message: "Product added to cart",cartcount });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error ");
  }
};

const cartpage = async (req, res) => {
  const token = req.cookies.user_jwt;

  try {
    if (!token) {
      return res.redirect("/login");
    }

    // Verify the JWT token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.redirect("/login");
    }

    // Find the logged-in user by ID
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Extract the cart data from the user document
    const userCartData = user.cart.products.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    const productsInCart = await Promise.all(
      userCartData.map(async (item) => {
        const product = await Products.findById(item.productId);

        if (!product) {
          // If product not found, handle the error
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        // Return product details including the image array
        return {
          productId: product._id,
          productName: product.productName,
          productPrice: product.productPrice,
          quantity: item.quantity,
          stockcount: product.stockcount,
          disable: product.disable,

          image: product.image, // Assuming image is an array field in your product schema
        };
      })
    );

    // Calculate total price
    const totalPrice = productsInCart.reduce((total, product) => {
      return total + product.productPrice * product.quantity;
    }, 0);

    // Count total items in the cart
    const totalCartCount = user.cart.products.length;

    console.log(productsInCart);

    res.render("user/cart", {
      usercartdata: productsInCart,
      totalPrice,
      totalCartCount,
    });
  } catch (error) {
    // Handle error, including token expiration
    console.error(error);
    if (error instanceof jwt.TokenExpiredError) {
      // Redirect to login page if token has expired
      return res.redirect("/login");
    } else {
      // Handle other errors
      res.status(500).send("Internal Server Error");
    }
  }
};

const deletecartproduct = async (req, res) => {
  const token = req.cookies.user_jwt;
  const productId = req.params.productId;

  try {
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify the JWT token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Find the user by ID and remove the product from the cart
    const user = await User.findByIdAndUpdate(
      decoded.id,
      { $pull: { "cart.products": { productId: productId } } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate the total price of the items in the cart
    const totalPrice = user.cart.products.reduce((total, product) => {
      return total + product.productPrice * product.quantity;
    }, 0);

    user.cart.total = totalPrice;

    await user.save();

    // Sending back the updated user data
    return res.json({ totalPrice });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const quantityminus = async (req, res) => {
  try {
    const productId = req.params.productId;
    const token = req.cookies.user_jwt;

    console.log("kkkkkk");

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify the JWT token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    // Find the user by productId and update the quantity
    const user = await User.findOneAndUpdate(
      { _id: decoded.id, "cart.products.productId": productId },
      { $inc: { "cart.products.$.quantity": -1 } }, // Decrease quantity by 1
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User or product not found" });
    }

    const totalPrice = user.cart.products.reduce((total, product) => {
      return total + product.productPrice * product.quantity;
    }, 0);

    user.cart.total = totalPrice;

    await user.save();
    return res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const quantityplus = async (req, res) => {
  try {
    const productId = req.params.productId;
    const token = req.cookies.user_jwt;

   
    console.log("hiooo",productId); 

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify the JWT token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const usercart = await User.findOne(
        { _id: decoded.id, "cart.products.productId": productId },
        { _id: 1, "cart.products.$": 1 }
    );
    console.log("User:", usercart.cart.products[0].quantity);
    
    if (!usercart) {
        return res.status(404).json({ error: "User not found or product not in the cart" });
    }
    const product = await Products.findById(productId);
    console.log(product.stockcount)

     

    
if(product.stockcount!==0 && usercart.cart.products[0].quantity<product.stockcount){
    const user = await User.findOneAndUpdate(
      { _id: decoded.id, "cart.products.productId": productId }, // Filter object
      { $inc: { "cart.products.$.quantity": 1 } }, // Increase quantity by 1
      { new: true }
    );


    if (!user) {
      return res.status(404).json({ error: "User or product not found" });
    }

    // Recalculate total price
    const totalPrice = user.cart.products.reduce((total, product) => {
      return total + product.productPrice * product.quantity;
    }, 0);
    user.cart.total = totalPrice;
    await user.save();

    return res.json({ user }); 
}else{
    return res.json({ message:"No more stock" });
}
   

   
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const latestproduct = async (req, res) => {
  try {
    const category = req.body.category;

    console.log(category);

    // Find the latest product in the specified category
    const latestProduct = await Products.findOne({ category }).sort({
      createdAt: -1,
    });

    if (!latestProduct) {
      return res.render("user/error404", {
        errormessage: "Product Not Available Now !!",
      });
    }

    // Find up to four products in the same category with a creation date before or equal to the latest product
    const products = await Products.find({
      category,
      createdAt: { $lte: latestProduct.createdAt },
    })
      .sort({ createdAt: -1 })
      .limit(4);

    res.json({ message: "successfully passed", products, wishlist: [] });
  } catch (error) {
    console.error("Error:", error);
    res.render("user/error404", { errormessage: "Product Not Available" });
  }
};
const whishlistget = async (req, res) => {
  const token = req.cookies.user_jwt;

  try {
    if (!token) {
      return res.redirect("/login");
    }
    // Verify the JWT token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.redirect("/login");
    }

    // Find the logged-in user by ID
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).send("User not found");
    }

    const userwishlistData = user.wishlist.map((item) => ({
      productId: item._id,
    }));
    // Extract the wishlist data from the user document
    const wishlistData = await Promise.all(
      userwishlistData.map(async (item) => {
        // Find the product by its ID
        const product = await Products.findById(item.productId);

        if (!product) {
          // If product not found, handle the error
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        // Return product details including the image array
        return {
          productId: product._id,
          productName: product.productName,
          productPrice: product.productPrice,

          image: product.image, // Assuming image is an array field in your product schema
        };
      })
    );
    if (user) {
      totalCartCount = user.cart.products.length;
    } else {
      totalCartCount = "";
    }
    // Render the wishlist page with the wishlist data
    res.render("user/whishlist", {
      wishlist: wishlistData,
      cartcount: totalCartCount,
    });
  } catch (error) {
    // Handle error, including token expiration
    console.error(error);
    if (error instanceof jwt.TokenExpiredError) {
      // Redirect to login page if token has expired
      return res.redirect("/login");
    } else {
      // Handle other errors
      res.status(500).send("Internal Server Error");
    }
  }
};

const wishlist = async (req, res) => {
  const token = req.cookies.user_jwt;
  const productId = req.params.id;

  console.log(productId);
  try {
    if (!token) {
      return res.json({ message: "Please Login" });
    }

    // Verify the JWT token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.json({ message: "Please Login" });
    }

    // Check if the user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the product already exists in the wishlist
    const existingProductIndex = user.wishlist.findIndex(
      (item) => item._id.toString() === productId
    );

    console.log(existingProductIndex);

    if (existingProductIndex !== -1) {
      // If the product exists, remove it from the wishlist
      user.wishlist.splice(existingProductIndex, 1);
      await user.save();
      let color = false;
      res.json({ message: "Product removed from wishlist", color });
    } else {
      // If the product doesn't exist, add its ID to the wishlist
      user.wishlist.push(productId);

      // Save the user data
      await user.save();

      let color = true;
      res.json({ message: "Product added to wishlist", color });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" }); // Handle internal server errors
  }
};

const removewishlist = async (req, res) => {
  const token = req.cookies.user_jwt;
  const productId = req.params.id;

  try {
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify the JWT token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Find the user by ID and remove the product from the wishlist array
    const user = await User.findOneAndUpdate(
      { _id: decoded.id }, // Use decoded.id
      { $pull: { wishlist: { _id: productId } } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Optionally, you may want to save the user here if necessary
    // await user.save();

    res.json({ message: "Product removed from wishlist" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const productveiw = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Products.findOne({ _id: productId });

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Find the exact product within the products array
    // const exactProduct = product.products.find(p => p._id == productId);

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

    res.render("user/productsingleveiw", {
      product,
      cartcount: totalCartCount,
      totalCartCount: req.totalCartCount,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const checkoutfromcart = async (req, res) => {
  try {
    // Find the user
    const token = req.cookies.user_jwt;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify the JWT token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).send("User not found");
    }

    const cart = user.cart;

    const productIds = cart.products.map((product) => product.productId);

    const productsInCart = await Products.find({
      _id: { $in: productIds },
      disable: { $ne: true },
      stockcount: { $ne: "0" },
    });

    

    let cartTotalNonDisabled;

    if (productsInCart.length !== 0) {
      cartTotalNonDisabled = productsInCart.reduce((total, product) => {
        const cartItem = cart.products.find(
          (item) => item.productId.toString() === product._id.toString()
        );
        if (cartItem) {
          return total + parseFloat(product.productPrice) * cartItem.quantity;
        } else {
          return total;
        }
      }, 0);
    } else {
      return res.redirect("/cart");
    }
    console.log(cartTotalNonDisabled);

    const totalCartCount = cart.products.length;

    const couponCodes = await Admin.aggregate([
      {
        $unwind: "$coupons", // Deconstruct the array field 'coupons'
      },
      {
        $match: {
          "coupons.couponsStatus": "Active", // Match documents where couponStatus is 'Active'
        },
      },
      {
        $project: {
          _id: 0, // Exclude the ID field
          couponCode: "$coupons.couponCode", // Project only the coupon code field
        },
      },
    ]);
    const allCoupons = couponCodes.map((coupon) => coupon.couponCode);

    res.render("user/checkout", {
      products: productsInCart,
      cart,
      cartTotal: cartTotalNonDisabled,
      totalCartCount,
      userAddresse: user.address,
      coupons: allCoupons,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const checkoutpage = async (req, res) => {
  try {
    const productId = req.params.id;
    const token = req.cookies.user_jwt;

    if (!token) {
      return res.redirect("/login");
    }

    console.log("hoooo");
    // Verify the JWT token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.redirect("/login");
    }
    const user = await User.findById(decoded.id);

    const product = await Products.findOne({ _id: productId });

    let cartTotal = product.productPrice;
    let address = user.address;
    // let cart = user.cart;

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Find the exact product within the products array
    // const exactProduct = product.products.find(p => p._id == productId);

    if (!product) {
      return res.status(404).send("Product not found");
    }
    const couponCodes = await Admin.aggregate([
      {
        $unwind: "$coupons",
      },
      {
        $match: { "coupons.couponsStatus": "Active" },
      },
      {
        $project: {
          _id: 0,
          couponCode: "$coupons.couponCode",
        },
      },
    ]);
    const allCoupons = couponCodes.map((coupon) => coupon.couponCode);

    res.render("user/checkout", {
      products: [product],
      cartcount: req.cartcount,
      cart: req.cart,
      totalCartCount: req.totalCartCount,
      cartTotal: cartTotal,
      userAddresse: address,
      coupons: allCoupons,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const manageaddress = async (req, res) => {
  const { name, number, pincode, address, city, district, state, email } =
    req.body;

  try {
    const token = req.cookies.user_jwt;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify the JWT token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Find the user by ID obtained from the decoded JWT token
    const user = await User.findById(decoded.id);

    // If user is not found, handle the situation
    if (!user) {
      return res.status(404).send("User not found");
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
      email: email,
    });

    // Save the changes
    await user.save();

    res.redirect("/profile?passwordUpdate=address added successfully");
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).send("Internal Server Error");
  }
};

const addaddresscheckout = async (req, res) => {
  const { name, number, address, city, district, state, pincode, email } =
    req.body;
  console.log("Received form data:");
  console.log(name, number, address, city, district, state, pincode, email); // Log the received form data

  try {
    const token = req.cookies.user_jwt;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify the JWT token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Find the user by ID obtained from the decoded JWT token
    const user = await User.findById(decoded.id);

    // If user is not found, handle the situation
    if (!user) {
      return res.status(404).send("User not found");
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
      email: email,
    });

    // Save the changes
    await user.save();

    // Redirect or render as needed
    res.json("added succcessfully");
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).send("Internal Server Error");
  }
};

const addressdelete = async (req, res) => {
  try {
    const addressId = req.params.id;

    const user = await User.findOneAndUpdate(
      { "address._id": addressId },
      { $pull: { address: { _id: addressId } } },
      { new: true }
    );

    if (!user) {
      return res.status(404).send("User not found");
    }

    return res.redirect("/profile?passwordUpdate=Address deleted");
  } catch (error) {
    console.error("Error deleting address:", error);
    return res.status(500).send("Internal Server Error");
  }
};

const editaddress = async (req, res) => {
  try {
    const addressId = req.params.id;

    const { name, phone, address, city, district, state, pincode, email } =
      req.body;

    const user = await User.findOneAndUpdate(
      { "address._id": addressId },
      {
        $set: {
          "address.$.name": name,
          "address.$.phone": phone,
          "address.$.address": address,
          "address.$.city": city,
          "address.$.district": district,
          "address.$.state": state,
          "address.$.pincode": pincode,
          "address.$.email": email,
        },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).send("User not found");
    }
    // Redirect to the profile page with a success message
    res.redirect("/profile?passwordUpdate=address updated successfully");
  } catch (error) {
    console.error("Error updating address:", error);
    return res.status(500).send("Internal Server Error");
  }
};

const editAddressFormcheckout = async (req, res) => {
  const addressId = req.params.id;

  console.log(addressId);

  const { name, number, address, city, district, state, pincode, email } =
    req.body;

  console.log(name, number, address, city, district, state, pincode, email);

  console.log("hloooo");

  try {
    const user = await User.findOneAndUpdate(
      { "address._id": addressId },
      {
        $set: {
          "address.$.name": name,
          "address.$.phone": number,
          "address.$.address": address,
          "address.$.city": city,
          "address.$.district": district,
          "address.$.state": state,
          "address.$.pincode": pincode,
          "address.$.email": email,
        },
      },
      { new: true }
    );

    // Check if the user was found and updated
    if (!user) {
      return res.status(404).send("User not found");
    }

    res.json("addressedited");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const placeholder = async (req, res) => {
  const { selectedAddressId, selectedPaymentMethod, productIds, totalamout } =
    req.body;

  try {
    const token = req.cookies.user_jwt;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const exactAddress = user.address.find(
      (addr) => addr._id.toString() === selectedAddressId
    );

    if (!exactAddress) {
      return res.status(404).json({ error: "Address not found" });
    }

    // Find only the products whose IDs match the provided productIds within the 'products' array field
    const products = await Products.find();

    // console.log(products);

    if (!products || products.length === 0) {
      return res.status(404).json({ error: "Products not found" });
    }

    let exactProducts = [];
    let cartProduct = null;

    // let totalAmount ='' ;
    // let totalPrice =[];
    let quantity = [];

    if (productIds.length === 1) {
      cartProduct = user.cart.products.find(
        (p) => p.productId.toString() === productIds[0]
      );

      //    console.log("cartProduct",cartProduct);
    } else {
      cartProduct = user.cart.products.filter((product) =>
        productIds.includes(product.productId.toString())
      );
    }
    if (!cartProduct) {
      console.log("doooooi");
      const productId = productIds[0];

      for (const product of products) {
        if (product._id.toString() === productId) {
          // product.stockcount-1

          exactProducts.push(product);
          if (product.stockcount > 0) {
            product.stockcount -= 1;
            await product.save();
          } else {
            // If the stockcount is already 0, do something (like logging or throwing an error)
          }
          break;
        }
      }
    } else {
      for (const productId of productIds) {
        const cartProduct = user.cart.products.find(
          (p) => p.productId.toString() === productId
        );

        if (cartProduct) {
          const product = await Products.findById(productId);
          // console.log("aaaaaaaaaaaaaaaaa");
          if (product && !product.disable) {
            exactProducts.push(product);

            const cartQuantity = cartProduct.quantity;

            quantity.push(cartQuantity);
            if (product.stockcount > 0) {
              product.stockcount -= 1;
              await product.save();
            } else {
              // If the stockcount is already 0, do something (like logging or throwing an error)
            }
          }
        } else {
          const product = await Products.findById(productId);
          if (product && !product.disable) {
            exactProducts.push(product);
          }
        }
      }
    }

    console.log(selectedPaymentMethod);

    const sanitizedTotalAmount = isNaN(totalamout) ? 0 : totalamout;

    console.log(exactProducts);

    // console.log(exactProducts);

    if (selectedPaymentMethod === "Prepaid") {
      try {
        // Generate Razorpay order (assuming this function returns the order details)
        console.log("ooooooooooooooooooooooooooook");
        const razorpayResponse = await helpers.generateRazorpay(
          user._id,
          sanitizedTotalAmount
        );

        // Sending response with necessary data to client
        return res.json({
          razorpayResponse: razorpayResponse,
          exactProducts: exactProducts,
          exactAddress: exactAddress,
          selectedPaymentMethod: selectedPaymentMethod,
          sanitizedTotalAmount: sanitizedTotalAmount,
          quantity: quantity,
        });
      } catch (error) {
        console.error("Error generating Razorpay order:", error);
        return res
          .status(500)
          .json({ error: "Error generating Razorpay order" });
      }
    } else if (selectedPaymentMethod === "Cash On Delivery") {
      // Add the new order to the user's orders array
      user.orders.push({
        products: exactProducts.map((product, index) => ({
          productId: product._id,
          name: product.productName,
          category: product.category,
          qty: quantity[index], // Use quantity from the quantities array
          price: product.productPrice,
          image: product.image,
          
        })),
        totalAmount: sanitizedTotalAmount,
        orderDate: new Date(),
        shippingAddress: exactAddress,
        paymentMethod: selectedPaymentMethod,
        orderStatus: "Pending",
        cancelReason: null,
      });

      // Save the updated user document
      await user.save();

      // await sendOrderConfirmationEmail(exactAddress.email, {
      //     orderId:user.orders[user.orders.length - 1]._id, // You can use actual order ID
      //     totalAmount: sanitizedTotalAmount,
      //     paymentMethod: selectedPaymentMethod,
      //     shippingAddress: exactAddress.address, // Modify this according to your address structure
      // });

      res.json({ message: true });
    } else {
      return res.status(400).json({ error: "Invalid payment method" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json("Internal Server Error");
  }
};

const saveorder = async (req, res) => {
  const {
    exactProducts,
    exactAddress,
    sanitizedTotalAmount,
    selectedPaymentMethod,
    quantity,
  } = req.body;

  const token = req.cookies.user_jwt;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (!decoded || !decoded.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const user = await User.findById(decoded.id);

  // console.log(user);

  user.orders.push({
    products: exactProducts.map((product, index) => ({
      productId: product._id,
      name: product.productName,
      category: product.category,
      qty: quantity[index], // Use quantity from the quantities array
      price: product.productPrice,
      image: product.image,
      
    })),
    totalAmount: sanitizedTotalAmount,
    orderDate: new Date(),
    shippingAddress: exactAddress,
    paymentMethod: selectedPaymentMethod,
    orderStatus: "Pending",
    cancelReason: null,
  });

  // Save the updated user document
  await user.save();

  // await sendOrderConfirmationEmail(exactAddress.email, {
  //     orderId:user.orders[user.orders.length - 1]._id, // You can use actual order ID
  //     totalAmount: sanitizedTotalAmount,
  //     paymentMethod: selectedPaymentMethod,
  //     shippingAddress: exactAddress.address, // Modify this according to your address structure
  // });

  res.json(true); // Send a success response
};

// async function sendOrderConfirmationEmail(userEmail, orderDetails, orderStatus) {
//     try {
//         // Create a Nodemailer transporter using SMTP
//         console.log("ook");
//         const subject = orderStatus ? `${orderStatus} Your Order Details` : 'Your Order Details';

//         let transporter = nodemailer.createTransport({
//             service: 'gmail',
//             auth: {
//                 user: 'your_email@gmail.com',
//                 pass: 'your_password',
//             },
//         });

//         // Send mail with defined transport object
//         let info = await transporter.sendMail({
//             from: '"Pure Glow" <ihsantk786313@gmail.com>',
//             to: userEmail,
//             subject: subject,
//             html: `<h1>${orderStatus ? orderStatus : ''} Your Order Details</h1>
//                 <p>Thank you for your order!</p>
//                 <p>Order ID: ${orderDetails.orderId}</p>
//                 <p>Total Amount: ${orderDetails.totalAmount}</p>
//                 <p>Payment Method: ${orderDetails.paymentMethod}</p>
//                 <p>Shipping Address: ${orderDetails.shippingAddress}</p>
//                 <p>...</p>`,
//         });

//         console.log('Message sent: %s', info.messageId);
//     } catch (error) {
//         console.error('Error sending email:', error);
//     }
// }

const coupenmanage = async (req, res) => {
  try {
    let { selectedCoupon, totalamout } = req.body;

    console.log(selectedCoupon);
    const couponDetails = await Admin.findOne(
      { "coupons.couponCode": selectedCoupon },
      "coupons.$"
    );

    if (!couponDetails) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }

    // Access the matched coupon details from couponDetails.coupons[0]
    const matchedCoupon = couponDetails.coupons[0];

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Set the time to 00:00:00
    
    console.log(currentDate);
    console.log(matchedCoupon.endDate);
    
    if (
        matchedCoupon.endDate &&
        currentDate >= new Date(matchedCoupon.endDate)
    ) {
        return res.json({ success: false, message: "Coupon has expired" });
    }

    // Check the coupon type (Fixed Amount or Percentage)
    if (matchedCoupon.couponType === "Fixed Amount") {
      totalamout -= matchedCoupon.discountValue;
    } else if (matchedCoupon.couponType === "Percentage") {
      const discountAmount = (totalamout * matchedCoupon.discountValue) / 100;
      totalamout -= discountAmount;
    }

    console.log(totalamout);
    res.json({
      success: true,
      message: "Coupon applied successfully",
      adjustedTotalAmount: totalamout,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
const ordermanage = async (req, res) => {
    const token = req.cookies.user_jwt;
    try{
  

  if (!token) {
    return res.redirect("/login");
  }

  // Verify the JWT token to get user ID
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (!decoded || !decoded.id) {
    return res.redirect("/login");
  }
  const user = await User.findById(decoded.id);

  if (!user) {
    return res.redirect("/login"); // Redirect if user not found
  }

  // Extracting products from each order
  const userProducts = user.orders.map((order) => order.products).flat();

  // Sort user orders by orderDate in descending order
  const sortedUserOrders = user.orders.sort(
    (a, b) => b.orderDate - a.orderDate
  );

  const userOrders = sortedUserOrders.map((order) => {
    return {
      products: order.products,
      totalAmount: order.totalAmount, 
      orderDate: order.orderDate,
      expectedDeliveryDate: order.expectedDeliveryDate,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      orderStatus:order.orderStatus,
      cancelReason:order.cancelReason,
      orderID:order._id 
    };
  });

  console.log(userOrders);
  // Count total items in the cart
  const totalCartCount = user.cart.products.length;

  // Render the order page after all necessary data is processed
  res.render("user/orders", {
    products: userProducts,
    userOrders,
    totalCartCount,
  });
}catch (error){
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
}


const cancellreson = async (req, res) => {
    try {
      const orderId = req.params.id;
      const token = req.cookies.user_jwt;

      console.log(orderId);
      console.log(req.body.cancelReason);
  
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }
  
      // Verify the JWT token to get user ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded || !decoded.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }
  
      // Find the user by ID and update the order with the specified orderId
      const updatedUser = await User.findOneAndUpdate(
        { _id: decoded.id, "orders._id": orderId },
        { $set: { "orders.$.orderStatus": "cancelled", "orders.$.cancelReason": req.body.cancelReason } },
        { new: true }
      ); 
   
      if (!updatedUser) {
        return res.status(404).json({ error: "User or order not found" });
      }
  
      // Update product stock count in Products collection
      const order = updatedUser.orders.find(order => order._id.toString() === orderId);
 
      // Get all product IDs from the order
      const productIds = order.products.map(product => product.productId);

      // Increment stock count for each product
      for (const productId of productIds) {
        const product = await Products.findById(productId);
        if (product) {
            product.stockcount += 1;
            await product.save(); 
        }
    } 
  
      res.redirect("/orders");
    } catch (error) {
      console.error("Error:", error);
      res.status(500).send("Internal Server Error");
    }
  };

const getShopProducts = async (req, res) => {
  try {
    const { search } = req.query;
    const sortingOption = req.query.sorting;

    let categorProducts = [];
    let uniqueCategories = [];

    if (search && search.trim().length >= 3) {
      const searchTerm = new RegExp(search, "i"); // Case-insensitive search term

      const data = await Products.find({
        $or: [{ category: searchTerm }, { productName: searchTerm }],
      });

      uniqueCategories = await Products.distinct("category");

      categorProducts = data;
    } else {
      return res.render("user/shop", {
        errorMessage: "Products Not Found !",
        categor: categorProducts,
        uniqueCategories,
        cartcount: req.cartcount,
        user: req.user,
        totalCartCount: req.totalCartCount,
      });
    }

    let user = undefined;
    if (req.cookies.user_jwt) {
      jwt.verify(
        req.cookies.user_jwt,
        process.env.JWT_SECRET,
        async (err, decodedToken) => {
          if (!err) {
            req.user = decodedToken;
            user = await User.findOne({ _id: req.user.id });
          }
          if (categorProducts.length > 0) {
            return res.render("user/shop", {
              categor: categorProducts,
              uniqueCategories,
              cartcount: req.cartcount,
              user,
              totalCartCount: req.totalCartCount,
              errorMessage: req.errorMessage,
            });
          } else {
            return res.render("user/shop", {
              errorMessage: "Products Not Found !",
              categor: categorProducts,
              uniqueCategories,
              cartcount: req.cartcount,
              user,
              totalCartCount: req.totalCartCount,
            });
          }
        }
      );
    } else {
      if (categorProducts.length > 0) {
        return res.render("user/shop", {
          categor: categorProducts,
          uniqueCategories,
          totalCartCount: req.totalCartCount,
          cartcount: req.cartcount,
          user,
        });
      } else {
        return res.render("user/shop", {
          errorMessage: "Products Not Found!",
          categor: categorProducts,
          uniqueCategories,
          cartcount: req.cartcount,
          user,
          totalCartCount: req.totalCartCount,
        });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const shopsorting = async (req, res) => {
  try {
    const category = req.params.category;
    const sortingOption = req.query.sorting;

    console.log("lllll");
    console.log(category);
    console.log(sortingOption);

    // Define filter based on category
    const filter = { category: category };

    // Define sort criteria based on sorting option
    const sortCriteria = {};
    if (sortingOption === "lowToHigh") {
      sortCriteria.productPrice = 1; // Ascending order
    } else if (sortingOption === "highToLow") {
      sortCriteria.productPrice = -1; // Descending order
    }

    const categorProducts = await Products.find(filter).sort(sortCriteria);

    if (!categorProducts || categorProducts.length === 0) {
      return res.render("user/shop", {
        errorMessage: "Product Not Found",
        categor: categorProducts,
        uniqueCategories,
        cartcount: req.cartcount,
        user: req.user,
        totalCartCount: req.totalCartCount,
      });
    }
    let user = undefined;
    if (req.cookies.user_jwt) {
      jwt.verify(
        req.cookies.user_jwt,
        process.env.JWT_SECRET,
        async (err, decodedToken) => {
          if (!err) {
            req.user = decodedToken;
            user = await User.findOne({ _id: req.user.id });
          }
          res.json({ categor: categorProducts, user });
        }
      );
    } else {
      res.json({ categor: categorProducts, user });
    }
  } catch (error) {
    console.error("Error:", error);
    res.render("user/error404", { errormessage: "Product Not Available" });
  }
}; 




const downloadinvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        console.log(orderId);
        const token = req.cookies.user_jwt;

        if (!token) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Verify the JWT token to get user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Find the user by ID
        const user = await User.findById(decoded.id);

        // Find the order matching the orderId
        const matchingOrder = user.orders.find(order => order._id.toString() === orderId);

        // Handle if the order is not found
        if (!matchingOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Get all products from inside the order's products array
        const products = matchingOrder.products;

        let totalAmount = products.reduce((total, product) => total + product.price, 0);
        console.log(totalAmount);

        const options = {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: 'numeric',
            minute: 'numeric'
        };

        const formattedOrderDate = matchingOrder.orderDate.toLocaleString('en-US', options);
        // Generate HTML dynamically
        let invoiceHtml = `
        <html>
        <head>
            <style>
                /* Add your CSS styles here */
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    border: 1px solid #ccc;
                    border-radius: 10px;
                    background-color: #f9f9f9;
                }
                h1 {
                    color: #333;
                    text-align: center;
                }
                #logo {
                    color: green;
                    text-align: center;
                    margin-bottom: 20px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                th, td {
                    padding: 8px;
                    border: 1px solid #ddd;
                }
                th {
                    background-color: #f2f2f2;
                }
                .total {
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Invoice</h1>
                <h1 id="logo">Pure Glow</h1>
                <p>Order ID: ${matchingOrder._id}</p>
                <p>Order Date: ${matchingOrder.orderDate}</p>
                <p>Invoice Date: ${formattedOrderDate}</p>
                <p>Payment mode: ${matchingOrder.paymentMethod}</p>
                <hr>
                <h4>Sold by</h4>
                <p>admin address</p>
                <hr>
                <h4>Shipping Address</h4>
                <p>${matchingOrder.shippingAddress.name}<br>
                   ${matchingOrder.shippingAddress.address}<br>
                   ${matchingOrder.shippingAddress.city}
                   ${matchingOrder.shippingAddress.district}<br>
                   ${matchingOrder.shippingAddress.state}
                   ${matchingOrder.shippingAddress.pincode}</p>
                <hr>
                <h4>Item Details</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Quantity</th>
                            <th>Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(product => `
                            <tr>
                                <td>${product.name}</td>
                                <td>${product.qty}</td>
                                <td>₹${product.price}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <hr>
              
                <p class="total">Discount: ₹${totalAmount-matchingOrder.totalAmount}</p>
               
                <p class="total">Total Amount: ₹${matchingOrder.totalAmount}</p>
            </div>
        </body>
        </html>
        `;

        const browser = await puppeteer.launch();

        // Create a new page
        const page = await browser.newPage();

        // Set HTML content for the page
        await page.setContent(invoiceHtml);

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4', // or 'Letter' or any other format
            printBackground: true // Include background graphics
        });

        // Close the browser
        await browser.close();

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice.pdf"`);

        // Send PDF buffer as response
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};





async function sendOTP(req, res) {
  const { email } = req.body;

  try {
    // Check if the email already exists in the User collection
    const existingUser = await User.findOne({ email });

    console.log(existingUser);

    if (existingUser) {
      // If the email exists, return a response indicating that the user already exists
      return res.status(400).json({ message: "User already exists " });
    }

    // If the email doesn't exist, generate OTP and send it
    const otp = otpService.generateOTP();
    otpService.otpMap.set(email, otp.toString());
    await otpService.sendOTP(email, otp);

    // Send a success response
    res.sendStatus(200);
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: error.message });
  }
}

const signupwithotp = async (req, res) => {
  const { email, otp, formData } = req.body;
  console.log(email, otp, formData);

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });

    console.log(existingUser);

    if (existingUser) {
      return res.status(400).json({ message: "User already exists " });
    }

    // Verify OTP
    const isOTPValid = otpService.verifyOTP(email, otp);

    if (!isOTPValid) {
      return res
        .status(400)
        .json({ message: "Invalid OTP. Please sign up again." });
    }

    // Extract form data
    const { name, phoneNumber, password } = formData;

    // Hash the password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create a new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
    });

    // Save the new user to the database
    await newUser.save();

    // Generate JWT token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    // Set JWT token in the cookie
    res.cookie("user_jwt", token, { httpOnly: true });

    // Redirect the user to the homepage or any desired page after successful signup
    res.redirect("/");
  } catch (error) {
    console.error("Error signing up:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

async function succesGoogleLogin(req, res) {
  try {
    if (!req.user) {
      return res.redirect("/failure");
    }

    console.log("Google Login Email:", req.user.email);
    console.log("Google Profile:", req.user.profile);

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
      console.log("User Data Saved.");
    }

    // Find the user again to ensure we have the latest data
    const newUser = await User.findById(user._id);

    console.log(newUser);

    // Generate JWT token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    res.cookie("user_jwt", token, { httpOnly: true });

    return res.redirect("/"); // Redirect to the profile page after successful login
  } catch (error) {
    console.error("Error in Google authentication:", error);
    return res.redirect("/failure");
  }
}

// Failure route handler after Google login
function failureGooglelogin(req, res) {
  res.send("Error");
}

let googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});

module.exports = {
  Homepage,
  userprofilepage,
  loginpage,
  blockpage,
  dataslogin,
  signuppage,
  logout,
  editpassword,
  editprofile,
  deleteProfileImage,
  shoppage,
  newproducts,
  getproductdetails,
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
  addaddresscheckout,
  addressdelete,
  editaddress,
  editAddressFormcheckout,
  placeholder,
  saveorder,
  coupenmanage,
  ordermanage,
  getShopProducts,
  shopsorting,
  downloadinvoice,
  cancellreson,
  signupwithotp,
  sendOTP,
  succesGoogleLogin,
  failureGooglelogin,
  googleAuth,
};
