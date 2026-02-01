const mongoose = require("mongoose");
const Reservation = require("../models/reservation.model");
const Loan = require("../models/loan.model");
const User = require("../models/user.model");
const Book = require("../models/book.model");
const Fine = require("../models/fine.model");
const {
  MAX_ACTIVE_ENGAGEMENTS,
  EXPECTANCY_EXPIRY_DAYS,
  LOAN_DURATION_DAYS,
} = require("../config/constants");
const {
  expireUserReservations,
  normalizeBookReservations,
} = require("../utils/reservation.utils");

const getUserReservations = async (req, res) => {
  try {
    const { id: userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid user id",
      });
    }

    const reservations = await Reservation.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
        },
      },

      {
        $lookup: {
          from: "books",
          localField: "book",
          foreignField: "_id",
          as: "book",
        },
      },

      {
        $unwind: "$book",
      },

      {
        $addFields: {
          expiryAt: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "EXPECTANCY"] },
                  { $ne: ["$expectancyStartedAt", null] },
                ],
              },
              {
                $dateAdd: {
                  startDate: "$expectancyStartedAt",
                  unit: "day",
                  amount: EXPECTANCY_EXPIRY_DAYS,
                },
              },
              null,
            ],
          },
        },
      },

      {
        $project: {
          _id: 0,
          id: "$_id",
          isbn: "$book.isbn",
          reservedAt: 1,
          status: 1,
          expiryAt: 1,
        },
      },

      {
        $sort: {
          reservedAt: 1,
        },
      },
    ]);

    res.json(reservations);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch reservations",
      error: error.message,
    });
  }
};

const createReservation = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { userId, bookId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(bookId)
    ) {
      throw new Error("Invalid userId or bookId");
    }

    let createdReservationToSend;

    await session.withTransaction(async () => {
      const user = await User.findById(userId).session(session);
      if (!user || !user.isActive) {
        throw new Error("User not found");
      }

      const book = await Book.findById(bookId).session(session);
      if (!book) {
        throw new Error("Book not found");
      }

      const unpaidFinesCount = await Fine.countDocuments({
        user: userId,
        status: "OPEN",
      }).session(session);

      if (unpaidFinesCount > 0) {
        throw new Error("User has unpaid fines");
      }

      await expireUserReservations(userId, session);
      await normalizeBookReservations(bookId, session);

      const activeLoansCount = await Loan.countDocuments({
        user: userId,
        returnedAt: null,
      }).session(session);

      const activeReservationsCount = await Reservation.countDocuments({
        user: userId,
        status: { $in: ["ACTIVE", "EXPECTANCY"] },
      }).session(session);

      const activeEngagements = activeLoansCount + activeReservationsCount;

      if (activeEngagements >= MAX_ACTIVE_ENGAGEMENTS) {
        throw new Error("Maximum active engagements reached");
      }

      const allActiveLoansCount = await Loan.countDocuments({
        book: bookId,
        returnedAt: null,
      }).session(session);

      const reservedCopiesCount = await Reservation.countDocuments({
        book: bookId,
        status: { $in: ["ACTIVE", "EXPECTANCY"] },
      }).session(session);

      const physicalCopies = book.quantity - book.lostCount - book.damagedCount;

      const freeCopies =
        physicalCopies - allActiveLoansCount - reservedCopiesCount;

      if (freeCopies > 0) {
        throw new Error("Book is currently available");
      }

      const createdReservation = await Reservation.create(
        [
          {
            user: userId,
            book: bookId,
          },
        ],
        { session }
      );
      await normalizeBookReservations(bookId, session);

      createdReservationToSend = createdReservation[0].toObject();
      createdReservationToSend.id = createdReservationToSend._id;
      createdReservationToSend.isbn = book.isbn;
      delete createdReservationToSend._id;
    });

    res.status(201).json({
      message: "Reservation created successfully",
      reservation: createdReservationToSend,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Reservation already exists",
      });
    }

    const ERROR_MAP = {
      "Invalid userId or bookId": { status: 400 },
      "User not found": { status: 404 },
      "Book not found": { status: 404 },
      "Book is currently available": { status: 409 },
      "Reservation already exists": { status: 409 },
      "Maximum active engagements reached": { status: 409 },
      "User has unpaid fines": { status: 403 },
    };

    const mapped = ERROR_MAP[error.message];
    if (mapped) {
      return res.status(mapped.status).json({
        message: error.message,
      });
    }

    console.error(error);
    res.status(500).json({
      message: "Failed to create reservation",
    });
  } finally {
    session.endSession();
  }
};

