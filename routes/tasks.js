const express = require("express");
const router = express.Router();
const { telegramAuth } = require("../middleware/telegramAuth");
const { findOrCreateUser, checkReferralQualification, creditReferralCommission } = require("../config/helpers");
const Task = require("../models/Task");
const Transaction = require("../models/Transaction");

// GET /api/tasks -> saare active tasks dikhao, aur user ne kaunsa complete kiya hai wo bhi
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
    }));

    res.json({ tasks: result });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/tasks/:id/complete -> user ne task open kar liya, ab reward do
router.post("/:id/complete", telegramAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || !task.active) return res.status(404).json({ error: "Task not found" });

    const user = await findOrCreateUser(req.telegramUser);
    const already = user.completedTasks.some((id) => String(id) === String(task._id));
    if (already) return res.status(400).json({ error: "Task already completed" });

    user.completedTasks.push(task._id);
    user.balance += task.reward;
    await user.save();

    await Transaction.create({
      telegramId: user.telegramId,
      type: "task",
      amount: task.reward,
      status: "completed",
      note: `Task completed: ${task.title}`,
    });

    await checkReferralQualification(user);
    await creditReferralCommission(user, task.reward);

    res.json({ balance: user.balance, taskId: task._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
