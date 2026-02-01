const bcrypt = require("bcryptjs");
const User = require("../models/user.model");

const createInitialAdmin = async () => {
  const adminExists = await User.exists({ role: "ADMIN" });

  if (adminExists) {
    return;
  }

  const hashedPassword = await bcrypt.hash(
    process.env.INITIAL_ADMIN_PASSWORD,
    10
  );

  await User.create({
    firstName: "System",
    lastName: "Administrator",
    addressNumber: "1",
    addressStreet: "Admin Street",
    addressCity: "System",
    addressCountry: "System",
    addressEmail: process.env.INITIAL_ADMIN_EMAIL,
    phoneNumber: "0000000000",
    password: hashedPassword,
    role: "ADMIN",
  });

  console.log("Initial admin account created");
};

module.exports = createInitialAdmin;
