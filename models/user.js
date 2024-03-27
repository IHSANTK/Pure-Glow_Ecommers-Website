const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    googleId: String,
    name: String,
    email: String,
    phoneNumber: String,
    password: String,
    image: String,
    blocked: { type: Boolean, default: false },
    cart: {
        products: [{
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Reference to the Product model
            image: [String],
            productName: String,
            productPrice: String,
            quantity: { type: Number, default: 1 },
            disable:Boolean
        }],
        total: String
    },
    wishlist: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        image: [String],
        productName: String,
        productPrice: String,
        color: { type: Boolean, default: false } // Set default color to red
    }],
    address: [{
        name: String,
        number:  Number,
        pincode:Number,
        area:String,
        city:String,
        state:String,
         // Set default color to red
    }],
});

const User = mongoose.model('User', userSchema);

module.exports = User;