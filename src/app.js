require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

//+ Express Instance
const app = express();

//+ Middleware
app.use(logger("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static("public"));

//+ Routes


//+ Fallback
app.get("*", (req, res) => {
    res.send("Hello from server!");
    
    // //* When the frontend is up, send this instead:
    // res.sendFile(path.resolve(__dirname, "public/index.html"));
});

module.exports = app;