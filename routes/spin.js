const express = require("express");
const router = express.Router();
const { telegramAuth } = require("../middleware/telegramAuth");
const { findOrCreateUser, todayStr, creditReferralCommission } = require("../config/helpers");
const Transaction = require("../models/Transaction");

// Spin ke segments aur unke chances (jo tune bataye the)
const SEGMENTS = [
  { value: 10, weight: 10 },
  { value: 15, weight: 20 },
  { value: 20, weight: 20 },
  { value: 25, weight: 20 },
  { value: 30, weight: 20 },
  { value: 50, weight: 8 },
  { value: 100, weight: 2 },
];

function pickReward() {
  const total = SEGMENTS.reduce((a, s) => a + s.weight, 0);
  let r = Math.random() * total;
  for (const s of SEGMENTS) {
    if (r < s.weight) return s.value;
    r -= s.weight;
  }
  return SEGMENTS[0].value;
}

// POST /api/spin  -> ek din me sirf ek baar chalega (server pe check hota hai, client pe nahi -
// isliye user "back jaake dobara spin" nahi maar sakta, chahe client ka localStorage clear kar de)
router.post("/", telegramAuth, async (req, res) => {
  try {
    const user = await findOrCreateUser(req.telegramUser);
    const today = todayStr();

    if (user.lastSpinDate === today) {
      return res.status(400).json({ error: "Aaj ka spin already use ho chuka hai. Kal wapas aana!" });
    }

    const reward = pickReward();
    user.lastSpinDate = today;
    user.pendingSpinReward = reward; // ad dekhne ke baad claim hoga
    await user.save();

    res.json({ reward });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/spin/claim -> Adsgram ad complete hone ke baad frontend yeh call karega
router.post("/claim", telegramAuth, async (req, res) => {
  try {
    const user = await findOrCreateUser(req.telegramUser);

    if (!user.pendingSpinReward || user.pendingSpinReward <= 0) {
      return res.status(400).json({ error: "Koi pending reward nahi hai" });
    }

    const reward = user.pendingSpinReward;
    user.balance += reward;
    user.pendingSpinReward = 0;
    await user.save();

    await Transaction.create({
      telegramId: user.telegramId,
      type: "spin",
      amount: reward,
      status: "completed",
      note: "Daily spin reward claimed after ad",
    });

    await creditReferralCommission(user, reward);

    res.json({ balance: user.balance, claimed: reward });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
