const argon2 = require('argon2');

// Argon2id es el algoritmo recomendado por OWASP (2024)
// Ganador de la Password Hashing Competition
const ARGON2_OPTIONS = {
  type:        argon2.argon2id,
  memoryCost:  65536, // 64 MB
  timeCost:    3,     // 3 iteraciones
  parallelism: 2,
};

const hashPassword = async (plainText) => {
  return argon2.hash(plainText, ARGON2_OPTIONS);
};

const verifyPassword = async (plainText, hash) => {
  return argon2.verify(hash, plainText);
};

module.exports = { hashPassword, verifyPassword };
