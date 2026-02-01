const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    isbn: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    publisher: { type: String },
    publishedYear: { type: Number },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    lostCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    damagedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    location: {
      aisle: String,
      bookcase: String,
      shelf: String,
      shelfPosition: String,
    },
  },
  { timestamps: true }
);

const Book = mongoose.model("Book", bookSchema);

module.exports = Book;
