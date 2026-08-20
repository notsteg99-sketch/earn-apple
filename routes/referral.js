const express = require("express");
const router = express.Router();
const { telegramAuth } = require("../middleware/telegramAuth");
const { findOrCreateUser } = require("../config/helpers");
const User = require("../models/User");

// GET /api/referral/me -> apna referral link, stats aur referred users ki list
router.get("/me", telegramAuth, async (req, res) => {
  try {
    const user = await findOrCreateUser(req.telegramUser);
    const botUsername = process.env.BOT_USERNAME || "EarnAppleBot";

    const referred = await User.find({ referredBy: user.telegramId }).select(
      "firstName username adsWatchedToday completedTasks referralRewardGiven"
    );

    const referredList = referred.map((r) => ({
      name: r.firstName || r.username || "User",
      qualified: r.referralRewardGiven,
      tasksCompleted: r.completedTasks.length,
      adsToday: r.adsWatchedToday,
    }));

    res.json({
      referralLink: `https://t.me/${botUsername}?start=${user.telegramId}`,
      totalInvites: user.referralCount,
      qualifiedReferrals: user.qualifiedReferrals,
      commissionEarned: user.commissionEarned,
      referredUsers: referredList,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
