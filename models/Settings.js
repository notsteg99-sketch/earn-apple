const mongoose = require("mongoose");

// Singleton document — poore app ki configurable values yahan store hoti hain
// taaki admin panel se hi change ho sake, code/redeploy ki zarurat na pade.
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "app_settings", unique: true },
    adRewardApple: { type: Number, default: 15 },        // Watch & Earn ad ka reward
    dailyAdLimit: { type: Number, default: 14 },           // Ek din me max kitni ads watch ki ja sakti hain
    referralBonusApple: { type: Number, default: 100 },   // Refer-a-friend qualify hone pe bonus
    referralTasksRequired: { type: Number, default: 10 }, // Kitne tasks complete karne pe referral qualify ho
    referralCommissionRate: { type: Number, default: 0.1 }, // 10% lifetime commission
    activeAdNetwork: { type: String, enum: ["monetag", "gigapub", "both", "none"], default: "monetag" }, // "both" = GigaPub pehle, fir Monetag; "none" = ads bilkul disabled
    showPaymentBanner: { type: Boolean, default: true }, // Home page pe "Live Payment Proofs" banner
    showWithdrawButton: { type: Boolean, default: true }, // Home page pe quick Withdraw button
    showLeaderboard: { type: Boolean, default: true }, // Home page pe Leaderboard entry point
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
