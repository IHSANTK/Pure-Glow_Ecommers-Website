
const User = require('../models/user');
const Admin = require('../models/admin');




let adminlogin = (req, res) => {
    if (req.session.adminId) {
        res.render('admin/index');
    } else {
        res.render('admin/login');
    }
}


let logindatas =  async (req, res) => {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (admin.email === email && admin.password === password) {
        req.session.adminId = admin._id;
        req.session.email = admin.email;
        res.render('admin/index');
    } else {
        res.redirect('/admin');
    }
}

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

    let admin = await Admin.find();
    if(!admin){
        res.status(400).send('Admin not found');
    }
    let data= admin[0].categories.map(category => category);
    res.render('admin/categorie-list',{data});
}

let categoriesadd= async(req,res)=>{

    res.render('admin/categories-add')

}

const updatecategory = async (req, res) => {
    try {
        const { name } = req.body;

        let admin = await Admin.findOne();

        if (!admin) {
            return res.status(400).send('Admin not found');
        }

       let data =  admin.categories.push({ categoryName: name });
       
        await admin.save();

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
   
        const admin = await Admin.findOne({ 'categories._id': id });

        if (!admin) {
            return res.status(404).json({ error: "Admin not found" });
        }

     const category = admin.categories.find(catgorie => catgorie._id == id);

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

        const admin = await Admin.findOne({ 'categories._id': categoryId });

        if (!admin) {
            return res.status(404).json({ error: "Admin not found" });
        }

        const category = admin.categories.find(cat => cat._id == categoryId);

        category.categoryName = newName;
  
        await admin.save();

       res.redirect('/categorie-list')
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

let deletecategorie = async (req, res) => {
    try {
      
        const categoryId= req.params.id;
       
        const admin = await Admin.findOneAndUpdate(
            { 'categories._id': categoryId }, 
            { $pull: { categories: { _id: categoryId } } }, 
            { new: true }
        );

        if (!admin) {
            return res.status(404).json({ error: "Admin not found" });
        }
        res.redirect('/categorie-list')
       
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

 let productlist = async(req,res)=>{

    try {
        let admin = await Admin.findOne();
        let products = admin.products;

        
        res.render('admin/product-grid', { products });

        if (!admin) {
            return res.status(404).json({ error: "Admin not found" });
        }
     
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }

 }
 let productadd = async(req,res)=>{

    let data = await Admin.findOne();
  
      res.render('admin/product-add',{data});

 }
 const AddProductlist = async (req, res) => {
    try {
        
        let {
            ProductName,
            Price,
            description,
            Category
        } = req.body;

        let newProduct = {
            productName: ProductName,
            productPrice: Price,
            description: description,
            category: Category
        };

        let admin = await Admin.findOne();
        if (!admin) {
            return res.status(400).send('Admin not found');
        }

        
        if (req.file) {
            newProduct.image = req.file.filename; 
        }

        admin.products.push(newProduct);
        await admin.save();

        
        res.redirect('/product-list');
        
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
  };
  let productedit = async (req,res)=>{
            
   
    try {
        
        const id = req.params.id;
     
        const admin = await Admin.findOne({ 'products._id': id });

        if (!admin) {
            return res.status(404).json({ error: "Admin not found" });
        }

     const data= admin.products.find(product => product._id == id);

     res.render('admin/product-edit', { data })
         
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
  }
   
  const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const newName = req.body.ProductName;
        const newPrice = req.body.Price;
        const description = req.body.description;
        const newImage = req.file ? req.file.filename : null; 

        const admin = await Admin.findOne({ 'products._id': productId });

        if (!admin) {
            return res.status(404).json({ error: "Admin not found" });
        }

        const product = admin.products.find(product => product._id == productId);

        product.productName = newName;
        product.productPrice = newPrice;
        product.description = description;
        if (newImage) { 
            product.image = newImage;
        }

        await admin.save();

        res.redirect('/product-list')
        
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

const deleteproduct = async (req,res)=>{
        
    try {
      
        const productId= req.params.id;
       
        const admin = await Admin.findOneAndUpdate(
            { 'products._id': productId }, 
            { $pull: { products: { _id: productId } } }, 
            { new: true }
        );

        if (!admin) {
            return res.status(404).json({ error: "Admin not found" });
        }
        res.redirect('/product-list')
       
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}




module.exports={
    adminlogin,
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
    
}