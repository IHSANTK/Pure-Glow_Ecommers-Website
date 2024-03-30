const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  name: { type: String },
  phone: { type: Number },
  address: { type: String },
  city: { type: String },
  district: { type: String },
  state: { type: String },
  pincode: { type: Number },
  email: { type: String },
}, { _id: true });

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: { type: String },
    qty: { type: Number, default: 1 },
    price: { type: Number, required: true },
    image: [String],
    orderStatus: { type: String, default: "Pending" },
    cancelReason: { type: String }, // New field for cancellation reason
  }],
  totalAmount: { type: Number },
  orderDate: { type: Date, default: Date.now },
  expectedDeliveryDate: { type: String },
  shippingAddress: { type: addressSchema },
  paymentMethod: { type: String, required: true },
});

orderSchema.pre('save', function (next) {
  if (!this.orderId) {
    this.orderId = generateOrderId();
  }
  next();
});

function generateOrderId() {
  return 'ORD' + Date.now().toString() + Math.floor(1000 + Math.random() * 9000);
}

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
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      image: [String],
      productName: String,
      productPrice: String,
      quantity: { type: Number, default: 1 },
      disable: Boolean
    }],
    total: String
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