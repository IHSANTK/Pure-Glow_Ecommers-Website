const Razorpay = require("razorpay");

const instance = new Razorpay({
    key_id: 'rzp_test_97NF7SboryYNH9',
    key_secret: 'wWpBr6QG51f47t1IybVh169K'
});

const generateRazorpay = (orderId, total) => {

    console.log("ooooooooo",total);
    return new Promise((resolve, reject) => {
        const options = {
            amount: total*100, 
            currency: "INR",
            receipt: orderId
        };
        instance.orders.create(options, function (err, order) {
            if (err) {
                reject(err);
            } else {
                console.log("new orders :",order);
                resolve(order);
            }
        });
    });
}

module.exports = { generateRazorpay };