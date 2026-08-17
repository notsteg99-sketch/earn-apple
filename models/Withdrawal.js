const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema(
  {
    telegramId: { type: String, required: true, index: true },
    amountUsdt: { type: Number, required: true },
    address: { type: String, required: true }, // BEP-20 address
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    txHash: { type: String, default: "" }, // admin fills this after sending manually
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Withdrawal", withdrawalSchema);
