const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { ensureAuthenticated, ensureRole } = require('./auth');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: 'test-secret-key',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Login
app.post('/auth/login', passport.authenticate('local'), (req, res) => {
  res.json({ message: 'Logged in', user: { id: req.user.id, username: req.user.username, role: req.user.role } });
});

// Logout — req.logout() without callback breaks in Passport 0.7
app.post('/auth/logout', (req, res) => {
  req.logout();
  res.json({ message: 'Logged out' });
});

// Current user
app.get('/auth/me', ensureAuthenticated, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username, role: req.user.role } });
});

// Protected resource
app.get('/api/dashboard', ensureAuthenticated, (req, res) => {
  res.json({ message: 'Welcome to dashboard', user: req.user.username });
});

// Admin only
app.get('/api/admin', ensureRole('admin'), (req, res) => {
  res.json({ message: 'Admin panel', user: req.user.username });
});

if (require.main === module) {
  app.listen(3000, () => console.log('Server on :3000'));
}

module.exports = app;
