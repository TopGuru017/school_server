const express = require("express");
const mysql = require("mysql2");
const sessions = require("express-session");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const cors = require("cors");

const port = process.env.PORT;

const connection = mysql.createConnection({
  host: process.env.HOST, // Change to your MySQL server host
  user: process.env.USER, // Change to your MySQL username
  password: process.env.PASSWORD, // Change to your MySQL password
  database: process.env.DATABASE, // Change to your MySQL database name
});

module.exports = connection;

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("Connected to MySQL database");
});

const app = express();
const jwt = require("jsonwebtoken");
const JWT_SECRET = "12345";

function checkAuthentication(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, secret, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}
app.use(cors());
app.use("/uploads", express.static("uploads"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require("./routes/auth"));
app.use(require("./routes/operation"));

app.get("/", (req, res) => {
  res.send("hello world");
});

app.listen(port, () => {
  console.log("Server is running on ", port);
});
