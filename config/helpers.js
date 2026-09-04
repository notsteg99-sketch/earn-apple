const User = require("../models/User");
const Settings = require("../models/Settings");

// Aaj ki date "YYYY-MM-DD" format me (daily reset check ke liye)
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Settings ek hi document hota hai (singleton) — pehli baar call hone pe defaults se ban jata hai
async function getSettings() {
  let settings = await Settings.findOne({ key: "app_settings" });
  if (!settings) {
    settings = await Settings.create({ key: "app_settings" });
  }
  return settings;
}

// IP address se rough country detect karna (free API, koi key nahi chahiye).
// Yeh background me chalta hai — agar fail ho jaye to bas country empty reh jata hai, kuch break nahi hota.
async function detectCountry(ip) {
  try {
    if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.")) {
      return ""; // local/private IP — production me real IP hi aayega
    }
    const cleanIp = ip.replace("::ffff:", ""); // IPv4-mapped IPv6 prefix hata do
    const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country`);
    const data = await res.json();
    if (data.status === "success" && data.country) return data.country;
    return "";
  } catch (err) {
    console.error("Country detection failed:", err.message);
    return "";
  }
}

// Telegram user data se DB me user dhoondo, na ho to naya banao
async function findOrCreateUser(telegramUser, referredByTelegramId = null, ip = null) {
  let user = await User.findOne({ telegramId: telegramUser.id });

  if (!user) {
    user = await User.create({
      telegramId: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.firstName,
      photoUrl: telegramUser.photoUrl,
      referredBy: referredByTelegramId || null,
    });

    if (referredByTelegramId) {
      await User.updateOne(
        { telegramId: referredByTelegramId },
        { $inc: { referralCount: 1 } }
      );
    }

    // Country detection background me karo — login response ko slow nahi karna
    if (ip) {
      detectCountry(ip).then((country) => {
        if (country) User.updateOne({ telegramId: user.telegramId }, { country }).catch(() => {});
      });
    }
  } else {
    user.username = telegramUser.username;
    user.firstName = telegramUser.firstName;
    user.photoUrl = telegramUser.photoUrl;
    await user.save();

    // Purane users jinka country abhi tak set nahi hua, unke liye bhi try karo
    if (ip && !user.country) {
      detectCountry(ip).then((country) => {
        if (country) User.updateOne({ telegramId: user.telegramId }, { country }).catch(() => {});
      });
    }
  }

  return user;
}

// Har request pe check karo ki daily counters reset karne hain ya nahi
async function resetDailyCountersIfNeeded(user) {
  const today = todayStr();
  if (user.adsResetDate !== today) {
    user.adsWatchedToday = 0;
    user.adsResetDate = today;
    await user.save();
  }
  return user;
}

// Referral qualify hui ya nahi check karo (Settings me set kiye gaye tasks complete hone pe)
async function checkReferralQualification(user) {
  if (user.referralRewardGiven || !user.referredBy) return;

  const settings = await getSettings();
  if (user.completedTasks.length >= settings.referralTasksRequired) {
    const referrer = await User.findOne({ telegramId: user.referredBy });
    if (referrer) {
      referrer.balance += settings.referralBonusApple;
      referrer.qualifiedReferrals += 1;
      await referrer.save();
      user.referralRewardGiven = true;
      await user.save();
    }
  }
}

// Jab bhi ek referred user kamaata hai (ad/task/spin/promo), uske referrer ko commission milta hai
async function creditReferralCommission(user, earnedAmount) {
  if (!user.referredBy || earnedAmount <= 0) return;
  const settings = await getSettings();
  const referrer = await User.findOne({ telegramId: user.referredBy });
  if (!referrer) return;

  const commission = Math.round(earnedAmount * settings.referralCommissionRate * 100) / 100;
  referrer.balance += commission;
  referrer.commissionEarned += commission;
  await referrer.save();
}

module.exports = {
  todayStr,
  getSettings,
  detectCountry,
  findOrCreateUser,
  resetDailyCountersIfNeeded,
  checkReferralQualification,
  creditReferralCommission,
};
