const express = require("express");
const router = express.Router();
const { telegramAuth } = require("../middleware/telegramAuth");
const { findOrCreateUser } = require("../config/helpers");
const Transaction = require("../models/Transaction");
const Withdrawal = require("../models/Withdrawal");

const RATE = Number(process.env.APPLE_TO_USDT_RATE || 0.0001); // 100 APPLE = 0.01 USDT
const MIN_SWAP = Number(process.env.MIN_SWAP_APPLE || 100);
const MIN_WITHDRAW = Number(process.env.MIN_WITHDRAW_USDT || 0.1);

// POST /api/wallet/swap  body: { appleAmount: 500 }
router.post("/swap", telegramAuth, async (req, res) => {
  try {
    const appleAmount = Number(req.body.appleAmount);
    if (!appleAmount || appleAmount < MIN_SWAP) {
      return res.status(400).json({ error: `Minimum swap is ${MIN_SWAP} APPLE` });
    }

    const user = await findOrCreateUser(req.telegramUser);
    if (user.balance < appleAmount) {
      return res.status(400).json({ error: "Insufficient APPLE balance" });
    }

    const usdtAmount = Math.round(appleAmount * RATE * 1e6) / 1e6;
    user.balance -= appleAmount;
    // NOTE: production me ek "usdtBalance" field bhi User model me rakho.
    // Yahan simplicity ke liye seedha withdraw wallet me maan lete hain.
    await user.save();

    await Transaction.create({
      telegramId: user.telegramId,
      type: "swap",
      amount: appleAmount,
      currency: "APPLE",
      status: "completed",
      note: `Swapped for ${usdtAmount} USDT`,
    });

    res.json({ balance: user.balance, usdtReceived: usdtAmount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/wallet/withdraw  body: { amountUsdt: 0.5, address: "0x..." }
router.post("/withdraw", telegramAuth, async (req, res) => {
  try {
    const amountUsdt = Number(req.body.amountUsdt);
    const address = String(req.body.address || "").trim();

    if (!address || address.length < 20) {
      return res.status(400).json({ error: "Valid BEP-20 address required" });
    }
    if (!amountUsdt || amountUsdt < MIN_WITHDRAW) {
      return res.status(400).json({ error: `Minimum withdrawal is ${MIN_WITHDRAW} USDT` });
    }

    const user = await findOrCreateUser(req.telegramUser);
    user.walletAddress = address;
    await user.save();

    const withdrawal = await Withdrawal.create({
      telegramId: user.telegramId,
      amountUsdt,
      address,
      status: "pending",
    });

    await Transaction.create({
      telegramId: user.telegramId,
      type: "withdraw",
      amount: amountUsdt,
      currency: "USDT",
      status: "pending",
      note: `Withdrawal requested to ${address}`,
    });

    res.json({ withdrawalId: withdrawal._id, status: "pending" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/wallet/history
router.get("/history", telegramAuth, async (req, res) => {
  try {
    const user = await findOrCreateUser(req.telegramUser);
    const history = await Transaction.find({ telegramId: user.telegramId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
