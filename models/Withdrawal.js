const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema(
  {
    telegramId: { type: String, required: true, index: true },
    amountUsdt: { type: Number, required: true }, // net amount actually sent (after fee)
    grossAmountUsdt: { type: Number, default: 0 }, // amount before fee was deducted
    feeUsdt: { type: Number, default: 0 },
    address: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    txHash: { type: String, default: "" },
    refunded: { type: Boolean, default: false }, // agar reject hone pe USDT wapas credit kiya gaya
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Withdrawal", withdrawalSchema);
