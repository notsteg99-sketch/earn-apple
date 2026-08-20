const express = require("express");
const router = express.Router();
const { telegramAuth } = require("../middleware/telegramAuth");
const {
  findOrCreateUser,
  resetDailyCountersIfNeeded,
  checkReferralQualification,
  creditReferralCommission,
  getSettings,
} = require("../config/helpers");
const Transaction = require("../models/Transaction");

const DAILY_LIMIT = Number(process.env.DAILY_AD_LIMIT || 14);

// POST /api/ads/watch -> Adsgram ad complete hone ke baad frontend call karega
router.post("/watch", telegramAuth, async (req, res) => {
  try {
    let user = await findOrCreateUser(req.telegramUser);
    user = await resetDailyCountersIfNeeded(user);

    if (user.adsWatchedToday >= DAILY_LIMIT) {
      return res.status(400).json({ error: `Aaj ki ${DAILY_LIMIT} ads ki limit khatam ho gayi hai.` });
    }

    const settings = await getSettings();
    const reward = settings.adRewardApple;

    user.adsWatchedToday += 1;
    user.balance += reward;
    await user.save();

    await Transaction.create({
      telegramId: user.telegramId,
      type: "ad",
      amount: reward,
      status: "completed",
      note: "Watch & earn ad reward",
    });

    await checkReferralQualification(user);
    await creditReferralCommission(user, reward);

    res.json({ balance: user.balance, adsWatchedToday: user.adsWatchedToday, limit: DAILY_LIMIT, reward });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
