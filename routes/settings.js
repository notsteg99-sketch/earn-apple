const express = require("express");
const router = express.Router();
const { getSettings } = require("../config/helpers");

// GET /api/settings -> public, koi auth nahi chahiye (sirf reward values dikhane ke liye)
router.get("/", async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({
      adRewardApple: settings.adRewardApple,
      dailyAdLimit: settings.dailyAdLimit,
      referralBonusApple: settings.referralBonusApple,
      referralCommissionRate: settings.referralCommissionRate,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
