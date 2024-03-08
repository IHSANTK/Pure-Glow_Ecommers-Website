const mongoose = require('mongoose');
// const { categorilist } = require('../controllers/admincontroller');



const userSchema = new mongoose.Schema({
    googleId: String,
    name: String,
    email: String,
    phoneNumber: String,
    password: String,
    blocked: { type: Boolean, default: false },
   
});




const User = mongoose.model('User', userSchema);

module.exports = User;