const Fine = require("../models/fine.model");
const Loan = require("../models/loan.model");

const {
  OVERDUE_PER_DAY_PLN,
  OVERDUE_MAX_PLN,
  LOST_BOOK_FINE_PLN,
  DAMAGED_BOOK_FINE_PLN,
} = require("../config/fines");

const DAY_MS = 1000 * 60 * 60 * 24;

function calculateFineAmount({ loan, lost, damaged }) {
  if (lost) return LOST_BOOK_FINE_PLN;
  if (damaged) return DAMAGED_BOOK_FINE_PLN;

  const now = new Date();
  if (loan.dueAt < now) {
    const daysOverdue = Math.ceil((now - loan.dueAt) / DAY_MS);
    return Math.min(daysOverdue * OVERDUE_PER_DAY_PLN, OVERDUE_MAX_PLN);
  }

  return 0;
}

async function normalizeFineAmount(fine, session) {
  let loan = fine.loan;

  if (!loan || !loan.dueAt) {
    loan = await Loan.findById(fine.loan).session(session);
  }

  if (!loan) return;

  const amount = calculateFineAmount({
    loan,
    lost: fine.reason === "LOST",
    damaged: fine.reason === "DAMAGED",
  });

  fine.amount = amount;
  fine.lastCalculatedAt = new Date();
  await fine.save({ session });
}

module.exports = { calculateFineAmount, normalizeFineAmount };
