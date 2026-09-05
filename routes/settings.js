const express = require("express");
const router = express.Router();
const { getSettings } = require("../config/helpers");

// GET /api/settings -> public, koi auth nahi chahiye
router.get("/", async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({
      adRewardApple: settings.adRewardApple,
      dailyAdLimit: settings.dailyAdLimit,
      referralBonusApple: settings.referralBonusApple,
      referralCommissionRate: settings.referralCommissionRate,
      activeAdNetwork: settings.activeAdNetwork,
      showPaymentBanner: settings.showPaymentBanner,
      showWithdrawButton: settings.showWithdrawButton,
      showLeaderboard: settings.showLeaderboard,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
