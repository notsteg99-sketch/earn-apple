const express = require("express");
const router = express.Router();
const { telegramAuth } = require("../middleware/telegramAuth");
const User = require("../models/User");

// GET /api/leaderboard -> top 20 users by APPLE balance
router.get("/", telegramAuth, async (req, res) => {
  try {
    const topUsers = await User.find({ isBanned: false })
      .select("telegramId firstName username balance")
      .sort({ balance: -1 })
      .limit(20);

    const rankedList = topUsers.map((u, i) => ({
      rank: i + 1,
      name: u.firstName || u.username || "Player",
      balance: u.balance,
      isMe: u.telegramId === req.telegramUser.id,
    }));

    // Current user ki apni rank bhi nikaal do, chahe top 20 me na ho
    const myBalance = await User.findOne({ telegramId: req.telegramUser.id }).select("balance");
    let myRank = null;
    if (myBalance) {
      const higherCount = await User.countDocuments({ isBanned: false, balance: { $gt: myBalance.balance } });
      myRank = higherCount + 1;
    }

    res.json({ leaderboard: rankedList, myRank, myBalance: myBalance?.balance || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
