const express = require("express");
const {
  getBookById,
  getBooksList,
  getBooksListUnavailable,
  createBook,
  updateBook,
  deleteBook,
} = require("../controllers/book.controller");
const { authMiddleware } = require("../middlewares/authMiddleware");
const {
  requireRole,
  requireSelfOrRole,
} = require("../middlewares/roleOrSelfMiddleware");

const router = express.Router();

router.get(
  "/unavailable",
  authMiddleware,
  requireRole("ADMIN", "LIBRARIAN", "MEMBER"),
  getBooksListUnavailable
);
router.get(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "LIBRARIAN"),
  getBookById
);
router.get(
  "/",
  authMiddleware,
  requireRole("ADMIN", "LIBRARIAN", "MEMBER"),
  getBooksList
);
router.post("/", authMiddleware, requireRole("ADMIN", "LIBRARIAN"), createBook);
router.put(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "LIBRARIAN"),
  updateBook
);
router.delete(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "LIBRARIAN"),
  deleteBook
);

module.exports = router;
