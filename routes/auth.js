const express = require("express");
const router = express.Router();
const db = require("../app");
const jwt = require("jsonwebtoken");
const JWT_SECRET = "12345";

router.post("/register", (req, res) => {
  var { username, password } = req.body;
  console.log(req.body);
  if (!username || !password) {
    return res.status(422).json({ error: "Add all data" });
  }
  db.query(
    `SELECT COUNT(*) AS number FROM user WHERE username = '${username}'`,
    (err, results) => {
      console.log(results[0].number);
      if (err) {
        res.status(500).json({ error: "Error fetching users" });
        return;
      }
      if (results[0].number > 0) {
        return res.status(422).json({ error: "User already exist" });
      }
      db.query(
        `INSERT INTO user (username, password) VALUES ('${username}', '${password}')`
      );
      res.json({ message: "Register Success" });
    }
  );
});

router.post("/login", (req, res) => {
  var { username, password } = req.body;
  console.log(req.body);
  if (!username || !password) {
    res.status(422).json({ error: "Add all data" });
  }
  db.query(
    `SELECT * FROM user WHERE username = '${username}' AND password = '${password}'`,
    (err, results) => {
      if (err) {
        res.status(500).json({ error: "Error fetching users" });
        return;
      }
      if (results.length === 0) {
        return res.status(422).json({ error: "Invalid Username or Password" });
      }
      const token = jwt.sign({ id: results[0].id }, JWT_SECRET, {
        expiresIn: "1h",
      });
      res.json({ token: token, username: username });
    }
  );
});

router.get("/logout", (req, res) => {
  res.status(200).json({ message: "sdf" });
});

module.exports = router;
