const express = require("express");
const {
  getUserLoansList,
  createLoan,
  setLoanToReturned,
  updateLoanDueDate,
} = require("../controllers/loan.controller");
const { authMiddleware } = require("../middlewares/authMiddleware");
const {
  requireRole,
  requireSelfOrRole,
} = require("../middlewares/roleOrSelfMiddleware");

const router = express.Router();

router.get(
  "/:id",
  authMiddleware,
  requireSelfOrRole("ADMIN", "LIBRARIAN"),
  getUserLoansList
);
router.post("/", authMiddleware, requireRole("ADMIN", "LIBRARIAN"), createLoan);
router.patch(
  "/:id/return",
  authMiddleware,
  requireRole("ADMIN", "LIBRARIAN"),
  setLoanToReturned
);
router.patch(
  "/:id/due-date",
  authMiddleware,
  requireRole("ADMIN", "LIBRARIAN"),
  updateLoanDueDate
);

module.exports = router;
