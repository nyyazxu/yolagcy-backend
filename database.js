const mongoose = require("mongoose");

mongoose
  .connect("mongodb://localhost/yolagcy", { useNewUrlParser: true })
  .then(() => console.log("Connected to MongoDB..."))
  .catch((err) => console.error("Could not connect to MongoDB...", err));

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phonenumber: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  car: { type: String },
  carImage: { type: String },
});

const User = mongoose.model("User", userSchema);

const routeSchema = new mongoose.Schema({
  driverId: { type: String, required: true },
  date: { type: Date, required: true },
  cost: { type: Number, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  capacity: { type: Number, required: true },
});

const Route = mongoose.model("Route", routeSchema);

module.exports = { User, Route };
