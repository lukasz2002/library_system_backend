const Reservation = require("../models/reservation.model");
const Book = require("../models/book.model");
const Loan = require("../models/loan.model");
const { EXPIRY_MS } = require("../config/constants");

async function expireUserReservations(userId, session) {
  const expiryLimit = new Date(Date.now() - EXPIRY_MS);

  await Reservation.updateMany(
    {
      user: userId,
      status: "EXPECTANCY",
      expectancyStartedAt: { $lte: expiryLimit },
    },
    {
      $set: { status: "EXPIRED" },
    },
    { session }
  );
}

async function normalizeBookReservations(bookId, session) {
  const EXPIRY_MS = 2 * 24 * 60 * 60 * 1000;

  const expiryLimit = new Date(Date.now() - EXPIRY_MS);

  await Reservation.updateMany(
    {
      book: bookId,
      status: "EXPECTANCY",
      expectancyStartedAt: { $lte: expiryLimit },
    },
    { $set: { status: "EXPIRED" } },
    { session }
  );

  const book = await Book.findById(bookId).session(session);
  if (!book) return;

  const activeLoans = await Loan.countDocuments({
    book: bookId,
    returnedAt: null,
  }).session(session);

  const expectancyCount = await Reservation.countDocuments({
    book: bookId,
    status: "EXPECTANCY",
  }).session(session);

  const freeCopies =
    book.quantity - book.lostCount - book.damagedCount - activeLoans;

  const slots = freeCopies - expectancyCount;
  if (slots <= 0) return;

  const toPromote = await Reservation.find({
    book: bookId,
    status: "ACTIVE",
  })
    .sort({ reservedAt: 1 })
    .limit(slots)
    .session(session);

  for (const r of toPromote) {
    r.status = "EXPECTANCY";
    r.expectancyStartedAt = new Date();
    await r.save({ session });
  }
}

module.exports = {
  expireUserReservations,
  normalizeBookReservations,
};
