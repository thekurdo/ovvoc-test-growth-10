const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const users = require('./users');

passport.use(new LocalStrategy(
  function(username, password, done) {
    const user = users.findByUsername(username);
    if (!user) return done(null, false, { message: 'Unknown user' });
    if (!users.validatePassword(user, password)) return done(null, false, { message: 'Wrong password' });
    return done(null, user);
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  const user = users.findById(id);
  done(null, user || false);
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

function ensureRole(role) {
  return function(req, res, next) {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

module.exports = { ensureAuthenticated, ensureRole };
