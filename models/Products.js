const mongoose = require('mongoose');


const productcheama = new mongoose.Schema({
  productName: {
      type: String,
      required: true
  },
  productPrice: {
      type: String,
      required: true
  },
  description: {
      type: String,
      required: true
  },
  category: {
      type: String,
      required: true
  },
  subcategory: String, // Optional field
  createdAt: {
      type: Date,
      default: Date.now
  },
  image: {
      type: [String],
      required: true
  },

});


const adminSchema = new mongoose.Schema({
    // email: String,
    // password: String,
    categories: [{
        categoryName: { type: String },
        createdAt: { type: Date, default: Date.now }
    }],
    products:[productcheama]
}, { collection: 'products' });

const Products = mongoose.model('Product', adminSchema);


module.exports = Products;