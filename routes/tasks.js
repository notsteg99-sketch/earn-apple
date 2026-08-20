const express = require("express");
const router = express.Router();
const { telegramAuth } = require("../middleware/telegramAuth");
const { findOrCreateUser, checkReferralQualification, creditReferralCommission } = require("../config/helpers");
const Task = require("../models/Task");
const Transaction = require("../models/Transaction");

// GET /api/tasks -> saare active tasks + user ne kaunsa complete kiya hai
router.get("/", telegramAuth, async (req, res) => {
  try {
    const user = await findOrCreateUser(req.telegramUser);
    const tasks = await Task.find({ active: true }).sort({ createdAt: -1 });

    const completedIds = new Set(user.completedTasks.map((id) => String(id)));
    const result = tasks.map((t) => ({
      id: t._id,
      title: t.title,
      type: t.type,
      link: t.link,
      reward: t.reward,
      completed: completedIds.has(String(t._id)),
      maxClaims: t.maxClaims,
      claimedCount: t.claimedCount,
      full: t.maxClaims > 0 && t.claimedCount >= t.maxClaims,
    }));

    res.json({ tasks: result });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

async function rewardTask(user, task) {
  user.completedTasks.push(task._id);
  user.balance += task.reward;
  await user.save();

  task.claimedCount += 1;
  await task.save();

  await Transaction.create({
    telegramId: user.telegramId,
    type: "task",
    amount: task.reward,
    status: "completed",
    note: `Task completed: ${task.title}`,
  });

  await checkReferralQualification(user);
  await creditReferralCommission(user, task.reward);
}

// POST /api/tasks/:id/verify -> channel/group tasks (Telegram Bot API se real check)
router.post("/:id/verify", telegramAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || !task.active) return res.status(404).json({ error: "Task not found" });
    if (task.type === "custom") return res.status(400).json({ error: "This task doesn't support verification" });
    if (!task.chatId) return res.status(400).json({ error: "Task not configured for verification" });

    if (task.maxClaims > 0 && task.claimedCount >= task.maxClaims) {
      return res.status(400).json({ error: "This task has reached its claim limit" });
    }

    const user = await findOrCreateUser(req.telegramUser);
    const already = user.completedTasks.some((id) => String(id) === String(task._id));
    if (already) return res.status(400).json({ error: "Task already completed" });

    const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(
      task.chatId
    )}&user_id=${user.telegramId}`;

    const tgRes = await fetch(url);
    const tgData = await tgRes.json();

    if (!tgData.ok) {
      return res.status(400).json({ error: "Could not verify — bot may not be an admin of this chat yet" });
    }

    const status = tgData.result?.status;
    const joined = ["member", "administrator", "creator"].includes(status);

    if (!joined) {
      return res.status(400).json({ error: "not_joined" });
    }

    await rewardTask(user, task);
    res.json({ balance: user.balance, taskId: task._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/tasks/:id/complete -> custom tasks
router.post("/:id/complete", telegramAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || !task.active) return res.status(404).json({ error: "Task not found" });
    if (task.type !== "custom") return res.status(400).json({ error: "Use /verify for this task type" });

    if (task.maxClaims > 0 && task.claimedCount >= task.maxClaims) {
      return res.status(400).json({ error: "This task has reached its claim limit" });
    }

    const user = await findOrCreateUser(req.telegramUser);
    const already = user.completedTasks.some((id) => String(id) === String(task._id));
    if (already) return res.status(400).json({ error: "Task already completed" });

    await rewardTask(user, task);
    res.json({ balance: user.balance, taskId: task._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
