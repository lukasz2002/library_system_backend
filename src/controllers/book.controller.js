const mongoose = require("mongoose");
const Book = require("../models/book.model");
const Loan = require("../models/loan.model");
const Reservation = require("../models/reservation.model");
const { ALLOWED_BOOK_UPDATE_FIELDS } = require("../config/constants");

const getBookById = async (req, res) => {
  try {
    const { id: bookId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({ message: "Invalid book id" });
    }

    const books = await Book.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(bookId),
        },
      },

      {
        $lookup: {
          from: "loans",
          let: { bookId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$book", "$$bookId"] },
                    { $eq: ["$returnedAt", null] },
                  ],
                },
              },
            },
          ],
          as: "activeLoans",
        },
      },

      {
        $lookup: {
          from: "reservations",
          let: { bookId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$book", "$$bookId"] },
                    {
                      $in: ["$status", ["ACTIVE", "EXPECTANCY"]],
                    },
                  ],
                },
              },
            },
          ],
          as: "activeReservations",
        },
      },

      {
        $addFields: {
          availableCount: {
            $subtract: [
              {
                $subtract: [
                  {
                    $subtract: ["$quantity", "$lostCount"],
                  },
                  "$damagedCount",
                ],
              },
              {
                $add: [
                  { $size: "$activeLoans" },
                  { $size: "$activeReservations" },
                ],
              },
            ],
          },
        },
      },

      {
        $project: {
          activeLoans: 0,
          activeReservations: 0,
        },
      },
    ]);

    if (!books.length) {
      return res.status(404).json({ message: "Book not found" });
    }

    const book = books[0];

    res.json({
      ...book,
      id: book._id,
      status: book.availableCount > 0 ? "Available" : "Unavailable",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch book",
    });
  }
};

const getBooksList = async (req, res) => {
  try {
    const books = await Book.aggregate([
      {
        $project: {
          isbn: 1,
          title: 1,
          author: 1,
          publisher: 1,
          quantity: 1,
          lostCount: 1,
          damagedCount: 1,
        },
      },

      {
        $lookup: {
          from: "loans",
          let: { bookId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$book", "$$bookId"] },
                    { $eq: [{ $ifNull: ["$returnedAt", null] }, null] },
                  ],
                },
              },
            },
          ],
          as: "activeLoans",
        },
      },

      {
        $lookup: {
          from: "reservations",
          let: { bookId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$book", "$$bookId"] },
                    {
                      $in: ["$status", ["ACTIVE", "EXPECTANCY"]],
                    },
                  ],
                },
              },
            },
          ],
          as: "activeReservations",
        },
      },

      {
        $addFields: {
          availableCount: {
            $subtract: [
              {
                $subtract: [
                  {
                    $subtract: ["$quantity", "$lostCount"],
                  },
                  "$damagedCount",
                ],
              },
              {
                $add: [
                  { $size: "$activeLoans" },
                  { $size: "$activeReservations" },
                ],
              },
            ],
          },
        },
      },

      {
        $project: {
          isbn: 1,
          title: 1,
          author: 1,
          publisher: 1,
          availableCount: 1,
          status: {
            $cond: [
              { $gt: ["$availableCount", 0] },
              "Available",
              "Unavailable",
            ],
          },
        },
      },
    ]);

    res.json(
      books.map((book) => ({
        id: book._id,
        ...book,
      }))
    );
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch books",
      error: error.message,
    });
  }
};

