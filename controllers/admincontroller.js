
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
   
        let data = await Admin.findOne();
          
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

        // Update the category name
        category.categoryName = newName;

        // Save the changes to the admin document
        await admin.save();

       res.redirect('/categorie-list')
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

let deletecategorie = async (req, res) => {
    try {
        // Extract the admin ID from the request parameters
        const categoryId= req.params.id;
        
        // Update the admin document to remove the category from the categories array
        const admin = await Admin.findOneAndUpdate(
            { 'categories._id': categoryId }, // Find the admin document containing the desired category
            { $pull: { categories: { _id: categoryId } } }, // Remove the category from the categories array
            { new: true } // Return the updated document
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
    
}