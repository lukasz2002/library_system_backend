const mongoose = require("mongoose");
const User = require("../models/user.model");
const Book = require("../models/book.model");
const Loan = require("../models/loan.model");
const Reservation = require("../models/reservation.model");
const Fine = require("../models/fine.model");
const promoteReservationToExpectancy = require("./reservation.controller");
const { normalizeBookReservations } = require("../utils/reservation.utils");

const {
  OVERDUE_PER_DAY_PLN,
  OVERDUE_MAX_PLN,
  LOST_BOOK_FINE_PLN,
  DAMAGED_BOOK_FINE_PLN,
} = require("../config/fines");

const {
  MAX_ACTIVE_ENGAGEMENTS,
  LOAN_DURATION_DAYS,
} = require("../config/constants");

const calculateFineAmount = ({ loan, lost, damaged }) => {
  if (lost) {
    return LOST_BOOK_FINE_PLN;
  }

  if (damaged) {
    return DAMAGED_BOOK_FINE_PLN;
  }

  const now = new Date();

  if (loan.dueAt < now) {
    const daysOverdue = Math.ceil((now - loan.dueAt) / (1000 * 60 * 60 * 24));

    return Math.min(daysOverdue * OVERDUE_PER_DAY_PLN, OVERDUE_MAX_PLN);
  }

  return 0;
};

const getUserLoansList = async (req, res) => {
  try {
    const { id: userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const loans = await Loan.find({ user: userId })
      .populate({
        path: "book",
        select: "isbn",
      })
      .select("borrowedAt dueAt returnedAt book")
      .lean();

    const result = loans.map((loan) => ({
      id: loan._id,
      isbn: loan.book?.isbn,
      borrowedAt: loan.borrowedAt,
      dueAt: loan.dueAt,
      returnedAt: loan.returnedAt,
      userId: loan.user,
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch user's loans",
      error: error.message,
    });
  }
};

const createLoan = async (req, res) => {
  const { bookIsbn, userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      message: "Invalid user id",
    });
  }

  const session = await mongoose.startSession();

  let loanToSend;

  try {
    await session.withTransaction(async () => {
      const user = await User.findById(userId).session(session);
      if (!user) throw new Error("USER_NOT_FOUND");

      const userActiveLoansCount = await Loan.countDocuments({
        user: userId,
        returnedAt: null,
      }).session(session);

      const activeReservationsCount = await Reservation.countDocuments({
        user: userId,
        status: { $in: ["ACTIVE", "EXPECTANCY"] },
      }).session(session);

      const activeEngagements = userActiveLoansCount + activeReservationsCount;

      if (activeEngagements >= MAX_ACTIVE_ENGAGEMENTS) {
        throw new Error("USER_MAX_ENGAGEMENTS");
      }

      const book = await Book.findOne({ isbn: bookIsbn }).session(session);
      if (!book) throw new Error("BOOK_NOT_FOUND");

      await normalizeBookReservations(book._id, session);

      const activeLoansCount = await Loan.countDocuments({
        book: book._id,
        returnedAt: null,
      }).session(session);

      const reservedCopiesCount = await Reservation.countDocuments({
        book: book._id,
        status: { $in: ["ACTIVE", "EXPECTANCY"] },
      }).session(session);

      const physicalCopies = book.quantity - book.lostCount - book.damagedCount;

      const freeCopies =
        physicalCopies - activeLoansCount - reservedCopiesCount;

      if (freeCopies <= 0) {
        throw new Error("BOOK_NOT_AVAILABLE");
      }

      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + LOAN_DURATION_DAYS);

      const createdLoan = await Loan.create(
        [
          {
            user: userId,
            book: book._id,
            dueAt,
          },
        ],
        { session }
      );

      loanToSend = createdLoan[0].toObject();
      loanToSend.id = loanToSend._id;
      loanToSend.isbn = book.isbn;
      delete loanToSend._id;
    });

    res
      .status(201)
      .json({ message: "Loan created successfully", loan: loanToSend });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "User already has an active loan for this book",
      });
    }

    const map = {
      BOOK_NOT_FOUND: [404, "Book not found"],
      USER_NOT_FOUND: [404, "User not found"],
      USER_MAX_ENGAGEMENTS: [
        409,
        "User has reached maximum active engagements limit",
      ],
      BOOK_NOT_AVAILABLE: [409, "No copies available"],
    };

    if (map[error.message]) {
      const [status, message] = map[error.message];
      return res.status(status).json({ message });
    }

    console.error(error);
    res.status(500).json({ message: "Failed to create loan" });
  } finally {
    session.endSession();
  }
};

