require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Routes ----------
app.use("/api", require("./routes/user"));           // /api/auth, /api/user/me
app.use("/api/spin", require("./routes/spin"));       // /api/spin, /api/spin/claim
app.use("/api/ads", require("./routes/ads"));         // /api/ads/watch
app.use("/api/tasks", require("./routes/tasks"));     // /api/tasks, /api/tasks/:id/complete
app.use("/api/promo", require("./routes/promo"));     // /api/promo/claim
app.use("/api/referral", require("./routes/referral"));// /api/referral/me
app.use("/api/wallet", require("./routes/wallet"));   // /api/wallet/swap, /withdraw, /history
app.use("/api/admin", require("./routes/admin"));     // admin-only routes

app.get("/", (req, res) => res.send("EARN APPLE backend is running ✅"));

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
