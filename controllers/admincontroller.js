
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const Products = require('../models/Products');
const Admin = require('../models/admin');
const multer =  require('multer')
const cloudinary = require('../config/cloudinary')
const upload = require('../config/multer.js');
require('dotenv').config()



const loginpage = (req, res) => {
    const token = req.cookies.admin_jwt;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded && decoded.id) {
                // Token is valid, redirect to admin dashboard
                return res.redirect('/admin');
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }
    // If no token or invalid token, render login page
    res.render('admin/login');
};

const admindashbord = async (req, res) => {
    const token = req.cookies.admin_jwt;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded && decoded.id) {
                // Count users where orders field is not null
                let countUsersWithOrders = await User.countDocuments({ orders: { $ne: null } });

                // Aggregate to count the total number of orders across all users
                let totalOrdersCount = await User.aggregate([
                    { 
                        $match: { orders: { $exists: true, $ne: null } } // Match documents where orders field exists and is not null
                    },
                    {
                        $group: {
                            _id: null,
                            totalOrders: { $sum: { $size: "$orders" } } // Sum the size of orders array for each user
                        }
                    }
                ]);
            
                    const latestOrders = await User.aggregate([
                        {
                            $match: {
                                orders: { $exists: true, $ne: null } // Filter users with non-empty orders
                            }
                        }, 
                        {
                            $unwind: "$orders" // Deconstruct the orders array
                        },
                        {
                            $project: {
                                _id: "$orders._id", // Exclude the default MongoDB ID field
                                userId: "$_id", // Include the userId for reference
                                paymentMethod: "$orders.paymentMethod",
                                orderDate: "$orders.orderDate",
                                shippingAddress: "$orders.shippingAddress",
                                products: "$orders.products"
                            }
                        },
                        {
                            $sort: { orderDate: -1 } // Sort by orderDate in descending order (latest first)
                        },
                        {
                            $limit: 10 // Limit to only the latest 10 orders
                        }
                    ]);

                    console.log( latestOrders);
            
                    // console.log(usersWithOrders);
            
                    // res.render('admin/order-list', { orders: usersWithOrders }); // Pass orders as a variable to the template
                
                // console.log(countUsersWithOrders);
                // console.log(totalOrdersCount[0].totalOrders);

                let product = await Products.findOne();


                let productcount = product.products.length
 
                console.log(productcount);

                return res.render('admin/index', { countUsersWithOrders, latestOrders, totalOrdersCount: totalOrdersCount.length > 0 ? totalOrdersCount[0].totalOrders : 0,productcount });
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }
    // If no token or invalid token, redirect to admin login
    res.redirect('/adminlogin');
};

const logindatas = async (req, res) => {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (admin && admin.password === password) {
        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
        res.cookie('admin_jwt', token, { httpOnly: true });
        res.redirect('/admin');
    } else {
        res.redirect('/adminlogin');
    }
};

let blockuser = async (req, res) => {
    const userId = req.body.userId;
    try {
        const user = await User.findById(userId);
        if (user) {
            user.blocked = !user.blocked; // Toggle block status
            await user.save();
        }
        res.redirect('/userlist');
    } catch (error) {
        console.error('Error toggling user block status:', error);
        res.status(500).send('Error toggling user block status');
    }
}

let userslist = async (req, res) => {

   
    try {
        const data = await User.find();
        res.render('admin/customers', { data });
    } catch (error) {
        console.error('Error retrieving users:', error);
        res.status(500).send('Error retrieving users');
    }

    
 
}

let renderindexblock =(req, res) => {
    res.render('user/index');
}

let categorilist = async(req,res)=>{

    let products = await Products.find();
    if(!products ){
        res.status(400).send('Admin not found');
    }
    let data= products[0].categories.map(category => category);
    res.render('admin/categorie-list',{data});
   
}

let categoriesadd= async(req,res)=>{ 

    res.render('admin/categories-add')

}

