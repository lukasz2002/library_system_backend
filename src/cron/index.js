const startReservationCron = require("./expiredReservations.cron.js");

function startCrons() {
  startReservationCron();
}

module.exports = startCrons;
