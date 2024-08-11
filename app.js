const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieparser = require('cookie-parser')
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const ejs = require('ejs');
const User = require('./models/user');
const adminRoutes = require('./routes/adminroutes');
const userRoutes = require('./routes/userroutes');
require('dotenv').config()

const app = express(); 
 
mongoose.connect(process.env.MONGOOSE_CONNECT, { useNewUrlParser: true, useUnifiedTopology: true })
.then((data)=>{
    console.log("db connected");
})
.catch((err)=>{
    console.log(err);
})
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'mysecretkey', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());
app.use(cookieparser());

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ googleId: profile.id });
 console.log('dfdasdsddffdfdfdfdfdf');
            if (!user) {
                user = new User({
                    googleId: profile.id,
                    name: profile.displayName,
                    email: profile.emails[0].value
                });
                await user.save();
            }

            done(null, user);
        } catch (err) {
            done(err);
        }
    }
));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.static('uploads'));
app.use('/', adminRoutes);
app.use('/', userRoutes);

const PORT = process.env.PORT ; 
app.listen(PORT, () => {
    console.log(`Server is running on port :http://localhost:${PORT}`);
});














