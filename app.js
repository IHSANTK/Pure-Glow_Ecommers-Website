const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const ejs = require('ejs');

const app = express();


mongoose.connect('mongodb://localhost:27017/users', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'mysecretkey', resave: true, saveUninitialized: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));



const adminRoutes = require('./routes/adminroutes');
const userRoutes = require('./routes/userroutes');

app.use('/',adminRoutes);
app.use('/',userRoutes);

app.listen(3000, () => {
        console.log('Server is running on port 3000');
 });
    








































// const express = require('express');
// const mongoose = require('mongoose');
// const bodyParser = require('body-parser');
// const session = require('express-session');
// const bcrypt = require('bcrypt');
// const path = require('path');
// const ejs = require('ejs');

// const app = express();
// mongoose.connect('mongodb://localhost:27017/users', { useNewUrlParser: true, useUnifiedTopology: true });
// const db = mongoose.connection;
// db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(session({ secret: 'mysecretkey', resave: true, saveUninitialized: true }));
// app.set('view engine', 'ejs');
// app.use(express.static('public'));

// const userSchema = new mongoose.Schema({
//     name: String,
//     email: String,
//     phoneNumber: String,
//     password: String,
//     blocked: { type: Boolean, default: false }
// });

// const User = mongoose.model('User', userSchema);

// app.get('/', (req, res) => {
//     res.render('user/index');
// });

// app.get('/profile', (req, res) => {
//     if (req.session.userId) {
//         res.render('user/profile', { userName: req.session.userName, email: req.session.email, phoneNumber: req.session.phoneNumber });
//     } else {
//         res.render('user/login', { errorMessage: req.errorMessage });
//     }
// });

// app.get('/login', (req, res) => {
//     if (req.session.userId) {
//         res.redirect('/profile');
//     } else {
//         res.render('user/login', { errorMessage: req.query.errorMessage });
//     }
// });

// app.post('/login', async (req, res) => {
//     const { email, password } = req.body;
//     const user = await User.findOne({ email });

//     if (user && user.blocked) {
//         res.redirect('/blocked'); // Redirect to blocked page if user is blocked
//         return;
//     }

//     if (user && bcrypt.compareSync(password, user.password)) {
//         req.session.userId = user._id;
//         req.session.userName = user.name;
//         req.session.email = user.email;
//         req.session.phoneNumber = user.phoneNumber;
//         res.redirect('/profile');
//     } else {
//         res.redirect('/login?errorMessage=Invalid email or password. Please sign up.');
//     }
// });

// app.get('/signup', (req, res) => {
//     res.render('user/signup', { signupSuccessful: req.signupSuccessful });
// });

// app.post('/signup', async (req, res) => {
//     const { name, email, phoneNumber, password } = req.body;
//     const existingUser = await User.findOne({ email });

//     if (existingUser) {
//         res.render('user/signup', { signupSuccessful: "User already exists" });
//     }

//     const hashedPassword = bcrypt.hashSync(password, 10);

//     const newUser = new User({
//         name,
//         email,
//         password: hashedPassword,
//         phoneNumber,
//     });

//     await newUser.save();

//     req.session.userId = newUser._id;
//     req.session.userName = newUser.name;
//     req.session.email = newUser.email;
//     req.session.phoneNumber = newUser.phoneNumber;
//     res.redirect('/profile');
// });


// const adminSchema = new mongoose.Schema({
//     email: String,
//     password: String,
// }, { collection: 'admins' });

// const Admin = mongoose.model('Admin', adminSchema);

// app.get('/admin', (req, res) => {
//     if (req.session.adminId) {
//         res.render('admin/index');
//     } else {
//         res.render('admin/login');
//     }
// });

// app.post('/admin', async (req, res) => {
//     const { email, password } = req.body;
//     const admin = await Admin.findOne({ email });

//     if (admin.email === email && admin.password === password) {
//         req.session.adminId = admin._id;
//         req.session.email = admin.email;
//         res.render('admin/index');
//     } else {
//         res.redirect('/admin');
//     }
// });

// app.post('/toggleBlock', async (req, res) => {
//     const userId = req.body.userId;
//     try {
//         const user = await User.findById(userId);
//         if (user) {
//             user.blocked = !user.blocked; // Toggle block status
//             await user.save();
//         }
//         res.redirect('/userlist');
//     } catch (error) {
//         console.error('Error toggling user block status:', error);
//         res.status(500).send('Error toggling user block status');
//     }
// });

// app.get('/userlist', async (req, res) => {
//     try {
//         const data = await User.find();
//         res.render('admin/customers', { data });
//     } catch (error) {
//         console.error('Error retrieving users:', error);
//         res.status(500).send('Error retrieving users');
//     }
// });

// app.get('/blocked', (req, res) => {
//     res.render('user/index');
// });

// app.listen(3000, () => {
//     console.log('Server is running on port 3000');
// });
