
const User = require('../models/user');
const Products = require('../models/Products');
const Admin = require('../models/admin');
const multer =  require('multer')
const cloudinary = require('../config/cloudinary')
const upload = require('../config/multer.js');
require('dotenv').config()




const loginpage =(req,res)=>{

    if (req.session.adminId) {
        res.redirect('/admin');
    } else {
        res.render('admin/login');
    }
 
}
const admindashbord = async (req, res) => {
    if (req.session.adminId) {
        res.render('admin/index');
    } else {
        res.redirect('/adminlogin');
    }
    

};

const logindatas = async (req, res) => {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (admin && admin.password === password) {
        req.session.adminId = admin._id;
        req.session.adminEmail = admin.email; // Store admin email in session
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

 let productlist = async(req,res)=>{

    try {
        let product = await Products.findOne();
        let products = product.products;

        
        res.render('admin/product-grid', { products });

        if (!product) {
            return res.status(404).json({ error: "product not found" });
        }
     
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }

 }
 let productadd = async(req,res)=>{

    let data = await Products.findOne();
  
      res.render('admin/product-add',{data});

 }
 const AddProductlist = async (req, res) => {
    console.log("req.body :", req.body);
    console.log("req.files :", req.files);
    const imageData = req.files || [];
    const productData = req.body;

    try {
        const { ProductName, Price, description, Category } = productData;
        const imageUrls = [];

        for (const file of imageData) {
            const result = await cloudinary.uploader.upload(file.path);
            imageUrls.push(result.secure_url);
        }

        console.log("imageUrls:", imageUrls);

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
        let updatedImages = [];

        // Check if new images are uploaded
        if (req.files && req.files.length > 0) {
            // Upload new images to Cloudinary
            for (const file of req.files) {
                const result = await cloudinary.uploader.upload(file.path);
                updatedImages.push(result.secure_url);
            }
        }

        // If new images are uploaded, update the product's images
        if (updatedImages.length > 0) {
            const product = await Products.findOneAndUpdate(
                { 'products._id': productId },
                {
                    $set: {
                        'products.$.productName': ProductName,
                        'products.$.productPrice': Price,
                        'products.$.description': description,
                        'products.$.category': category,
                        'products.$.image': updatedImages  // Replace existing images with updated ones
                    }
                },
                { new: true }
            );

            if (!product) {
                return res.status(404).json({ error: "Product not found" });
            }
        } else {
            // If no new images are uploaded, only update other product details
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
        }

        res.redirect('/product-list');
        
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

const adminlogout = (req, res) => {
    delete req.session.adminId;
    delete req.session.adminEmail;
    res.redirect('/adminlogin');
}

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
    adminlogout,
    
}