const TelegramBot = require("node-telegram-bot-api");

// Single shared bot instance — used for:
// 1) Replying to /start with a welcome message + "Open App" button
// 2) Sending withdrawal approve/reject notifications to users
// 3) Posting approved withdrawal receipts to the payment channel
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const APP_URL = process.env.APP_URL || "https://earn-apple-production-aad6.up.railway.app";

bot.onText(/^\/start(?:\s+(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || "there";
  const referralId = match && match[1] ? match[1].trim() : null;

  const text =
    `Welcome to EARN APPLE, ${firstName}! 🍎\n\n` +
    `Earn APPLE tokens every day — spin the daily wheel, complete simple tasks, and redeem promo codes for free rewards.\n\n` +
    `• Earn daily through spins and tasks\n` +
    `• Redeem promo codes for instant rewards\n` +
    `• Invite friends and earn 10% commission for life\n` +
    `• Withdraw instantly once you're ready to cash out\n` +
    `• 24/7 support available\n\n` +
    `Tap the button below to get started.`;

  // Referral ID ko Open App button ke URL me query param ke roop me daal dete hain,
  // taaki Mini App khulte hi usse read kar sake (Telegram start_param hamesha reliably
  // web_app buttons ke saath forward nahi hota, isliye yeh zyada bharosemand tareeka hai).
  const appUrl = referralId ? `${APP_URL}?ref=${encodeURIComponent(referralId)}` : APP_URL;

  bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [[{ text: "Open App", web_app: { url: appUrl } }]],
    },
  }).catch((err) => console.error("Failed to send /start message:", err.message));
});

bot.on("polling_error", (err) => {
  // "409 Conflict" tab aata hai jab Railway redeploy ke dauran purana + naya instance
  // 1-2 second ke liye overlap karte hain — yeh harmless hai, app khud recover ho jata hai.
  if (err.message && err.message.includes("409")) {
    console.warn("Bot polling conflict (normal during redeploy, will self-resolve):", err.message);
  } else {
    console.error("Telegram polling error:", err.message);
  }
});

module.exports = bot;
