const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");

const User = require("../models/User");
const Task = require("../models/Task");
const PromoCode = require("../models/PromoCode");
const Withdrawal = require("../models/Withdrawal");
const Transaction = require("../models/Transaction");
const bot = require("../config/bot");
const { getSettings } = require("../config/helpers");

router.use(adminAuth);

// ---------- SETTINGS ----------
router.get("/settings", async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({ settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/settings", async (req, res) => {
  try {
    const { adRewardApple, dailyAdLimit, referralBonusApple, referralCommissionRate, referralTasksRequired, activeAdNetwork } = req.body;
    const settings = await getSettings();

    if (adRewardApple !== undefined && adRewardApple !== "" && !isNaN(Number(adRewardApple))) {
      settings.adRewardApple = Number(adRewardApple);
    }
    if (dailyAdLimit !== undefined && dailyAdLimit !== "" && !isNaN(Number(dailyAdLimit))) {
      settings.dailyAdLimit = Number(dailyAdLimit);
    }
    if (referralBonusApple !== undefined && referralBonusApple !== "" && !isNaN(Number(referralBonusApple))) {
      settings.referralBonusApple = Number(referralBonusApple);
    }
    if (referralCommissionRate !== undefined && referralCommissionRate !== "" && !isNaN(Number(referralCommissionRate))) {
      settings.referralCommissionRate = Number(referralCommissionRate) / 100;
    }
    if (referralTasksRequired !== undefined && referralTasksRequired !== "" && !isNaN(Number(referralTasksRequired))) {
      settings.referralTasksRequired = Number(referralTasksRequired);
    }
    if (activeAdNetwork !== undefined && ["monetag"].includes(activeAdNetwork)) {
      settings.activeAdNetwork = activeAdNetwork;
    }

    await settings.save();
    res.json({ settings });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// ---------- USERS ----------
router.get("/users", async (req, res) => {
  try {
    const { search = "", sortBy = "createdAt", order = "desc" } = req.query;

    const filter = {};
    if (search.trim()) {
      const re = new RegExp(search.trim(), "i");
      filter.$or = [{ telegramId: re }, { firstName: re }, { username: re }];
    }

    const allowedSort = ["createdAt", "balance", "usdtBalance", "referralCount", "commissionEarned"];
    const sortField = allowedSort.includes(sortBy) ? sortBy : "createdAt";
    const sortOrder = order === "asc" ? 1 : -1;

    const users = await User.find(filter)
      .select("telegramId firstName username balance usdtBalance referralCount qualifiedReferrals commissionEarned isBanned country createdAt")
      .sort({ [sortField]: sortOrder })
      .limit(500);

    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/users/:telegramId/ban", async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.params.telegramId });
    if (!user) return res.status(404).json({ error: "User not found" });
    user.isBanned = !user.isBanned;
    await user.save();
    res.json({ isBanned: user.isBanned });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- PROMO CODES ----------
router.get("/promo", async (req, res) => {
  try {
    const codes = await PromoCode.find().sort({ createdAt: -1 });
    res.json({ codes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/promo", async (req, res) => {
  try {
    const { code, reward, maxUses, expiresAt } = req.body;
    if (!code || !String(code).trim()) return res.status(400).json({ error: "Code is required" });
    if (reward === undefined || reward === "" || isNaN(Number(reward))) {
      return res.status(400).json({ error: "A valid numeric reward is required" });
    }

    const promo = await PromoCode.create({
      code: String(code).trim().toUpperCase(),
      reward: Number(reward),
      maxUses: maxUses ? Number(maxUses) : 1000,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });
    res.json({ promo });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) return res.status(400).json({ error: "This code already exists — try a different one" });
    res.status(400).json({ error: err.message || "Could not create code" });
  }
});

router.post("/promo/:id/toggle", async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) return res.status(404).json({ error: "Not found" });
    promo.active = !promo.active;
    await promo.save();
    res.json({ active: promo.active });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/promo/:id -> permanently remove
router.delete("/promo/:id", async (req, res) => {
  try {
    await PromoCode.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- TASKS ----------
router.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json({ tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/tasks", async (req, res) => {
  try {
    const { title, type, link, reward, chatId, maxClaims } = req.body;

    if (!title || !String(title).trim()) return res.status(400).json({ error: "Title is required" });
    if (!link || !String(link).trim()) return res.status(400).json({ error: "Link is required" });
    if (reward === undefined || reward === "" || isNaN(Number(reward))) {
      return res.status(400).json({ error: "A valid numeric reward is required" });
    }

    const task = await Task.create({
      title: String(title).trim(),
      type: type || "custom",
      link: String(link).trim(),
      chatId: chatId ? String(chatId).trim() : "",
      reward: Number(reward),
      maxClaims: maxClaims ? Number(maxClaims) : 0,
    });
    res.json({ task });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not create task" });
  }
});

// POST /api/admin/tasks/:id/edit-reward  body: { reward }
router.post("/tasks/:id/edit-reward", async (req, res) => {
  try {
    const reward = Number(req.body.reward);
    if (isNaN(reward) || reward <= 0) return res.status(400).json({ error: "Enter a valid reward amount" });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    task.reward = reward;
    await task.save();
    res.json({ task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/tasks/:id/toggle", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Not found" });
    task.active = !task.active;
    await task.save();
    res.json({ active: task.active });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/tasks/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- WITHDRAWALS ----------
router.get("/withdrawals", async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const withdrawals = await Withdrawal.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ withdrawals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

function shortId(id) {
  return "tx_" + String(id).slice(-10);
}

// POST /api/admin/withdrawals/:id/approve  body: { txHash }
router.post("/withdrawals/:id/approve", async (req, res) => {
  try {
    const w = await Withdrawal.findById(req.params.id);
    if (!w) return res.status(404).json({ error: "Not found" });
    if (w.status !== "pending") return res.status(400).json({ error: "This request was already processed" });

    const txHash = req.body.txHash || "";
    w.status = "approved";
    w.txHash = txHash;
    w.processedAt = new Date();
    await w.save();

    // Transaction history me bhi status turant sync karo (yehi "hamesha pending dikhta hai" wala bug fix karta hai)
    await Transaction.updateMany({ withdrawalId: w._id }, { status: "completed" });

    const user = await User.findOne({ telegramId: w.telegramId });
    const name = user?.firstName || user?.username || "User";
    const username = user?.username ? `@${user.username}` : "—";
    const time = w.processedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    const botUsername = process.env.BOT_USERNAME || "EARN_APPLE_BOT";
    const appUrl = process.env.APP_URL || "https://earn-apple-production-aad6.up.railway.app";
    const requestId = shortId(w._id);

    // ---- User ko DM ----
    bot.sendMessage(
      w.telegramId,
      `✅ *Withdrawal Successful*\n\n` +
        `Your withdrawal has been processed and sent.\n\n` +
        `💵 Amount: \`${w.amountUsdt} USDT\`\n` +
        `📤 Address: \`${w.address}\`\n` +
        `🔗 Tx Hash: \`${txHash || "—"}\`\n\n` +
        `Thank you for using EARN APPLE!`,
      { parse_mode: "Markdown" }
    ).catch((e) => console.error("Notify user failed:", e.message));

    // ---- Payment channel me professional receipt ----
    const paymentChannel = process.env.PAYMENT_CHANNEL_ID || "@EARNAPPLEPAYMENT";
    const buttons = [];
    if (txHash) {
      buttons.push([{ text: "🔍 BscScan Transaction", url: `https://bscscan.com/tx/${txHash}` }]);
    }
    buttons.push([
      { text: "🤖 Open Bot", url: `https://t.me/${botUsername}` },
      { text: "🍎 Mini App", url: appUrl },
    ]);

    bot.sendMessage(
      paymentChannel,
      `🍎 *EARN APPLE — Payment Channel*\n` +
        `✅ *Payout Confirmed*\n\n` +
        `👤 User: ${name} (${username})\n` +
        `🆔 Telegram ID: \`${w.telegramId}\`\n` +
        `💵 Gross Amount: \`${w.grossAmountUsdt || w.amountUsdt} USDT\`\n` +
        `💸 Fee: \`${w.feeUsdt || 0} USDT\`\n` +
        `✅ Paid: \`${w.amountUsdt} USDT\`\n` +
        `🌐 Network: BEP-20 (BSC)\n` +
        `📤 To: \`${w.address}\`\n` +
        `🔖 Request: \`${requestId}\`\n` +
        `🔗 Tx: \`${txHash || "—"}\`\n` +
        `🕒 Time: ${time}`,
      { parse_mode: "Markdown", reply_markup: { inline_keyboard: buttons } }
    ).catch((e) => console.error("Channel post failed:", e.message));

    res.json({ withdrawal: w });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/withdrawals/:id/reject  body: { refund: true|false }
router.post("/withdrawals/:id/reject", async (req, res) => {
  try {
    const w = await Withdrawal.findById(req.params.id);
    if (!w) return res.status(404).json({ error: "Not found" });
    if (w.status !== "pending") return res.status(400).json({ error: "This request was already processed" });

    const shouldRefund = !!req.body.refund;

    w.status = "rejected";
    w.processedAt = new Date();
    w.refunded = shouldRefund;
    await w.save();

    // Transaction history me bhi status sync karo
    await Transaction.updateMany({ withdrawalId: w._id }, { status: "rejected" });

    if (shouldRefund) {
      await User.updateOne({ telegramId: w.telegramId }, { $inc: { usdtBalance: w.grossAmountUsdt || w.amountUsdt } });
    }

    bot.sendMessage(
      w.telegramId,
      `❌ *Withdrawal Rejected*\n\n` +
        `Your withdrawal request of \`${w.amountUsdt} USDT\` could not be processed.\n` +
        (shouldRefund
          ? `The amount has been refunded to your USDT wallet balance.\n\n`
          : `Please contact support for more details.\n\n`) +
        `If you have questions, reach out to our support team.`,
      { parse_mode: "Markdown" }
    ).catch((e) => console.error("Notify user failed:", e.message));

    res.json({ withdrawal: w });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
