const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, // e.g. "Join our Telegram channel"
    type: {
      type: String,
      enum: ["join_channel", "join_group", "custom"],
      default: "custom",
    },
    link: { type: String, required: true }, // t.me/... link user opens to join
    chatId: { type: String, default: "" }, // e.g. "@EARNAPPLE" — used to verify membership via Bot API
    reward: { type: Number, required: true }, // APPLE reward
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
