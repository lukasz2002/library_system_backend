const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "EXPECTANCY", "FULFILLED", "CANCELLED", "EXPIRED"],
      default: "ACTIVE",
      index: true,
    },

    reservedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    expectancyStartedAt: {
      type: Date,
    },

    fulfilledAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

reservationSchema.index({ book: 1, status: 1, reservedAt: 1 });

reservationSchema.index(
  { user: 1, book: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["ACTIVE", "EXPECTANCY"] },
    },
  }
);

reservationSchema.index({ status: 1, expectancyStartedAt: 1 });

const Reservation = mongoose.model("Reservation", reservationSchema);

module.exports = Reservation;