const setLoanToReturned = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id: loanId } = req.params;
    console.log(req.body);
    const { lost = false, damaged = false } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(loanId)) {
      throw new Error("Invalid loanId");
    }

    await session.withTransaction(async () => {
      const loan = await Loan.findById(loanId).session(session);

      if (!loan) {
        throw new Error("Loan not found");
      }

      if (loan.returnedAt) {
        throw new Error("Loan already returned");
      }

      const book = await Book.findById(loan.book).session(session);
      if (!book) {
        throw new Error("Book not found");
      }

      loan.returnedAt = new Date();
      await loan.save({ session });

      const bookUpdate = {};
      if (lost) {
        bookUpdate.$inc = { lostCount: 1 };
      } else if (damaged) {
        bookUpdate.$inc = { damagedCount: 1 };
      }

      if (Object.keys(bookUpdate).length > 0) {
        await Book.findByIdAndUpdate(loan.book, bookUpdate, {
          session,
        });
      }

      const amount = calculateFineAmount({ loan, lost, damaged });

      if (amount > 0) {
        await Fine.create(
          [
            {
              user: loan.user,
              loan: loan._id,
              book: loan.book,
              reason: lost ? "LOST" : damaged ? "DAMAGED" : "OVERDUE",
              amount,
            },
          ],
          { session }
        );
        loan.fineCreated = true;
        await loan.save({ session });
      }

      await normalizeBookReservations(loan.book, session);
      res.json({
        message: "Loan successfully returned",
        returnedAt: loan.returnedAt,
      });
    });
  } catch (error) {
    const ERROR_MAP = {
      "Invalid loanId": { status: 400 },
      "Loan not found": { status: 404 },
      "Loan already returned": { status: 409 },
      "Book not found": { status: 500 },
    };

    const mapped = ERROR_MAP[error.message];

    if (mapped) {
      return res.status(mapped.status).json({
        message: error.message,
      });
    }

    console.error(error);
    res.status(500).json({
      message: "Failed to return loan",
    });
  } finally {
    session.endSession();
  }
};

const updateLoanDueDate = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id: loanId } = req.params;
    const { extendByDays } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(loanId)) {
      throw new Error("Invalid loanId");
    }

    if (!["7", "14"].includes(extendByDays)) {
      throw new Error("Invalid extension period");
    }
    const extendByDaysInt = parseInt(extendByDays);

    await session.withTransaction(async () => {
      const loan = await Loan.findById(loanId).session(session);

      if (!loan) {
        throw new Error("Loan not found");
      }

      if (loan.returnedAt) {
        throw new Error("Loan already returned");
      }

      if (loan.renewedCount >= 2) {
        throw new Error("Maximum number of renewals reached");
      }

      loan.dueAt = new Date(
        loan.dueAt.getTime() + extendByDaysInt * 24 * 60 * 60 * 1000
      );

      loan.renewedCount += 1;

      await loan.save({ session });
      res.json({
        message: "Loan due date updated successfully",
        dueAt: loan.dueAt,
      });
    });
  } catch (error) {
    const ERROR_MAP = {
      "Invalid loanId": { status: 400 },
      "Loan not found": { status: 404 },
      "Loan already returned": { status: 409 },
      "Invalid extension period": { status: 400 },
      "Maximum number of renewals reached": { status: 409 },
    };

    const mapped = ERROR_MAP[error.message];

    if (mapped) {
      return res.status(mapped.status).json({
        message: error.message,
      });
    }

    console.error(error);
    res.status(500).json({
      message: "Failed to update loan due date",
    });
  } finally {
    session.endSession();
  }
};

module.exports = {
  getUserLoansList,
  createLoan,
  setLoanToReturned,
  updateLoanDueDate,
};
