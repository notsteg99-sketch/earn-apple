const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");

const User = require("../models/User");
const Task = require("../models/Task");
const PromoCode = require("../models/PromoCode");
const Withdrawal = require("../models/Withdrawal");

// Har admin route ADMIN_TELEGRAM_ID + ADMIN_SECRET header check karega
router.use(adminAuth);

// ---------- USERS ----------
router.get("/users", async (req, res) => {
  try {
    const users = await User.find()
      .select("telegramId firstName username balance referralCount qualifiedReferrals commissionEarned isBanned createdAt")
      .sort({ createdAt: -1 })
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

// POST /api/admin/promo  body: { code, reward, maxUses, expiresAt }
router.post("/promo", async (req, res) => {
  try {
    const { code, reward, maxUses, expiresAt } = req.body;

    if (!code || !String(code).trim()) {
      return res.status(400).json({ error: "Code is required" });
    }
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
    if (err.code === 11000) {
      return res.status(400).json({ error: "This code already exists — try a different one" });
    }
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

// POST /api/admin/tasks  body: { title, type, link, reward, chatId }
router.post("/tasks", async (req, res) => {
  try {
    const { title, type, link, reward, chatId } = req.body;

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
    });
    res.json({ task });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not create task" });
  }
});

router.delete("/tasks/:id", async (req, res) => {
  try {
    await Task.findByIdAndUpdate(req.params.id, { active: false });
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

router.post("/withdrawals/:id/approve", async (req, res) => {
  try {
    const w = await Withdrawal.findById(req.params.id);
    if (!w) return res.status(404).json({ error: "Not found" });
    w.status = "approved";
    w.txHash = req.body.txHash || "";
    w.processedAt = new Date();
    await w.save();
    res.json({ withdrawal: w });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/withdrawals/:id/reject", async (req, res) => {
  try {
    const w = await Withdrawal.findById(req.params.id);
    if (!w) return res.status(404).json({ error: "Not found" });
    w.status = "rejected";
    w.processedAt = new Date();
    await w.save();
    res.json({ withdrawal: w });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
