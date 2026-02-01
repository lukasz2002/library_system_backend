const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const startCrons = require("./cron/index.js");
const authRoutes = require("./routes/auth.routes.js");
const userRoutes = require("./routes/user.routes.js");
const bookRoutes = require("./routes/book.routes.js");
const loanRoutes = require("./routes/loan.routes.js");
const reservationRoutes = require("./routes/reservation.routes.js");
const fineRoutes = require("./routes/fine.routes.js");

startCrons();

const app = express();

app.use(
  cors({
    origin: "https://librarysystemfrontend.vercel.app",
    credentials: true,
  })
);

app.use(cookieParser());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/loan", loanRoutes);
app.use("/api/reservation", reservationRoutes);
app.use("/api/fine", fineRoutes);

app.get("/", (req, res) => {
  res.send("API running");
});

module.exports = app;
