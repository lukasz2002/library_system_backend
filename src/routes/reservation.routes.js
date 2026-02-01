const express = require("express");
const {
  getUserReservations,
  createReservation,
  cancelReservation,
  fulfillReservation,
} = require("../controllers/reservation.controller");
const { authMiddleware } = require("../middlewares/authMiddleware");
const {
  requireRole,
  requireSelfOrRole,
  requireReservationOwnerOrRole,
} = require("../middlewares/roleOrSelfMiddleware");

const router = express.Router();

router.get(
  "/:id",
  authMiddleware,
  requireSelfOrRole("ADMIN", "LIBRARIAN"),
  getUserReservations
);
router.post(
  "/",
  authMiddleware,
  requireRole("ADMIN", "LIBRARIAN"),
  createReservation
);
router.patch(
  "/:id/cancel",
  authMiddleware,
  requireReservationOwnerOrRole("ADMIN", "LIBRARIAN"),
  cancelReservation
);
router.patch(
  "/:id/fulfill",
  authMiddleware,
  requireRole("ADMIN", "LIBRARIAN"),
  fulfillReservation
);

module.exports = router;
