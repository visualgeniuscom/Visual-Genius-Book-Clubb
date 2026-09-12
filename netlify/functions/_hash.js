const crypto = require('crypto');

function makeSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashAnswer(answer, salt) {
  return crypto.createHash('sha256').update(salt + answer.trim().toLowerCase()).digest('hex');
}

module.exports = { makeSalt, hashAnswer };
