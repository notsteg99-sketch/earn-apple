const express = require("express");
const router = express.Router();
const { telegramAuth } = require("../middleware/telegramAuth");
const { findOrCreateUser } = require("../config/helpers");
const PromoCode = require("../models/PromoCode");
const Transaction = require("../models/Transaction");

// POST /api/promo/claim  body: { code: "APPLE500" }
router.post("/claim", telegramAuth, async (req, res) => {
  try {
    const code = String(req.body.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ error: "Code required" });

    const promo = await PromoCode.findOne({ code });
    if (!promo || !promo.active) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }
    if (promo.expiresAt && new Date() > promo.expiresAt) {
      return res.status(400).json({ error: "This code has expired" });
    }
    if (promo.usedCount >= promo.maxUses) {
      return res.status(400).json({ error: "This code has reached its usage limit" });
    }

    const user = await findOrCreateUser(req.telegramUser);
    if (user.usedPromoCodes.includes(code)) {
      return res.status(400).json({ error: "You already used this code" });
    }

    user.balance += promo.reward;
    user.usedPromoCodes.push(code);
    await user.save();

    promo.usedCount += 1;
    promo.usedBy.push(user.telegramId);
    await promo.save();

    await Transaction.create({
      telegramId: user.telegramId,
      type: "promo",
      amount: promo.reward,
      status: "completed",
      note: `Promo code: ${code}`,
    });

    res.json({ balance: user.balance, reward: promo.reward });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
