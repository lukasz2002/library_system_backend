const mongoose = require("mongoose");
const Reservation = require("../models/reservation.model");

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};

const requireSelfOrRole = (...roles) => {
  return (req, res, next) => {
    const requestedUserId = req.params.id || req.body.id;

    if (req.user.id === requestedUserId || roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ message: "Forbidden" });
  };
};

const requireReservationOwnerOrRole = (...roles) => {
  return async (req, res, next) => {
    const reservationId = req.params.id;

    if (roles.includes(req.user.role)) {
      return next();
    }

    if (!mongoose.Types.ObjectId.isValid(reservationId)) {
      return res.status(400).json({
        message: "Invalid reservation id",
      });
    }

    try {
      const reservation = await Reservation.findById(reservationId).select(
        "user"
      );

      if (!reservation) {
        return res.status(404).json({
          message: "Reservation not found",
        });
      }

      if (reservation.user.toString() === req.user.id) {
        return next();
      }

      return res.status(403).json({
        message: "Forbidden",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Authorization failed",
      });
    }
  };
};

module.exports = {
  requireRole,
  requireSelfOrRole,
  requireReservationOwnerOrRole,
};
