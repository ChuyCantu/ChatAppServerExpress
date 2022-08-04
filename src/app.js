require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
var passport = require('passport');
const session = require("express-session");
const bodyParser = require("body-parser");
const SessionStore = require("express-session-sequelize")(session.Store);
const { db, testDatabaseConnection } = require("./services/db");

//+ Database connection
testDatabaseConnection(db);

//+ Express Instance
const app = express();

app.locals.pluralize = require('pluralize');

//+ Middleware
app.use(logger("dev"));
app.use(cors({ credentials: true, origin: "https://nd-chatapp.herokuapp.com" }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static("public"));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new SessionStore({ db })
});
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
// app.use(passport.authenticate("session"));

//+ Routes
app.use("/api/auth", require("./routes/auth.routes"));

//+ Fallback
app.get("*", (req, res) => {    
    res.sendFile(path.resolve(__dirname, "../public/index.html"));
});

module.exports = {
  app,
  sessionMiddleware
};