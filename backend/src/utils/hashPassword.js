const bcrypt = require("bcrypt");

async function generateHash() {
  const password = "password";
  const hash = await bcrypt.hash(password, 12);

  console.log("Password asli:", password);
  console.log("Hash bcrypt:", hash);
}

generateHash();