const getBooksListUnavailable = async (req, res) => {
  try {
    const books = await Book.aggregate([
      {
        $project: {
          isbn: 1,
          title: 1,
          author: 1,
          publisher: 1,
          quantity: 1,
          lostCount: 1,
          damagedCount: 1,
        },
      },

      {
        $lookup: {
          from: "loans",
          let: { bookId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$book", "$$bookId"] },
                    { $eq: [{ $ifNull: ["$returnedAt", null] }, null] },
                  ],
                },
              },
            },
          ],
          as: "activeLoans",
        },
      },

      {
        $lookup: {
          from: "reservations",
          let: { bookId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$book", "$$bookId"] },
                    {
                      $in: ["$status", ["ACTIVE", "EXPECTANCY"]],
                    },
                  ],
                },
              },
            },
          ],
          as: "activeReservations",
        },
      },

      {
        $addFields: {
          availableCount: {
            $subtract: [
              {
                $subtract: [
                  {
                    $subtract: ["$quantity", "$lostCount"],
                  },
                  "$damagedCount",
                ],
              },
              {
                $add: [
                  { $size: "$activeLoans" },
                  { $size: "$activeReservations" },
                ],
              },
            ],
          },
        },
      },

      {
        $match: {
          availableCount: { $lt: 1 },
        },
      },

      {
        $project: {
          isbn: 1,
          title: 1,
          author: 1,
          publisher: 1,
          availableCount: 1,
          status: {
            $cond: [
              { $gt: ["$availableCount", 0] },
              "Available",
              "Unavailable",
            ],
          },
        },
      },
    ]);

    res.json(
      books.map((book) => ({
        id: book._id,
        ...book,
      }))
    );
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch books",
      error: error.message,
    });
  }
};

const createBook = async (req, res) => {
  try {
    const {
      isbn,
      title,
      author,
      publisher,
      publishedYear,
      quantity,
      location,
    } = req.body;

    if (!isbn || !title || !author || quantity === undefined) {
      return res.status(400).json({
        message: "ISBN, title, author and quantity are required",
      });
    }

    const existingBook = await Book.findOne({ isbn });
    if (existingBook) {
      return res.status(409).json({
        message: "Book with this ISBN already exists",
      });
    }

    const book = await Book.create({
      isbn,
      title,
      author,
      publisher,
      publishedYear,
      quantity,
      location,
    });

    const activeLoansCount = await Loan.countDocuments({
      book: book._id,
      returnedAt: null,
    });

    const reservedCopiesCount = await Reservation.countDocuments({
      book: book._id,
      status: { $in: ["ACTIVE", "EXPECTANCY"] },
    });

    const physicalCopies = book.quantity - book.lostCount - book.damagedCount;

    const freeCopies = physicalCopies - activeLoansCount - reservedCopiesCount;

    const bookObj = book.toObject();
    bookObj.id = bookObj._id;
    bookObj.availableCount = freeCopies;
    bookObj.status = freeCopies > 0 ? "Available" : "Unavailable";
    delete bookObj._id;

    res.status(201).json({
      message: "Book created successfully",
      book: bookObj,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create book",
      error: error.message,
    });
  }
};

const updateBook = async (req, res) => {
  try {
    const { id: bookId } = req.params;
    const updates = Object.keys(req.body || {});

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({ message: "Invalid book ID" });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message: "No update data provided",
      });
    }

    const invalidFields = updates.filter(
      (field) => !ALLOWED_BOOK_UPDATE_FIELDS.includes(field)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        message: "Invalid update fields",
      });
    }

    const updatedBook = await Book.findByIdAndUpdate(bookId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedBook) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    const activeLoansCount = await Loan.countDocuments({
      book: bookId,
      returnedAt: null,
    });

    const reservedCopiesCount = await Reservation.countDocuments({
      book: bookId,
      status: { $in: ["ACTIVE", "EXPECTANCY"] },
    });

    const physicalCopies =
      updatedBook.quantity - updatedBook.lostCount - updatedBook.damagedCount;

    const freeCopies = physicalCopies - activeLoansCount - reservedCopiesCount;

    const bookObj = updatedBook.toObject();
    bookObj.id = bookObj._id;
    bookObj.availableCount = freeCopies;
    bookObj.status = freeCopies > 0 ? "Available" : "Unavailable";
    delete bookObj._id;

    res.json({
      message: "Book updated successfully",
      book: bookObj,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update book",
      error: error.message,
    });
  }
};

const deleteBook = async (req, res) => {
  try {
    const { id: bookId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({ message: "Invalid book ID" });
    }

    const book = await Book.findByIdAndDelete(bookId);

    if (!book) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    res.json({
      message: "Book deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete book",
      error: error.message,
    });
  }
};

module.exports = {
  getBookById,
  getBooksList,
  getBooksListUnavailable,
  createBook,
  updateBook,
  deleteBook,
};
