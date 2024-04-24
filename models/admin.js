const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    email: String,
    password: String,
    categories: [{
        categoryName: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    coupons:[{
        couponsStatus:String,
        endDate:String,
        couponCode:String,
        couponType:String,
        discountValue:String,
    }]
}, { collection: 'admin' });

const Admin = mongoose.model('admin', adminSchema);

module.exports = Admin;