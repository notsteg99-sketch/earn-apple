// Admin panel ek standalone browser page hai (Telegram ke andar nahi khulta),
// isliye yeh Telegram initData verify nahi kar sakta. Iske bajaye yeh check karta hai
// ki request ke header me tera ADMIN_TELEGRAM_ID + ADMIN_SECRET dono sahi hain.
//
// .env me ADMIN_SECRET bhi add karna (koi bhi random strong password), aur
// admin-panel.html me login karte waqt wahi ID + secret dono daalne honge.
function adminAuth(req, res, next) {
  const id = req.headers["x-admin-id"];
  const secret = req.headers["x-admin-secret"];

  if (
    !id ||
    !secret ||
    id !== String(process.env.ADMIN_TELEGRAM_ID) ||
    secret !== String(process.env.ADMIN_SECRET)
  ) {
    return res.status(403).json({ error: "Admin access only" });
  }
  next();
}

module.exports = adminAuth;
