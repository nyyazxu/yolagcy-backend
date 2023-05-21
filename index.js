const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const { User, Route } = require("./database.js");

if (!fs.existsSync(path.resolve("./images"))) {
  fs.mkdirSync(path.resolve("./images"));
}

const app = express();

app.use(express.json());

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "images"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + ".jpg");
  },
});

// Create multer instance
const upload = multer({ storage: storage });

app.use("/images", express.static(path.join(__dirname, "images")));

// Endpoint to login user by checking name and password
app.post("/login", async (req, res) => {
  try {
    const { phonenumber, password } = req.body;
    if (!phonenumber || !password) {
      res.sendStatus(406);
      return;
    }
    const user = await User.findOne({ phonenumber, password });
    if (!user) return res.status(404).send("User not found.");
    res.send(user);
  } catch (e) {
    res.sendStatus(500);
  }
});

app.post("/register", async (req, res) => {
  try {
    const { phonenumber, password, name, role } = req.body;
    if (!phonenumber || !password || !name || !role) {
      res.sendStatus(406);
      return;
    }
    const oldUser = await User.findOne({ phonenumber });
    if (oldUser) {
      res.sendStatus(402);
      return;
    }

    const user = await User.create({ phonenumber, password, name, role });
    await user.save();
    res.send(user);
  } catch (e) {
    res.sendStatus(500);
  }
});

// Endpoint to get user by number
app.get("/users/:phonenumber", async (req, res) => {
  const user = await User.findOne({ phonenumber: req.params.phonenumber });
  if (!user) return res.status(404).send("User not found.");

  const routes = await Route.find({ driverId: user._id });
  res.send({ ...user, password: undefined, routes });
});

// Endpoint to update user
app.put("/users", upload.single("carImage"), async (req, res) => {
  try {
    const newValues = JSON.parse(req.body.user);
    const carImage = req.file ? req.file.filename : null;

    let updatedValues = {
      ...newValues,
    };

    if (carImage) {
      updatedValues = { ...updatedValues, carImage };
    }

    const user = await User.findByIdAndUpdate(newValues._id, updatedValues, {
      new: true,
    });

    if (!user) return res.status(404).send("User not found.");

    res.send({ ...user._doc, password: undefined });
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

// Endpoint to get all routes
app.get("/routes/:driverId", async (req, res) => {
  const { driverId } = req.params;
  let routes = await Route.find({ driverId });

  const driver = await User.findById(driverId);

  routes = routes.map((route) => ({
    ...route._doc,
    driver: { name: driver.name, car: driver.car, carImage: driver.carImage },
  }));

  res.send(routes);
});

// Endpoint to create a route
app.post("/routes", async (req, res) => {
  try {
    const { driverId, date, from, to, capacity, cost } = req.body;

    // Create a new instance of the Route model
    const newRoute = new Route({
      driverId,
      date,
      from,
      to,
      capacity,
      cost,
    });

    // Save the new route to the database
    const savedRoute = await newRoute.save();

    res.sendStatus(200); // Return the created route as the response
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message });
  }
});

// Endpoint to update a route
app.put("/routes/:id", async (req, res) => {
  try {
    const { driverId, date, from, to, capacity, cost } = req.body;
    const routeId = req.params.id;

    // Find the route by ID in the database
    const route = await Route.findById(routeId);

    if (!route) {
      return res.status(404).json({ error: "Route not found" });
    }

    // Update the route properties
    route.driverId = driverId;
    route.date = date;
    route.from = from;
    route.to = to;
    route.capacity = capacity;
    route.cost = cost;

    // Save the updated route to the database
    const updatedRoute = await route.save();

    res.status(200).json(updatedRoute); // Return the updated route as the response
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message });
  }
});

// Endpoint to get filtered routes
app.post("/routes/filter", async (req, res) => {
  const { date, from, to } = req.body;

  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  let routes = await Route.find({
    date: {
      $gte: startDate,
      $lt: endDate,
    },
    from,
    to,
  });

  routes = await Promise.all(
    routes.map(async (route) => ({
      ...route._doc,
      driver: {
        ...(await User.findById(route.driverId))._doc,
        password: undefined,
      },
    }))
  );

  res.send(routes);
});

app.delete("/routes/:id", async (req, res) => {
  try {
    const routeId = req.params.id;

    // Find the route by ID in the database
    const route = await Route.findByIdAndDelete(routeId);

    if (!route) {
      return res.status(404).json({ error: "Route not found" });
    }

    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message });
  }
});

const port = process.env.PORT || 1919;
app.listen(port, () => console.log(`Listening on port ${port}...`));
