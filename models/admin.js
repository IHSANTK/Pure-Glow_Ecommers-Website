const mongoose = require('mongoose');


const productscheama = new mongoose.Schema({
  productName: String,
  productPrice:String,
  description: String,
  category:String,
  subcategory:String,
  image:String,

})


const adminSchema = new mongoose.Schema({
    email: String,
    password: String,
    categories: [{
        categoryName: { type: String },
        createdAt: { type: Date, default: Date.now }
    }],
    products:[productscheama]
}, { collection: 'admins' });

const Admin = mongoose.model('Admin', adminSchema);


module.exports = Admin;