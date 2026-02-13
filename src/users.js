const users = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
  { id: 2, username: 'user', password: 'user123', role: 'user' },
  { id: 3, username: 'editor', password: 'editor123', role: 'editor' },
];

function findByUsername(username) {
  return users.find(u => u.username === username);
}

function findById(id) {
  return users.find(u => u.id === id);
}

function validatePassword(user, password) {
  return user.password === password;
}

module.exports = { findByUsername, findById, validatePassword, users };
