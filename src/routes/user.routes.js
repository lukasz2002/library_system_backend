const express = require("express");
const {
  getUserById,
  getUsersList,
  addMember,
  updateMember,
  deleteMember,
} = require("../controllers/user.controller");
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
  getUserById
);
router.get(
  "/",
  authMiddleware,
  requireRole("ADMIN", "LIBRARIAN"),
  getUsersList
);
router.post("/", authMiddleware, requireRole("ADMIN"), addMember);
router.put(
  "/:id",
  authMiddleware,
  requireSelfOrRole("ADMIN", "LIBRARIAN"),
  updateMember
);
router.delete(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "LIBRARIAN"),
  deleteMember
);

module.exports = router;
