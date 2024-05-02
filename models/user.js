const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const addressSchema = new mongoose.Schema({
    name: String,
    phone: String,
    address: String,
    city: String,
    district: String,
    state: String,
    pincode: String,
    email: String,
});

const productSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    category:String,
    qty: { type: Number, default: 1 },
    price: { type: Number,  },
    image: [String],
   
    orderStatus: { type: String, default: "Pending" },
    cancelReason: String,
    
}); 

const orderSchema = new mongoose.Schema({
    products: [productSchema],
    totalAmount: { type: Number },
    orderDate: { type: Date, default: Date.now },
    expectedDeliveryDate: String,
    shippingAddress: addressSchema,
    paymentMethod: { type: String, required: true },
   
});

const userSchema = new mongoose.Schema({
    googleId: String,
    name: String,
    email: { type: String, unique: true }, // Ensuring uniqueness for email
    phoneNumber: String,
    password: String,
    image: String,
    blocked: { type: Boolean, default: false },
    cart: {   
      products: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      image: [String],
      productName: String,
      productPrice: String,
      quantity: { type: Number, default: 1 },
      disable: Boolean
    }],
        
    },
    wishlist: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        image: [String],
        productName: String,
        productPrice: String,
        color: { type: Boolean, default: false }
    }],
    orders: [orderSchema],
    address: [addressSchema]
});

const User = mongoose.model('User', userSchema);

module.exports = User; 