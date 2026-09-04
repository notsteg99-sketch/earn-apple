const express = require("express");
const router = express.Router();
const { telegramAuth } = require("../middleware/telegramAuth");
const { findOrCreateUser } = require("../config/helpers");
const Transaction = require("../models/Transaction");
const Withdrawal = require("../models/Withdrawal");

const RATE = Number(process.env.APPLE_TO_USDT_RATE || 0.0001); // 100 APPLE = 0.01 USDT
const MIN_SWAP = Number(process.env.MIN_SWAP_APPLE || 100);
const MIN_WITHDRAW = Number(process.env.MIN_WITHDRAW_USDT || 0.1);
const WITHDRAW_FEE_RATE = Number(process.env.WITHDRAW_FEE_RATE || 0.2);

const BEP20_REGEX = /^0x[a-fA-F0-9]{40}$/;

// GET /api/wallet -> assets summary (balances) for the wallet screen
router.get("/", telegramAuth, async (req, res) => {
  try {
    const user = await findOrCreateUser(req.telegramUser);
    res.json({
      appleBalance: user.balance,
      usdtBalance: Math.round(user.usdtBalance * 1e6) / 1e6,
      appleUsdValue: Math.round(user.balance * RATE * 1e6) / 1e6,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

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
    user.usdtBalance += usdtAmount;
    await user.save();

    await Transaction.create({
      telegramId: user.telegramId,
      type: "swap",
      amount: appleAmount,
      currency: "APPLE",
      status: "completed",
      note: `Swapped for ${usdtAmount} USDT`,
    });

    res.json({
      balance: user.balance,
      usdtBalance: Math.round(user.usdtBalance * 1e6) / 1e6,
      usdtReceived: usdtAmount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/wallet/withdraw/quote  body: { amountUsdt }
router.post("/withdraw/quote", telegramAuth, async (req, res) => {
  const amountUsdt = Number(req.body.amountUsdt) || 0;
  const fee = Math.round(amountUsdt * WITHDRAW_FEE_RATE * 1e6) / 1e6;
  const receive = Math.round((amountUsdt - fee) * 1e6) / 1e6;
  res.json({ amountUsdt, feeRate: WITHDRAW_FEE_RATE, fee, receive });
});

// POST /api/wallet/withdraw  body: { amountUsdt, address }
router.post("/withdraw", telegramAuth, async (req, res) => {
  try {
    const amountUsdt = Number(req.body.amountUsdt);
    const address = String(req.body.address || "").trim();

    if (!BEP20_REGEX.test(address)) {
      return res.status(400).json({ error: "Enter a valid BEP-20 (BSC) address — must start with 0x and be 42 characters long" });
    }
    if (!amountUsdt || amountUsdt < MIN_WITHDRAW) {
      return res.status(400).json({ error: `Minimum withdrawal is ${MIN_WITHDRAW} USDT` });
    }

    const user = await findOrCreateUser(req.telegramUser);
    if (user.usdtBalance < amountUsdt) {
      return res.status(400).json({ error: "Insufficient USDT balance. Swap some APPLE first." });
    }

    const fee = Math.round(amountUsdt * WITHDRAW_FEE_RATE * 1e6) / 1e6;
    const netAmount = Math.round((amountUsdt - fee) * 1e6) / 1e6;

    user.usdtBalance -= amountUsdt;
    user.walletAddress = address;
    await user.save();

    const withdrawal = await Withdrawal.create({
      telegramId: user.telegramId,
      amountUsdt: netAmount,
      grossAmountUsdt: amountUsdt,
      feeUsdt: fee,
      address,
      status: "pending",
    });

    // Transaction ko withdrawal se link karte hain taaki admin approve/reject karte hi
    // history me status khud-ba-khud sahi ho jaye (pending -> completed/rejected)
    await Transaction.create({
      telegramId: user.telegramId,
      type: "withdraw",
      amount: amountUsdt,
      currency: "USDT",
      status: "pending",
      withdrawalId: withdrawal._id,
      note: `Withdrawal requested — fee ${fee} USDT, net ${netAmount} USDT to ${address}`,
    });

    res.json({
      withdrawalId: withdrawal._id,
      status: "pending",
      usdtBalance: Math.round(user.usdtBalance * 1e6) / 1e6,
      fee,
      netAmount,
    });
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
