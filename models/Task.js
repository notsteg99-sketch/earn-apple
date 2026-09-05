const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ["join_channel", "join_group", "custom"],
      default: "custom",
    },
    link: { type: String, required: true },
    chatId: { type: String, default: "" }, // e.g. "@EARNAPPLE" — used to verify membership via Bot API
    reward: { type: Number, required: true },

    maxClaims: { type: Number, default: 0 }, // 0 = unlimited
    claimedCount: { type: Number, default: 0 },

    active: { type: Boolean, default: true }, // false = disabled/hidden, but still in DB
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
