const cloudinary = require('cloudinary').v2;
require("dotenv").config();

cloudinary.config({
  cloud_name: 'dlzi9hete',
  api_key: '963948375167731',
  api_secret: '7f0axZ2kzbyytte-msmDeUeR_Dc'
});

module.exports = cloudinary;