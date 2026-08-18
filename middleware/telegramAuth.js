const crypto = require("crypto");

/**
 * Telegram Mini App jab khulta hai, wo ek "initData" string bhejta hai jisme
 * user ka data + ek "hash" hota hai. Yeh function check karta hai ki hash sahi hai
 * ya nahi (matlab data Telegram se hi aaya hai, kisi ne fake nahi banaya).
 *
 * Frontend se har request ke header me yeh bhejna hoga:
 *   Authorization: tma <initData string>
 *
 * Docs: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyTelegramWebAppData(initData, botToken) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  urlParams.delete("hash");

  const dataCheckArr = [];
  for (const [key, value] of [...urlParams.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    dataCheckArr.push(`${key}=${value}`);
  }
  const dataCheckString = dataCheckArr.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) return null;

  const userStr = urlParams.get("user");
  if (!userStr) return null;
  return JSON.parse(userStr); // { id, first_name, username, photo_url, ... }
}

function telegramAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const initData = authHeader.startsWith("tma ") ? authHeader.slice(4) : null;

  if (!initData) {
    return res.status(401).json({ error: "Missing Telegram auth data" });
  }

  const user = verifyTelegramWebAppData(initData, process.env.BOT_TOKEN);
  if (!user) {
    return res.status(401).json({ error: "Invalid Telegram signature" });
  }

  req.telegramUser = {
    id: String(user.id),
    username: user.username || "",
    firstName: user.first_name || "",
    photoUrl: user.photo_url || "",
  };
  next();
}

module.exports = { telegramAuth, verifyTelegramWebAppData };
