const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    telegramId: { type: String, required: true, unique: true, index: true },
    username: { type: String, default: "" },
    firstName: { type: String, default: "" },
    photoUrl: { type: String, default: "" },

    balance: { type: Number, default: 0 }, // APPLE balance
    usdtBalance: { type: Number, default: 0 }, // USDT balance (after swaps)

    // ---- Daily spin tracking ----
    lastSpinDate: { type: String, default: null }, // "YYYY-MM-DD"
    pendingSpinReward: { type: Number, default: 0 },

    // ---- Daily ads tracking ----
    adsWatchedToday: { type: Number, default: 0 },
    adsResetDate: { type: String, default: null },

    // ---- Tasks ----
    completedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],

    // ---- Referral system ----
    referredBy: { type: String, default: null },
    referralCount: { type: Number, default: 0 },
    qualifiedReferrals: { type: Number, default: 0 },
    commissionEarned: { type: Number, default: 0 },
    referralRewardGiven: { type: Boolean, default: false },

    // ---- Wallet ----
    walletAddress: { type: String, default: "" },
    country: { type: String, default: "" }, // IP se auto-detect hota hai login ke time

    usedPromoCodes: [{ type: String }],

    isBanned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
