// Protects the admin panel with a secret key (set ADMIN_PANEL_KEY in Railway).
// The admin panel is a normal web page (not a Telegram mini app), so it can't rely
// on Telegram's initData — the browser sends this key in the `x-admin-key` header instead.
function adminAuth(req, res, next) {
  const configuredKey = process.env.ADMIN_PANEL_KEY;
  const providedKey = req.header('x-admin-key');

  if (!configuredKey) {
    return res.status(500).json({ error: 'ADMIN_PANEL_KEY not configured on server' });
  }
  if (!providedKey || providedKey !== configuredKey) {
    return res.status(403).json({ error: 'Invalid admin key' });
  }
  next();
}

module.exports = adminAuth;
