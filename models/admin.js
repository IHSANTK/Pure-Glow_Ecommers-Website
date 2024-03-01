const mongoose = require('mongoose');



const adminSchema = new mongoose.Schema({
    email: String,
    password: String,
    categories: [{
        categoryName: { type: String },
        createdAt: { type: Date, default: Date.now }
    }]
}, { collection: 'admins' });

const Admin = mongoose.model('Admin', adminSchema);


module.exports = Admin;