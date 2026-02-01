const cron = require("node-cron");
const mongoose = require("mongoose");

const Reservation = require("../models/reservation.model");

const { normalizeBookReservations } = require("../utils/reservation.utils");

function startReservationCron() {
  cron.schedule("*/5 * * * *", async () => {
    console.log("Reservation cron running...");

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const bookIds = await Reservation.distinct("book", {
          status: { $in: ["ACTIVE", "EXPECTANCY"] },
        }).session(session);

        for (const bookId of bookIds) {
          await normalizeBookReservations(bookId, session);
        }
      });
    } catch (err) {
      console.error("Reservation cron error:", err);
    } finally {
      session.endSession();
    }
  });
}

module.exports = startReservationCron;
