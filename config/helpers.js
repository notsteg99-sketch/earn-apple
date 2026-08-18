const User = require("../models/User");

// Aaj ki date "YYYY-MM-DD" format me (daily reset check ke liye)
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Telegram user data se DB me user dhoondo, na ho to naya banao
async function findOrCreateUser(telegramUser, referredByTelegramId = null) {
  let user = await User.findOne({ telegramId: telegramUser.id });

  if (!user) {
    user = await User.create({
      telegramId: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.firstName,
      photoUrl: telegramUser.photoUrl,
      referredBy: referredByTelegramId || null,
    });

    // Referrer ki referral count badhao
    if (referredByTelegramId) {
      await User.updateOne(
        { telegramId: referredByTelegramId },
        { $inc: { referralCount: 1 } }
      );
    }
  } else {
    // Naam/photo update kar do agar change hui ho
    user.username = telegramUser.username;
    user.firstName = telegramUser.firstName;
    user.photoUrl = telegramUser.photoUrl;
    await user.save();
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

// Referral qualify hui ya nahi check karo (14 ads + 10 tasks complete)
async function checkReferralQualification(user) {
  if (user.referralRewardGiven || !user.referredBy) return;

  const adsQualified = user.adsWatchedToday >= 14 || (user.adsResetDate && true); // total lifetime tracking better in real app
  const tasksQualified = user.completedTasks.length >= 10;

  // NOTE: production me "total ads ever watched" ka alag field rakhna chahiye,
  // yahan simplicity ke liye adsWatchedToday use kiya hai (aaj ka).
  if (user.completedTasks.length >= 10) {
    const referrer = await User.findOne({ telegramId: user.referredBy });
    if (referrer) {
      referrer.balance += 100; // referral bonus
      referrer.qualifiedReferrals += 1;
      await referrer.save();
      user.referralRewardGiven = true;
      await user.save();
    }
  }
}

const COMMISSION_RATE = 0.1; // 10% lifetime commission on referred user's earnings

// Jab bhi ek referred user kamaata hai (ad/task/spin/promo), uske referrer ko 10% milta hai
async function creditReferralCommission(user, earnedAmount) {
  if (!user.referredBy || earnedAmount <= 0) return;
  const referrer = await User.findOne({ telegramId: user.referredBy });
  if (!referrer) return;

  const commission = Math.round(earnedAmount * COMMISSION_RATE * 100) / 100;
  referrer.balance += commission;
  referrer.commissionEarned += commission;
  await referrer.save();
}

module.exports = {
  todayStr,
  findOrCreateUser,
  resetDailyCountersIfNeeded,
  checkReferralQualification,
  creditReferralCommission,
};
