// Load environment variables
//require("dotenv").config();
const express = require("express");
const session = require("express-session");
const authRoutes = require("./routes/authRoutes");
const questionRoutes = require('./routes/questionRoutes');
const dagDataRoutes = require('./routes/dagDataRoutes'); // Added line for importing dagDataRoutes
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Setting the templating engine to EJS
app.set("view engine", "ejs");

// Serve static files
app.use(express.static("public"));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'defaultSecret',
    resave: false,
    saveUninitialized: false,
  }),
);

app.on("error", (error) => {
  console.error(`Server error: ${error.message}`);
  console.error(error.stack);
});

// Logging session creation and destruction
app.use((req, res, next) => {
  const sess = req.session;
  // Make session available to all views
  res.locals.session = sess;
  if (!sess.views) {
    sess.views = 1;
    console.log("Session created at: ", new Date().toISOString());
  } else {
    sess.views++;
    console.log(
      `Session accessed again at: ${new Date().toISOString()}, Views: ${sess.views}, User ID: ${sess.userId || '(unauthenticated)'}`,
    );
  }
  next();
});

// Local file storage functions
const dataFilePath = path.join(__dirname, 'data.json');

const readDataFromFile = () => {
  if (!fs.existsSync(dataFilePath)) {
    return { users: [], questions: [] };
  }
  const data = fs.readFileSync(dataFilePath);
  return JSON.parse(data);
};

const writeDataToFile = (data) => {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
};

// Authentication Routes
app.use(authRoutes(readDataFromFile, writeDataToFile));

// Added questionRoutes to the middleware stack
app.use(questionRoutes(readDataFromFile, writeDataToFile));

// Added dagDataRoutes to the middleware stack
app.use(dagDataRoutes(readDataFromFile));

// Root path response
app.get("/", (req, res) => {
  res.render("index");
});

// New route for question input form
app.get("/question/input", (req, res) => {
  try {
    res.render("questionInput");
    console.log("Rendered question input form.");
  } catch (error) {
    console.error(`Error rendering question input form: ${error.message}`, error.stack);
    res.status(500).send("Failed to render question input form.");
  }
});

// If no routes handled the request, it's a 404
app.use((req, res, next) => {
  res.status(404).send("Page not found.");
});

// Error handling
app.use((err, req, res, next) => {
  console.error(`Unhandled application error: ${err.message}`);
  console.error(err.stack);
  res.status(500).send("There was an error serving your request.");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
