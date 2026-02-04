const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/user.model");
const { ALLOWED_USER_UPDATE_FIELDS } = require("../config/constants");

const getUserById = async (req, res) => {
  try {
    const { id: userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch user",
      error: error.message,
    });
  }
};

const getUsersList = async (req, res) => {
  try {
    const users = await User.find(
      { isActive: true, _id: { $ne: req.user.id } },
      {
        firstName: 1,
        lastName: 1,
        addressEmail: 1,
        phoneNumber: 1,
      }
    ).lean();

    const result = users.map((user) => ({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      addressEmail: user.addressEmail,
      phoneNumber: user.phoneNumber,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

const addMember = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      addressNumber,
      addressStreet,
      addressCity,
      addressCountry,
      addressEmail,
      phoneNumber,
      role,
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
      return res.status(409).json({
        message: "Email or phone number already in use",
      });
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
      role: role || "MEMBER",
      password: hashedPassword,
    });

    const userObj = user.toObject();
    userObj.id = userObj._id;
    delete userObj._id;

    res.status(201).json({
      message: "Member created successfully",
      user: userObj,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create member",
      error: error.message,
    });
  }
};

const updateMember = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const updates = Object.keys(req.body || {});

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No update data provided",
      });
    }

    const invalidFields = updates.filter(
      (field) => !ALLOWED_USER_UPDATE_FIELDS.includes(field)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        message: "Invalid update fields",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const userObj = updatedUser.toObject();
    userObj.id = userObj._id;
    delete userObj._id;

    res.json({
      message: "Member updated successfully",
      user: userObj,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update member",
      error: error.message,
    });
  }
};

const deleteMember = async (req, res) => {
  try {
    const { id: userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "Member deactivated successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete member",
      error: error.message,
    });
  }
};

module.exports = {
  getUserById,
  getUsersList,
  addMember,
  updateMember,
  deleteMember,
};
