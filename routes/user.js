const express = require("express");
const router = express.Router();
const { telegramAuth } = require("../middleware/telegramAuth");
const { findOrCreateUser, resetDailyCountersIfNeeded } = require("../config/helpers");

// POST /api/auth  -> app khulte hi call hoga, user login/create karega
// body: { startParam: "738201455" }  (referrer ki telegramId, agar invite link se aaya ho)
router.post("/auth", telegramAuth, async (req, res) => {
  try {
    const referredBy = req.body.startParam && req.body.startParam !== req.telegramUser.id
      ? req.body.startParam
      : null;

    let user = await findOrCreateUser(req.telegramUser, referredBy);
    user = await resetDailyCountersIfNeeded(user);

    res.json({ user: formatUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/user/me -> current balance/profile refresh karne ke liye
router.get("/me", telegramAuth, async (req, res) => {
  try {
    let user = await findOrCreateUser(req.telegramUser);
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
    adsWatchedToday: user.adsWatchedToday,
    canSpinToday: user.lastSpinDate !== require("../config/helpers").todayStr(),
    pendingSpinReward: user.pendingSpinReward,
    walletAddress: user.walletAddress,
    referralCount: user.referralCount,
    qualifiedReferrals: user.qualifiedReferrals,
    commissionEarned: user.commissionEarned,
  };
}

module.exports = router;
