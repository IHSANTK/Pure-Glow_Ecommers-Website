const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
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
    
  },
  stockcount:{
    type:Number,
    
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
  disable: {
    type: Boolean,
    default: false
  },
  addedAt: {
    type: Date,
    default: Date.now // Defaults to current time when the product is added
  }
});

// Define a separate model for products
const Products = mongoose.model('Product', productSchema);

module.exports = Products;