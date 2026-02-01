const mongoose = require("mongoose");
const User = require("../models/user.model");
const Book = require("../models/book.model");
const Loan = require("../models/loan.model");
const Fine = require("../models/fine.model");
const {
  calculateFineAmount,
  normalizeFineAmount,
} = require("../utils/fine.utils");

// const getUserFines = async (req, res) => {
//   const { id: userId } = req.params;

//   if (!mongoose.Types.ObjectId.isValid(userId)) {
//     return res.status(400).json({
//       message: "Invalid user id",
//     });
//   }

//   try {
//     const fines = await Fine.aggregate([
//       {
//         $match: {
//           user: new mongoose.Types.ObjectId(userId),
//         },
//       },

//       {
//         $lookup: {
//           from: "books",
//           localField: "book",
//           foreignField: "_id",
//           as: "book",
//         },
//       },

//       {
//         $unwind: "$book",
//       },

//       {
//         $project: {
//           _id: 1,
//           amount: 1,
//           currency: 1,
//           status: 1,
//           reason: 1,
//           paidAt: 1,
//           startedAt: 1,
//           loan: 1,
//           isbn: "$book.isbn",
//         },
//       },

//       {
//         $sort: {
//           startedAt: -1,
//         },
//       },
//     ]);

//     res.json(fines);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       message: "Failed to fetch fines",
//     });
//   }
// };

const getUserFines = async (req, res) => {
  const { id: userId } = req.params;

  try {
    const fines = await Fine.find({ user: userId })
      .populate("loan", "dueAt")
      .populate("book", "isbn")
      .lean();

    const finesForUI = fines.map((fine) => {
      let amountToShow = fine.amount;

      if (fine.status === "OPEN") {
        if (fine.loan) {
          amountToShow = calculateFineAmount({
            loan: fine.loan,
            lost: fine.reason === "LOST",
            damaged: fine.reason === "DAMAGED",
          });
        }
      }

      return {
        id: fine._id,
        book: fine.book.isbn,
        status: fine.status,
        reason: fine.reason,
        amount: amountToShow,
        currency: fine.currency,
        startedAt: fine.startedAt,
        paidAt: fine.paidAt,
      };
    });

    res.json(finesForUI);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to fetch user fines",
    });
  }
};

const updateFineStatus = async (req, res) => {
  const { id: fineId } = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(fineId)) {
    return res.status(400).json({
      message: "Invalid fine id",
    });
  }

  if (!["PAID", "WAIVED"].includes(status)) {
    return res.status(400).json({
      message: "Invalid status transition",
    });
  }

  try {
    const fine = await Fine.findById(fineId);

    if (!fine) {
      return res.status(404).json({
        message: "Fine not found",
      });
    }

    if (fine.status !== "OPEN") {
      return res.status(409).json({
        message: "Fine is already closed",
      });
    }

    await normalizeFineAmount(fine);

    fine.status = status;

    if (status === "PAID") {
      fine.paidAt = new Date();
    }

    if (status === "WAIVED") {
      fine.waivedAt = new Date();
      fine.waivedBy = req.user.id;
    }

    await fine.save();

    res.json({
      message: `Fine ${status.toLowerCase()} successfully`,
      status: fine.status,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to update fine status",
    });
  }
};

module.exports = {
  getUserFines,
  updateFineStatus,
};