const cancelReservation = async (req, res) => {
  const { id: reservationId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reservationId)) {
    return res.status(400).json({
      message: "Invalid reservation id",
    });
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const reservation = await Reservation.findById(reservationId).session(
        session
      );

      if (!reservation) {
        throw new Error("RESERVATION_NOT_FOUND");
      }

      if (!["ACTIVE", "EXPECTANCY"].includes(reservation.status)) {
        throw new Error("RESERVATION_CANNOT_BE_CANCELLED");
      }

      reservation.status = "CANCELLED";
      await reservation.save({ session });

      await normalizeBookReservations(reservation.book, session);

      res.json({
        message: "Reservation cancelled successfully",
        status: reservation.status,
      });
    });
  } catch (error) {
    const errorMap = {
      RESERVATION_NOT_FOUND: { status: 404, message: "Reservation not found" },
      RESERVATION_CANNOT_BE_CANCELLED: {
        status: 409,
        message: "Reservation cannot be cancelled in its current status",
      },
    };

    const mapped = errorMap[error.message];

    if (mapped) {
      return res.status(mapped.status).json({ message: mapped.message });
    }

    console.error(error);
    res.status(500).json({
      message: "Failed to cancel reservation",
    });
  } finally {
    session.endSession();
  }
};

const fulfillReservation = async (req, res) => {
  const { id: reservationId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reservationId)) {
    return res.status(400).json({ message: "Invalid reservation id" });
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      let reservation = await Reservation.findById(reservationId).session(
        session
      );

      if (!reservation) {
        throw new Error("RESERVATION_NOT_FOUND");
      }

      const user = await User.findById(reservation.user).session(session);
      if (!user || !user.isActive) {
        throw new Error("USER_INVALID");
      }

      const book = await Book.findById(reservation.book).session(session);
      if (!book) {
        throw new Error("BOOK_NOT_FOUND");
      }

      await normalizeBookReservations(book._id, session);

      reservation = await Reservation.findById(reservationId).session(session);

      if (reservation.status !== "EXPECTANCY") {
        throw new Error("RESERVATION_NOT_EXPECTANCY");
      }

      const activeBookLoans = await Loan.countDocuments({
        book: book._id,
        returnedAt: null,
      }).session(session);

      const expectancyCount = await Reservation.countDocuments({
        book: book._id,
        status: "EXPECTANCY",
      }).session(session);

      const freeCopies =
        book.quantity - book.lostCount - book.damagedCount - activeBookLoans;

      if (freeCopies <= expectancyCount - 1) {
        throw new Error("BOOK_NOT_AVAILABLE");
      }

      const existingLoan = await Loan.findOne({
        user: user._id,
        book: book._id,
        returnedAt: null,
      }).session(session);

      if (existingLoan) {
        throw new Error("LOAN_ALREADY_EXISTS");
      }

      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + LOAN_DURATION_DAYS);

      await Loan.create(
        [
          {
            user: user._id,
            book: book._id,
            borrowedAt: new Date(),
            dueAt: dueAt,
          },
        ],
        { session }
      );

      reservation.status = "FULFILLED";
      reservation.fulfilledAt = new Date();
      await reservation.save({ session });

      await normalizeBookReservations(book._id, session);

      res.json({
        message: "Reservation fulfilled successfully",
        status: reservation.status,
      });
    });
  } catch (error) {
    const map = {
      RESERVATION_NOT_FOUND: [404, "Reservation not found"],
      RESERVATION_NOT_EXPECTANCY: [409, "Reservation is not ready for pickup"],
      RESERVATION_EXPIRED: [409, "Reservation expired"],
      USER_INVALID: [404, "User not found"],
      BOOK_NOT_FOUND: [404, "Book not found"],
      USER_LIMIT_REACHED: [409, "User reached loan limit"],
      BOOK_NOT_AVAILABLE: [409, "Book is no longer available"],
      LOAN_ALREADY_EXISTS: [409, "Loan already exists"],
    };

    const mapped = map[error.message];

    if (mapped) {
      return res.status(mapped[0]).json({ message: mapped[1] });
    }

    console.error(error);
    res.status(500).json({ message: "Failed to fulfill reservation" });
  } finally {
    session.endSession();
  }
};

async function promoteReservationToExpectancy(bookId, session) {
  const book = await Book.findById(bookId).session(session);
  if (!book) return;

  const activeLoansCount = await Loan.countDocuments({
    book: bookId,
    returnedAt: null,
  }).session(session);

  const expectancyCount = await Reservation.countDocuments({
    book: bookId,
    status: "EXPECTANCY",
  }).session(session);

  const freeCopies =
    book.quantity - book.lostCount - book.damagedCount - activeLoansCount;

  if (freeCopies <= expectancyCount) return;

  const reservation = await Reservation.findOne({
    book: bookId,
    status: "ACTIVE",
  })
    .sort({ reservedAt: 1 })
    .session(session);

  if (!reservation) return;

  reservation.status = "EXPECTANCY";
  reservation.expectancyStartedAt = new Date();
  await reservation.save({ session });
}

module.exports = {
  getUserReservations,
  createReservation,
  cancelReservation,
  fulfillReservation,
  promoteReservationToExpectancy,
};
