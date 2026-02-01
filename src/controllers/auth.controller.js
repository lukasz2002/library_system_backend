const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const register = async (req, res) => {
  const {
    firstName,
    lastName,
    addressNumber,
    addressStreet,
    addressCity,
    addressCountry,
    addressEmail,
    phoneNumber,
    password,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !addressNumber ||
    !addressStreet ||
    !addressCity ||
    !addressCountry ||
    !addressEmail ||
    !phoneNumber ||
    !password
  ) {
    return res.status(400).json({
      message: "All required fields must be provided",
    });
  }

  const existingUser = await User.findOne({
    $or: [{ addressEmail }, { phoneNumber }],
  });

  if (existingUser) {
    return res.status(409).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    firstName,
    lastName,
    addressNumber,
    addressStreet,
    addressCity,
    addressCountry,
    addressEmail,
    phoneNumber,
    role: "MEMBER",
    password: hashedPassword,
  });

  res.status(201).json({ message: "Registered successfully" });
};

const login = async (req, res) => {
  const { addressEmail, password } = req.body;

  const user = await User.findOne({ addressEmail }).select("+password");
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.json({ message: "Logged in", firstName: user.firstName });
};

const logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  res.json({ message: "Logged out successfully" });
};

module.exports = { register, login, logout };
