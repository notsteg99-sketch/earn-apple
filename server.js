require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Serve the Mini App frontend (public/index.html) ----------
app.use(express.static(path.join(__dirname, "public")));

// ---------- Routes ----------
app.use("/api", require("./routes/user"));           // /api/auth, /api/user/me
app.use("/api/spin", require("./routes/spin"));       // /api/spin, /api/spin/claim
app.use("/api/ads", require("./routes/ads"));         // /api/ads/watch
app.use("/api/tasks", require("./routes/tasks"));     // /api/tasks, /api/tasks/:id/verify
app.use("/api/promo", require("./routes/promo"));     // /api/promo/claim
app.use("/api/referral", require("./routes/referral"));// /api/referral/me
app.use("/api/wallet", require("./routes/wallet"));   // /api/wallet/swap, /withdraw, /history
app.use("/api/admin", require("./routes/admin"));     // admin-only routes
app.use("/api/settings", require("./routes/settings")); // public — current reward values

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "earn-apple-backend" }));

// ---------- Global error handler ----------
// Koi bhi route crash ho (jaise validation error), yeh handler use hamesha
// readable JSON me convert karega instead of raw HTML error page — taaki
// admin panel / mini app ko hamesha samajh aane wala error message mile.
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    // Start the Telegram bot (handles /start, sends withdrawal notifications)
    require("./config/bot");
    console.log("🤖 Telegram bot polling started");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
