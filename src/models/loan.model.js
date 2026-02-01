const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
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

    borrowedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    dueAt: {
      type: Date,
      required: true,
    },

    returnedAt: {
      type: Date,
      default: null,
    },

    // status: {
    //   type: String,
    //   enum: ["BORROWED", "RETURNED", "OVERDUE"],
    //   default: "BORROWED",
    // },

    renewedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    fineCreated: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

loanSchema.index({ user: 1, status: 1 });
loanSchema.index({ book: 1, status: 1 });
loanSchema.index({ book: 1, returnedAt: 1 });
loanSchema.index({ user: 1, returnedAt: 1 });
loanSchema.index({ dueAt: 1 });

// loanSchema.index(
//   { user: 1, book: 1 },
//   {
//     unique: true,
//     partialFilterExpression: { status: "BORROWED" },
//   }
// );

loanSchema.index(
  { user: 1, book: 1 },
  {
    unique: true,
    partialFilterExpression: { returnedAt: null },
  }
);

const Loan = mongoose.model("Loan", loanSchema);

module.exports = Loan;
