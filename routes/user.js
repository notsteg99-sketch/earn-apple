const express = require("express");
const router = express.Router();
const { telegramAuth } = require("../middleware/telegramAuth");
const { findOrCreateUser, resetDailyCountersIfNeeded, todayStr } = require("../config/helpers");

router.post("/auth", telegramAuth, async (req, res) => {
  try {
    const referredBy = req.body.startParam && req.body.startParam !== req.telegramUser.id
      ? req.body.startParam
      : null;

    let user = await findOrCreateUser(req.telegramUser, referredBy, req.ip);
    user = await resetDailyCountersIfNeeded(user);

    res.json({ user: formatUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/me", telegramAuth, async (req, res) => {
  try {
    let user = await findOrCreateUser(req.telegramUser, null, req.ip);
    user = await resetDailyCountersIfNeeded(user);
    res.json({ user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

function formatUser(user) {
  return {
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    photoUrl: user.photoUrl,
    balance: user.balance,
    usdtBalance: Math.round(user.usdtBalance * 1e6) / 1e6,
    adsWatchedToday: user.adsWatchedToday,
    canSpinToday: user.lastSpinDate !== todayStr(),
    pendingSpinReward: user.pendingSpinReward,
    walletAddress: user.walletAddress,
    referralCount: user.referralCount,
    qualifiedReferrals: user.qualifiedReferrals,
    commissionEarned: user.commissionEarned,
  };
}

module.exports = router;
