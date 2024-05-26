const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

const authRoutes = (readDataFromFile, writeDataToFile) => {
  router.get('/auth/register', (req, res) => {
    res.render('register');
  });

  router.post('/auth/register', async (req, res) => {
    try {
      const { username, password } = req.body;
      const data = readDataFromFile();
      const userExists = data.users.some(user => user.username === username);

      if (userExists) {
        return res.status(400).send('User already exists');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      data.users.push({ username, password: hashedPassword });
      writeDataToFile(data);

      res.redirect('/auth/login');
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).send(error.message);
    }
  });

  router.get('/auth/login', (req, res) => {
    res.render('login');
  });

  router.post('/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const data = readDataFromFile();
      const user = data.users.find(user => user.username === username);

      if (!user) {
        return res.status(400).send('User not found');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        req.session.userId = user.username;
        return res.redirect('/');
      } else {
        return res.status(400).send('Password is incorrect');
      }
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).send(error.message);
    }
  });

  router.get('/auth/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error('Error during session destruction:', err);
        return res.status(500).send('Error logging out');
      }
      res.redirect('/auth/login');
    });
  });

  return router;
};

module.exports = authRoutes;
