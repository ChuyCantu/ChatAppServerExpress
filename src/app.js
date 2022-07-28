require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
var passport = require('passport');
const session = require("express-session");
const SessionStore = require("express-session-sequelize")(session.Store);
const { db, testDatabaseConnection } = require("./services/db");

//+ Database connection
testDatabaseConnection(db);

//+ Express Instance
const app = express();

app.locals.pluralize = require('pluralize');

//+ Middleware
app.use(logger("dev"));
app.use(cors({ credentials: true, origin: "http://localhost:4200" }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static("public"));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new SessionStore({ db })
}));
app.use(passport.authenticate("session"));

//+ Routes
app.use("/auth", require("./routes/auth.routes"));

//+ Fallback
app.get("*", (req, res) => {
    res.status(404).json({ msg: "Hello from server!"});
    
    // //* When the frontend is up, send this instead:
    // res.sendFile(path.resolve(__dirname, "public/index.html"));
});

module.exports = app;