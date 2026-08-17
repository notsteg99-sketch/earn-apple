const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");

const User = require("../models/User");
const Task = require("../models/Task");
const PromoCode = require("../models/PromoCode");
const Withdrawal = require("../models/Withdrawal");

// Har admin route ADMIN_TELEGRAM_ID + ADMIN_SECRET header check karega (see middleware/adminAuth.js)
router.use(adminAuth);

// ---------- USERS ----------
// GET /api/admin/users
router.get("/users", async (req, res) => {
  const users = await User.find()
    .select("telegramId firstName username balance referralCount qualifiedReferrals commissionEarned isBanned createdAt")
    .sort({ createdAt: -1 })
    .limit(500);
  res.json({ users });
});

// POST /api/admin/users/:telegramId/ban  (toggle ban)
router.post("/users/:telegramId/ban", async (req, res) => {
  const user = await User.findOne({ telegramId: req.params.telegramId });
  if (!user) return res.status(404).json({ error: "User not found" });
  user.isBanned = !user.isBanned;
  await user.save();
  res.json({ isBanned: user.isBanned });
});

// ---------- PROMO CODES ----------
// GET /api/admin/promo
router.get("/promo", async (req, res) => {
  const codes = await PromoCode.find().sort({ createdAt: -1 });
  res.json({ codes });
});

// POST /api/admin/promo  body: { code, reward, maxUses, expiresAt }
router.post("/promo", async (req, res) => {
  try {
    const { code, reward, maxUses, expiresAt } = req.body;
    const promo = await PromoCode.create({
      code: String(code).trim().toUpperCase(),
      reward: Number(reward),
      maxUses: Number(maxUses) || 1000,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });
    res.json({ promo });
  } catch (err) {
    res.status(400).json({ error: "Could not create code (maybe it already exists)" });
  }
});

// POST /api/admin/promo/:id/toggle
router.post("/promo/:id/toggle", async (req, res) => {
  const promo = await PromoCode.findById(req.params.id);
  if (!promo) return res.status(404).json({ error: "Not found" });
  promo.active = !promo.active;
  await promo.save();
  res.json({ active: promo.active });
});

// ---------- TASKS ----------
// GET /api/admin/tasks
router.get("/tasks", async (req, res) => {
  const tasks = await Task.find().sort({ createdAt: -1 });
  res.json({ tasks });
});

// POST /api/admin/tasks  body: { title, type, link, reward }
router.post("/tasks", async (req, res) => {
  const { title, type, link, reward } = req.body;
  const task = await Task.create({ title, type, link, reward: Number(reward) });
  res.json({ task });
});

// DELETE /api/admin/tasks/:id
router.delete("/tasks/:id", async (req, res) => {
  await Task.findByIdAndUpdate(req.params.id, { active: false });
  res.json({ ok: true });
});

// ---------- WITHDRAWALS ----------
// GET /api/admin/withdrawals?status=pending
router.get("/withdrawals", async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const withdrawals = await Withdrawal.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ withdrawals });
});

// POST /api/admin/withdrawals/:id/approve  body: { txHash: "0x..." }
// Tu manually USDT bhejega apne wallet se, fir yahan txHash daal ke approve karega
router.post("/withdrawals/:id/approve", async (req, res) => {
  const w = await Withdrawal.findById(req.params.id);
  if (!w) return res.status(404).json({ error: "Not found" });
  w.status = "approved";
  w.txHash = req.body.txHash || "";
  w.processedAt = new Date();
  await w.save();
  res.json({ withdrawal: w });
});

// POST /api/admin/withdrawals/:id/reject
// Reject karne pe user ka USDT wapas credit karna chahiye (agar deduct kiya tha swap ke time)
router.post("/withdrawals/:id/reject", async (req, res) => {
  const w = await Withdrawal.findById(req.params.id);
  if (!w) return res.status(404).json({ error: "Not found" });
  w.status = "rejected";
  w.processedAt = new Date();
  await w.save();
  res.json({ withdrawal: w });
});

module.exports = router;
