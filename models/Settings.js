const mongoose = require("mongoose");

// Singleton document — poore app ki configurable values yahan store hoti hain
// taaki admin panel se hi change ho sake, code/redeploy ki zarurat na pade.
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "app_settings", unique: true },
    adRewardApple: { type: Number, default: 15 },        // Watch & Earn ad ka reward
    referralBonusApple: { type: Number, default: 100 },   // Refer-a-friend qualify hone pe bonus
    referralCommissionRate: { type: Number, default: 0.1 }, // 10% lifetime commission
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
