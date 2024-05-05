
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const Products = require('../models/Products');
const Admin = require('../models/admin');
const multer =  require('multer')
const cloudinary = require('../config/cloudinary')
const upload = require('../config/multer.js');
require('dotenv').config();
const puppeteer = require('puppeteer');



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
                let countUsersWithOrders = await User.countDocuments();

                // Aggregate to count the total number of orders across all users
                let totalOrdersCount = await User.aggregate([
                    { 
                        $match: { orders: { $exists: true, $ne: null } } 
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
                            orders: { $exists: true, $ne: null }
                        }
                    }, 
                    {
                        $unwind: "$orders" 
                    },
                    {
                        $project: {
                            _id: "$orders._id",
                            userId: "$_id",
                            paymentMethod: "$orders.paymentMethod",
                            orderDate: "$orders.orderDate",
                            shippingAddress: "$orders.shippingAddress",
                            products: "$orders.products",
                            totalAmount: "$orders.totalAmount",
                            orderStatus: "$orders.orderStatus"
                        }
                    },
                    {
                        $sort: { orderDate: -1 } // Sort by orderDate in ascending order
                    },
                    {
                        $limit: 10 
                    }
                ]);

                    const latestOrdersforcategory = await User.aggregate([
                        {
                            $match: {
                                orders: { $exists: true, $ne: null } 
                            }
                        },
                        {
                            $unwind: "$orders" 
                        },
                        {
                            $unwind: "$orders.products" 
                        },
                        {
                            $group: {
                                _id: "$orders.products.category", 
                                count: { $sum: 1 } 
                            }
                        }
                    ]);
                    
                    let orderCounts = {};
                    
                    latestOrdersforcategory.forEach(category => {
                        orderCounts[category._id] = category.count;
                    });
                    
                   

                    const monthlyOrderCounts = await User.aggregate([
                        {
                            $match: {
                                orders: { $exists: true, $ne: null } 
                            }
                        },
                        {
                            $unwind: "$orders"
                        },
                        {
                            $group: {
                                _id: {
                                    year: { $year: "$orders.orderDate" },
                                    month: { $month: "$orders.orderDate" }
                                },
                                count: { $sum: 1 }
                            }
                        }
                    ]);
    
                    let monthlyOrderCountsData = {};
                monthlyOrderCounts.forEach(count => {
                    const year = count._id.year;
                    const month = count._id.month;
                    if (!monthlyOrderCountsData[year]) {
                        monthlyOrderCountsData[year] = {};
                    }
                    // Convert month number to month name
                    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                    const monthName = monthNames[month - 1]; // Month numbers are 1-based
                    monthlyOrderCountsData[year][monthName] = count.count;
                });

    
                 
           
console.log(latestOrders); 

                const count = await Products.countDocuments();

                return res.render('admin/index', { 
                    countUsersWithOrders,
                    orderCounts , // Serialize the object
                    monthlyOrderCountsData,
                    latestOrders, 
                    totalOrdersCount: totalOrdersCount.length > 0 ? totalOrdersCount[0].totalOrders : 0,
                    productcount: count 
                });            }
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

