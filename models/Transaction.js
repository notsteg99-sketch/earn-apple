const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    telegramId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["spin", "ad", "task", "promo", "referral", "swap", "withdraw"],
      required: true,
    },
    amount: { type: Number, required: true }, // APPLE amount (or USDT for withdraw)
    currency: { type: String, enum: ["APPLE", "USDT"], default: "APPLE" },
    status: {
      type: String,
      enum: ["completed", "pending", "rejected"],
      default: "completed",
    },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
