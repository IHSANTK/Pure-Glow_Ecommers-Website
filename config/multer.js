const multer = require('multer');

const storage = multer.diskStorage({

  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const fileFilter = function (req, file, cb) {

 

  if (file.mimetype.startsWith("image/")) {
    cb(null, true); // Accept image files only
  } else {
    cb(new Error("Please upload only images."), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });



module.exports = upload;