let categorilist = async(req, res) => {
    try {
        // Find the admin document
        const admin = await Admin.findOne();

        // If admin document not found, send error response
        if (!admin) {
            return res.status(400).send('Admin not found');
        }

        // Extract categories array from the admin document
        const categories = admin.categories

        console.log( categories);

        // Render the categories list view with the categories data
        res.render('admin/categorie-list', { data:categories });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
let categoriesadd= async(req,res)=>{ 

    res.render('admin/categories-add')

}
const updatecategory = async (req, res) => {
    try {
        const { name } = req.body;

        // Find the admin document
        let admin = await Admin.findOne();

        if (!admin) {
            return res.status(400).send('Admin not found');
        }

        // Push the new category to the categories array
        admin.categories.push({ categoryName: name });

        // Save the updated admin document
        await admin.save();

        res.redirect('/categorie-list');
    
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}; 

const categorieedit = async (req, res) => {
    try {
        // Access the ID parameter from the URL
        const id = req.params.id;

        // Find the admin document containing the category to edit
        const admin = await Admin.findOne({ 'categories._id': id });

        // If admin document not found, send error response
        if (!admin) {
            return res.status(404).json({ error: "Admin not found" });
        }

        // Find the category to edit in the categories array
        const category = admin.categories.find(category => category._id == id);

        // If category not found, send error response
        if (!category) {
            return res.status(404).json({ error: "Category not found" });
        }

        // Render the categories edit page with the category data
        res.render('admin/categories-edit', { category });
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const categorieeditdatas = async (req, res) => {
    try {
        // Access the category ID from the URL
        const categoryId = req.params.id;
        // Access the new category name from the request body
        const newName = req.body.newName;

        // Find the admin document
        const admin = await Admin.findOne();

        // If admin document not found, send error response
        if (!admin) {
            return res.status(404).json({ error: "Admin not found" });
        }

        // Find the category to edit in the categories array
        const category = admin.categories.find(cat => cat._id == categoryId);

        // If category not found, send error response
        if (!category) {
            return res.status(404).json({ error: "Category not found" });
        }

        // Update the categoryName with the new name
        category.categoryName = newName;

        // Save the modified admin document
        await admin.save();

        // Redirect to the categories list page
        res.redirect('/categorie-list');
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

let deletecategorie = async (req, res) => {
    try {
      
        const categoryId= req.params.id;
       
        const category = await Admin.findOneAndUpdate(
            { 'categories._id': categoryId }, 
            { $pull: { categories: { _id: categoryId } } }, 
            { new: true }
        );

        if (!category) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.redirect('/categorie-list')
       
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
const productlist = async (req, res) => {
    try {
        // Find all products from the Products collection
        const products = await Products.find();

        // Pagination logic
        const page = parseInt(req.query.page) || 1; // Get page number from query parameter or default to 1
        const ITEMS_PER_PAGE = 9; // Number of products to display per page
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = page * ITEMS_PER_PAGE;
        const totalProducts = products.length;
        const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

        // Slice products array to get products for the current page
        const productsForPage = products.slice(startIndex, endIndex);

        // Render the product grid list page with the products for the current page
        res.render('admin/product-grid', { products: productsForPage, totalPages, currentPage: page });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).render('error', { errorMessage: "Internal Server Error" });
    }
};
 
 let productadd = async(req,res)=>{
 
    let data = await Admin.findOne();

    let category = data.categories
  
      res.render('admin/product-add',{category});
 
 }
 const AddProductlist = async (req, res) => {
    const imageData = req.files || [];
    const productData = req.body;

    try {
        const { ProductName, Price, description, Category,Stockcount } = productData;

        console.log(Stockcount);
        const imageUrls = [];

        // Upload images to cloudinary and get secure URLs
        for (const file of imageData) {
            const result = await cloudinary.uploader.upload(file.path);
            imageUrls.push(result.secure_url);
        }

        // Create a new product object
        const newProduct = new Products({
            productName: ProductName,
            productPrice: Price,
            description: description,
            category: Category,
            image: imageUrls,
            stockcount:Stockcount,
            addedAt: new Date() // Set the addedAt field to current time
        });

        // Save the new product document
        await newProduct.save();

        // Redirect to the product list page
        res.redirect('/product-list');
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const productedit = async (req, res) => {
    try {
        // Access the product ID from the URL
        const id = req.params.id;

        // Find the product document by its ID
        const product = await Products.findById(id);

        // If product document not found, send error response
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        // Render the product edit page with the product details
        res.render('admin/product-edit', { data: product });
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
   
const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { ProductName, Price, description, category,stockcount } = req.body;
        const imageData = req.files || [];

        let updateFields = {
            'productName': ProductName,
            'productPrice': Price,
            'description': description,
            'category': category,
            'stockcount':stockcount
        };

        // If new images are uploaded, upload them to Cloudinary and update image URLs
        if (imageData.length > 0) {
            let imageUrls = [];
            for (const file of imageData) {
                const result = await cloudinary.uploader.upload(file.path);
                imageUrls.push(result.secure_url);
            }
            updateFields['image'] = imageUrls;
        }

        // Update product details
        const product = await Products.findByIdAndUpdate(
            productId, // Find document by ID
            updateFields, // Update with new data
            { new: true } // Return the updated document
        );

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.redirect('/product-list');
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const deleteproduct = async (req, res) => {
    try {
        const productId = req.params.id;

        // Find the product by its _id and delete it
        const product = await Products.findByIdAndDelete(productId);

        // Check if product exists
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.redirect('/product-list');
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};



const productdisable = async (req, res) => {
    try {
        const productId = req.params.id;
        console.log(productId);
        // Find the product document containing the product with the given productId
        const product = await Products.findOne({ '_id': productId });

        console.log(product);

        if (product) {
                product.disable = !product.disable;
                // Save the changes to the database
                await product.save();
                return res.status(200).json({ message: "Product disabled status updated successfully" });
          
        } else {
            return res.status(404).json({ message: "Product not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};


const adminprofile =(req,res)=>{
       
 res.render('admin/admin-profile')
  

}

const productdetiel = async (req, res) => {
    try {
        let productId = req.params.id;
        let product = await Products.findOne({ '_id': productId });

        if (!product) {
            return res.status(404).send('Product not found');
        }
        res.render('admin/product-detail', { product}); 
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
                    _id: "$orders._id",
                    userId: "$_id",
                    paymentMethod: "$orders.paymentMethod",
                    orderStatus: "$orders.orderStatus",
                    totalAmount: "$orders.totalAmount",
                    orderDate: "$orders.orderDate",
                    shippingAddress: "$orders.shippingAddress",
                    products: "$orders.products",
                }
            },
            {
                $sort: { orderDate: -1 } // Sort by orderDate in descending order
            }
        ]);

        console.log(usersWithOrders);
        res.render('admin/order-list', { orders: usersWithOrders }); // Pass orders as a variable to the template
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
}
 
const orederstatus = async (req, res) => {
    try {
        const { orderId, productId, newStatus } = req.body;

        console.log(orderId, productId, newStatus);

        const user = await User.findOne({ 'orders._id': orderId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const order = user.orders.find(order => order._id.toString() === orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        
        const product = order.products.find(product => product.productId.toString() === productId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found in the order' });
        }

        // Update the orderStatus field of the product
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




const couponmanage = async (req, res) => {
    try {
        console.log("hi");
        
        // Find all coupons from the Admin collection
        const admin = await Admin.findOne({}, 'coupons');

        // Extract the coupons array from the admin document
        const coupons = admin ? admin.coupons : [];

        // Render the coupon list page and pass the coupons array
        res.render('admin/coupons-list', { coupons });
    } catch (error) {
        console.error(error); 
        res.status(500).send('Error retrieving coupon data.');
    }
};

const addcoupon =(req,res)=>{

    res.render('admin/coupon-add')
}

const addcoupondatas = async (req, res) => {
   

    // Access form data from req.body
    const formData = {
        couponsStatus: req.body.couponsstatus,
        endDate: req.body.enddate,
        couponCode: req.body.couponcode,
        couponType: req.body.couponstype,
        discountValue: req.body.discountvalue
    };

    try {
        // Directly push the form data into the coupons array of the specific admin document
        await Admin.updateOne(
            { /* Add your conditions to find the specific admin document */ },
            { $push: { coupons: formData } }
        );

        console.log('Coupon data saved successfully.');

        // Fetch all coupons from the database
        

        res.redirect('/coupon-manage');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error saving coupon data.');
    }
};

const editcoupon = async (req, res) => {
    try {
        const id = req.params.id;
        console.log("oook");

        const admin = await Admin.findOne({ 'coupons._id': id }, 'coupons');

        const coupon = admin.coupons.find(coupon => coupon._id == id);

       

        if (!coupon) {
            return res.status(404).send('Coupon not found.');
        }

        // Pass the found coupon data to the edit page
        res.render('admin/coupon-edit', { coupon });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching coupon data.');
    } 
};
const updateeditcoupon = async (req, res) => {
    try {
        const id = req.params.id;
        

        // Extract form data from request body
        const formData = {
            couponsStatus: req.body.couponsstatus,
            endDate: req.body.enddate,
            couponCode: req.body.couponcode,
            couponType: req.body.couponstype,
            discountValue: req.body.discountvalue
        };

        

        // Update the coupon data within the admin document
        const result = await Admin.updateOne(
            { 'coupons._id': id }, // Filter to find the admin document containing the specific coupon
            {
                $set: {
                    'coupons.$.couponsStatus': formData.couponsStatus,
                    'coupons.$.endDate': formData.endDate,
                    'coupons.$.couponCode': formData.couponCode,
                    'coupons.$.couponType': formData.couponType,
                    'coupons.$.discountValue': formData.discountValue
                }
            }
        );

        if (result.nModified === 0) {
            return res.status(404).send('Coupon not found.');
        }

        res.redirect('/coupon-manage');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating coupon data.');
    }
};

const deletecoupon = async (req, res) => {
    try {
        const id = req.params.id;
        console.log(id);

        // Delete the coupon from the coupons array in the Admin collection
        const result = await Admin.updateOne(
            { 'coupons._id': id }, 
            { $pull: { coupons: { _id: id } } } 
        );

        if (result.nModified === 0) {
            return res.status(404).send('Coupon not found.');
        }

        res.redirect('/coupon-manage');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting coupon.');
    }
};
const downloadOrdrReport = async (req, res) => {
    const { startdate, enddate } = req.body;

    try {
        // Convert startdate and enddate strings to Date objects
        const startDateObj = new Date(startdate);
        const endDateObj = new Date(enddate);

        // Adjust endDateObj to include the whole day
        endDateObj.setHours(23, 59, 59, 999);

        // Query to find orders between startdate and enddate
        let orders = await User.aggregate([
            {
                $match: { 
                    orders: { 
                        $exists: true, 
                        $ne: [] // Ensure orders array is not empty
                    }
                }
            },
            {
                $unwind: "$orders"
            },
            {
                $match: {
                    "orders.orderDate": {
                        $gte: startDateObj, // Greater than or equal to startDate
                        $lte: endDateObj    // Less than or equal to endDate
                    }
                }
            },
            {
                $project: {
                    _id: "$orders._id",
                    orderDate: "$orders.orderDate",
                    products: "$orders.products",
                    shippingAddress: "$orders.shippingAddress",
                    paymentMethod: "$orders.paymentMethod"
                }
            }
        ]);

        // console.log(orders);
        const options = {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: 'numeric', 
            minute: 'numeric',
            second: 'numeric'
        };
        
        const invoicedtae =  new Date().toLocaleString('en-US', options);

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
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .header h1 {
                    color: #333;
                    margin: 0;
                }
                .logo {
                    color: green;
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
                .order-details {
                    display: flex;
                    justify-content: space-between;
                }
                .address-details {
                    margin-top: 10px;
                }
                .payment-details {
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 class="logo">Order Ditiels</h1>
                    <p>Invoice Date: ${invoicedtae}</p>
                </div>
                <hr>
        `;
        
        // Loop through each order
        orders.forEach(order => {
            order.products.forEach(product => {
            const formattedOrderDate = order.orderDate.toLocaleString('en-US', options);
            
            // Add order details to HTML
            invoiceHtml += `
                <div class="order">
                    <div class="order-details">
                        <div>
                            <p>Order ID: ${order._id}</p>
                            <p>Order Date: ${formattedOrderDate}</p>
                            <p>Payment mode: ${order.paymentMethod}</p>
                            <p>Order Status: ${product.orderStatus}</p>
                        </div>
                        
                    </div>
                    
                    <h4>Shipping Address</h4>
                    <div class="address-details">
                        <p>${order.shippingAddress.name}</p>
                        <p>${order.shippingAddress.address}</p>
                        <p>${order.shippingAddress.city} ${order.shippingAddress.district}</p>
                        <p>${order.shippingAddress.state} ${order.shippingAddress.pincode}</p>
                    </div>
                    
                    <h4>Item Details</h4>
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Quantity</th>
                                <th>Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            // Loop through each product in the order
           
                // Add product details to HTML
                invoiceHtml += `
                    <tr>
                        <td>${product.name}</td>
                        <td>${product.qty}</td>
                        <td>${product.price}</td>
                        <td>₹${product.price*product.qty}</td>
                    </tr>
                `;
           
        
            // Close the table and add total amount for the order
            invoiceHtml += `
                        </tbody>
                    </table>
                </div>
                <hr>
            `;
        });
        });
        
        // Close the HTML
        invoiceHtml += `
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
        // Handle errors
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}






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
    couponmanage,
    addcoupon,
    addcoupondatas,
    editcoupon,
    updateeditcoupon,
    deletecoupon,
    downloadOrdrReport,
    adminlogout,
    
}