// Verifies the `initData` string Telegram gives every Mini App on launch.
// This is how we know a request really came from Telegram and which user it is —
// without this, anyone could pretend to be any user and fake their balance.
const crypto = require('crypto');

function verifyInitData(initData, botToken) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');

  const dataCheckArr = [];
  for (const [key, value] of [...urlParams.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    dataCheckArr.push(`${key}=${value}`);
  }
  const dataCheckString = dataCheckArr.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) return null;

  const userJson = urlParams.get('user');
  if (!userJson) return null;
  return JSON.parse(userJson);
}

// Express middleware: expects header `x-telegram-init-data: <raw initData string>`
function telegramAuth(req, res, next) {
  const botToken = process.env.BOT_TOKEN;
  const initData = req.header('x-telegram-init-data');

  if (!botToken) {
    return res.status(500).json({ error: 'BOT_TOKEN not configured on server' });
  }
  if (!initData) {
    return res.status(401).json({ error: 'Missing Telegram init data' });
  }

  // DEV_MODE lets you test in a browser (outside Telegram) with a fake user.
  if (process.env.DEV_MODE === 'true' && initData === 'dev') {
    req.tgUser = { id: Number(process.env.DEV_USER_ID || 111111), first_name: 'Dev', username: 'dev_user' };
    return next();
  }

  const user = verifyInitData(initData, botToken);
  if (!user) {
    return res.status(401).json({ error: 'Invalid Telegram init data' });
  }
  req.tgUser = user;
  next();
}

module.exports = { telegramAuth, verifyInitData };
