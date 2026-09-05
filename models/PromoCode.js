const mongoose = require("mongoose");

const promoCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    reward: { type: Number, required: true }, // APPLE amount
    maxUses: { type: Number, default: 1000 },
    usedCount: { type: Number, default: 0 },
    usedBy: [{ type: String }], // telegramIds
    expiresAt: { type: Date, default: null }, // null = never expires
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PromoCode", promoCodeSchema);
