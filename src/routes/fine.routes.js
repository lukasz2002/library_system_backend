const express = require("express");
const {
  getUserFines,
  updateFineStatus,
} = require("../controllers/fine.controller");
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
  getUserFines
);
router.patch(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "LIBRARIAN"),
  updateFineStatus
);

module.exports = router;
