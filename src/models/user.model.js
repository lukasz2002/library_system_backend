const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    addressNumber: { type: String, required: true },
    addressStreet: { type: String, required: true },
    addressCity: { type: String, required: true },
    addressCountry: { type: String, required: true },
    addressEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    phoneNumber: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["MEMBER", "LIBRARIAN", "ADMIN"],
      default: "MEMBER",
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
