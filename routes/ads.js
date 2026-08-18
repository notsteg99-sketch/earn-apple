const express = require("express");
const router = express.Router();
const { telegramAuth } = require("../middleware/telegramAuth");
const { findOrCreateUser, resetDailyCountersIfNeeded, checkReferralQualification, creditReferralCommission } = require("../config/helpers");
const Transaction = require("../models/Transaction");

const DAILY_LIMIT = Number(process.env.DAILY_AD_LIMIT || 14);
const AD_REWARD = Number(process.env.AD_REWARD_APPLE || 15);

// POST /api/ads/watch -> Adsgram ad complete hone ke baad frontend call karega
// IMPORTANT: production me is route ko trust-by-client mat rakhna. Adsgram
// server-to-server reward callback/postback use karo taaki koi fake request
// bhej ke free APPLE na le sake. Filhal yeh simple client-trust version hai.
router.post("/watch", telegramAuth, async (req, res) => {
  try {
    let user = await findOrCreateUser(req.telegramUser);
    user = await resetDailyCountersIfNeeded(user);

    if (user.adsWatchedToday >= DAILY_LIMIT) {
      return res.status(400).json({ error: `Aaj ki ${DAILY_LIMIT} ads ki limit khatam ho gayi hai.` });
    }

    user.adsWatchedToday += 1;
    user.balance += AD_REWARD;
    await user.save();

    await Transaction.create({
      telegramId: user.telegramId,
      type: "ad",
      amount: AD_REWARD,
      status: "completed",
      note: "Watch & earn ad reward",
    });

    await checkReferralQualification(user);
    await creditReferralCommission(user, AD_REWARD);

    res.json({ balance: user.balance, adsWatchedToday: user.adsWatchedToday, limit: DAILY_LIMIT });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
