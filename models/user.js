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
            quantity: { type: Number, default: 1 }
        }],
        total: String
    },
    wishlist:[{productId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
                image: [String],
                productName: String,
                productPrice: String,
         }]
});

const User = mongoose.model('User', userSchema);

module.exports = User