const updatecategory = async (req, res) => {
    try {
        const { name } = req.body;

        let product = await Products.findOne();

        if (!product) {
            return res.status(400).send('Admin not found');
        }

       let data =  product.categories.push({ categoryName: name });
       
        await product.save();

        res.redirect('/categorie-list')
           
    
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}; 

let categorieedit = async (req, res) => {
    try {
        // Access the ID parameter from the URL
        const id = req.params.id;
   
        const product = await Products.findOne({ 'categories._id': id });

        if (!product) {
            return res.status(404).json({ error: "Admin not found" });
        }

     const category =  product.categories.find(catgorie => catgorie._id == id);

     res.render('admin/categories-edit', { category })
         
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

let categorieeditdatas = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const newName = req.body.newName;

        const product = await Products.findOne({ 'categories._id': categoryId });

        if (!product) {
            return res.status(404).json({ error: "Admin not found" });
        }

        const category = product.categories.find(cat => cat._id == categoryId);

        category.categoryName = newName;
  
        await product.save();

       res.redirect('/categorie-list')
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

let deletecategorie = async (req, res) => {
    try {
      
        const categoryId= req.params.id;
       
        const product = await Products.findOneAndUpdate(
            { 'categories._id': categoryId }, 
            { $pull: { categories: { _id: categoryId } } }, 
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.redirect('/categorie-list')
       
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
let productlist = async (req, res) => {
  
        try {
            let product = await Products.findOne();
            let products = product.products;

            // Pagination logic
            const page = parseInt(req.query.page) || 1; // Get page number from query parameter or default to 1
            const ITEMS_PER_PAGE = 9; // Number of products to display per page
            const startIndex = (page - 1) * ITEMS_PER_PAGE;
            const endIndex = page * ITEMS_PER_PAGE;
            const totalProducts = products.length;
            const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

            // Slice products array to get products for the current page
            const productsForPage = products.slice(startIndex, endIndex);

            res.render('admin/product-grid', { products: productsForPage, totalPages, currentPage: page });

            if (!product) {
                return res.status(404).json({ error: "Product not found" });
            }
        } catch (error) {
            console.log(error);
            res.render('admin/product-add',{data:req.data})
        }
    
};

 
 let productadd = async(req,res)=>{
 
    let data = await Products.findOne();
  
      res.render('admin/product-add',{data});

 }
 const AddProductlist = async (req, res) => {
    // console.log("req.body :", req.body);
    // console.log("req.files :", req.files);
    const imageData = req.files || [];
    const productData = req.body;

    try {
        const { ProductName, Price, description, Category } = productData;
        const imageUrls = [];

        for (const file of imageData) {
            const result = await cloudinary.uploader.upload(file.path);
            imageUrls.push(result.secure_url);
        }

        // console.log("imageUrls:", imageUrls);

        const newProduct = {
            productName: ProductName,
            productPrice: Price,
            description: description,
            category: Category,
            image: imageUrls
        };

        let product = await Products.findOne();
        
        if (!product) {
            return res.status(400).send('Product not found');
        }

        product.products.push(newProduct);
        await product.save();

        res.redirect('/product-list');
        
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};

  let productedit = async (req,res)=>{
            
   
    try {
        
        const id = req.params.id;
     
        const product = await Products.findOne({ 'products._id': id });

        if (!product) {
            return res.status(404).json({ error: "Admin not found" });
        }

     const data= product.products.find(product => product._id == id);

     res.render('admin/product-edit', { data })
         
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
  }
   
  const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { ProductName, Price, description, category } = req.body;
        const imageData = req.files || [];

        

        // Check if new images are uploaded
        if (imageData.length > 0) {
            let imageUrls = [];

            // If new images are uploaded, upload them to cloudinary
            for (const file of imageData) {
                const result = await cloudinary.uploader.upload(file.path);
                imageUrls.push(result.secure_url);
            }

            // Update product details including images
            const product = await Products.findOneAndUpdate(
                { 'products._id': productId },
                {
                    $set: {
                        'products.$.productName': ProductName,
                        'products.$.productPrice': Price,
                        'products.$.description': description,
                        'products.$.category': category,
                        'products.$.image': imageUrls
                    }
                },
                { new: true }
            );

            if (!product) {
                return res.status(404).json({ error: "Product not found" });
            } 

            res.redirect('/product-list');
        } else {
            // If no new images uploaded, update only other product details
            const product = await Products.findOneAndUpdate(
                { 'products._id': productId },
                {
                    $set: {
                        'products.$.productName': ProductName,
                        'products.$.productPrice': Price,
                        'products.$.description': description,
                        'products.$.category': category
                    }
                },
                { new: true }
            );

            if (!product) {
                return res.status(404).json({ error: "Product not found" });
            } 

            res.redirect('/product-list');
        }
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

const deleteproduct = async (req,res)=>{
        
    try {
        const productId= req.params.id;
       
        const product = await Products.findOneAndUpdate(
            { 'products._id': productId }, 
            { $pull: { products: { _id: productId } } }, 
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ error: "Admin not found" });
        }
        res.redirect('/product-list')
       
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
const productdisable = async (req, res) => {
    try {
        let productId = req.params.id;

        let product = await Products.findOne({ products: { $elemMatch: { _id: productId } } });

        if (product) {
            const productIndex = product.products.findIndex(p => p._id.toString() === productId);
            console.log(productIndex);
            if (productIndex !== -1) {
                // Toggle the disable property
                product.products[productIndex].disable = !product.products[productIndex].disable;
                await product.save(); // Save the changes
                res.status(200).json({ message: "Product disabled status updated successfully" });
            } else {
                res.status(404).json({ message: "Product not found in array" });
            }
        } else {
            res.status(404).json({ message: "Product not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
}
const adminprofile =(req,res)=>{
       
 res.render('admin/admin-profile')
  

}
const productdetiel = async (req, res) => {
    try {
        let productId = req.params.id;
        let product = await Products.findOne({ 'products._id': productId });

        if (!product) {
            return res.status(404).send('Product not found');
        }
        const data= product.products.find(product => product._id == productId);

        console.log(data);
        res.render('admin/product-detail', { product:data}); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}

const orderslist = async (req, res) => {  
    try {
        const usersWithOrders = await User.aggregate([
            {
                $match: {
                    orders: { $exists: true, $ne: null } // Filter users with non-empty orders
                }
            }, 
            {
                $unwind: "$orders" // Deconstruct the orders array
            },
            {
                $project: {
                    _id: "$orders._id", // Exclude the default MongoDB ID field
                    userId: "$_id", // Include the userId for reference
                    paymentMethod: "$orders.paymentMethod",
                    orderDate: "$orders.orderDate",
                    shippingAddress: "$orders.shippingAddress",
                    products: "$orders.products"
                }
            }
        ]);

        // console.log(usersWithOrders);

        res.render('admin/order-list', { orders: usersWithOrders }); // Pass orders as a variable to the template
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
}

const orederstatus = async (req, res) => {
    try {
        console.log("hi");

        // Extract order ID, product ID, and new status from request parameters and body
        const { orderId, productId, newStatus } = req.body;
        console.log("orderid", orderId, "productid", productId, newStatus);

        // Find the user based on the order ID
        const user = await User.findOne({ 'orders._id': orderId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Find the order within the user's orders array based on order ID
        const order = user.orders.find(order => order._id.toString() === orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
 
        // Find the product within the order based on product ID
        const product = order.products.find(product => product._id.toString() === productId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found in order' });
        } 

        // Update the order status for the specific product
        product.orderStatus = newStatus;

        // Save the updated user document
        await user.save();

        // Redirect to the orders list page
        res.redirect('/orederslist');

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};




const adminlogout = (req, res) => {
    res.clearCookie('admin_jwt'); // Clear the JWT token stored in cookies
    res.redirect('/adminlogin');
};

module.exports={
    loginpage,
    admindashbord,
    logindatas,
    blockuser,
    userslist,
    renderindexblock,
    categorilist,
    categoriesadd,
    updatecategory,
    categorieedit,
    categorieeditdatas, 
    deletecategorie,
    productlist,
    productadd,
    AddProductlist,
    productedit,
    updateProduct,
    deleteproduct,
    productdisable,
    adminprofile,
    productdetiel,
    orderslist,
    orederstatus,
    adminlogout,
    
}