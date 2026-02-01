const mongoose = require("mongoose");

const fineSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    loan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Loan",
      required: true,
      unique: true, // one fine per loan
    },

    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["OPEN", "PAID", "WAIVED"],
      default: "OPEN",
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    currency: {
      type: String,
      default: "PLN",
    },

    reason: {
      type: String,
      enum: ["OVERDUE", "LOST", "DAMAGED"],
      default: "OVERDUE",
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    lastCalculatedAt: {
      type: Date,
    },

    paidAt: {
      type: Date,
    },

    waivedAt: {
      type: Date,
    },

    waivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    notes: String,
  },
  { timestamps: true }
);

const Fine = mongoose.model("Fine", fineSchema);

module.exports = Fine;
