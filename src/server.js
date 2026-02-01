require("dotenv/config");
const app = require("./app.js");
const connectDB = require("./config/db.js");
const createInitialAdmin = require("./scripts/createInitialAdmin.js");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 3000;

connectDB().then(async () => {
  await createInitialAdmin();
  await mongoose.connection.syncIndexes();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
