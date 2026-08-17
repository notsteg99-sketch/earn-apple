const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    telegramId: { type: String, required: true, unique: true, index: true },
    username: { type: String, default: "" },
    firstName: { type: String, default: "" },
    photoUrl: { type: String, default: "" },

    balance: { type: Number, default: 0 }, // APPLE balance

    // ---- Daily spin tracking ----
    lastSpinDate: { type: String, default: null }, // "YYYY-MM-DD" format, server timezone
    pendingSpinReward: { type: Number, default: 0 }, // reward won, waiting for ad-claim

    // ---- Daily ads tracking ----
    adsWatchedToday: { type: Number, default: 0 },
    adsResetDate: { type: String, default: null }, // "YYYY-MM-DD"

    // ---- Tasks ----
    completedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],

    // ---- Referral system ----
    referredBy: { type: String, default: null }, // telegramId of referrer
    referralCount: { type: Number, default: 0 },
    qualifiedReferrals: { type: Number, default: 0 },
    commissionEarned: { type: Number, default: 0 },
    referralRewardGiven: { type: Boolean, default: false }, // 100 APPLE bonus given once referred user qualifies

    // ---- Wallet ----
    walletAddress: { type: String, default: "" },

    // ---- Promo codes already used by this user ----
    usedPromoCodes: [{ type: String }],

    isBanned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
