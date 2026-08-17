const pool = require('./db/pool');

const QUALIFY_ADS = 14;
const QUALIFY_TASKS = 10;
const REFERRAL_BONUS = 100;       // APPLE paid to referrer once referred user qualifies
const COMMISSION_RATE = 0.10;     // 10% lifetime commission on every future earning of the referred user

// Creates the user row on first launch, or returns the existing one.
// `refBy` = telegram_id of whoever's referral link they opened the app with.
async function getOrCreateUser(tgUser, refBy) {
  const { id, username, first_name, photo_url } = tgUser;

  const existing = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [id]);
  if (existing.rows.length) {
    // keep profile fields fresh (name/photo can change on Telegram's side)
    await pool.query(
      'UPDATE users SET username=$2, first_name=$3, photo_url=$4 WHERE telegram_id=$1',
      [id, username || null, first_name || null, photo_url || null]
    );
    return (await pool.query('SELECT * FROM users WHERE telegram_id=$1', [id])).rows[0];
  }

  const validRef = refBy && Number(refBy) !== Number(id) ? Number(refBy) : null;
  const created = await pool.query(
    `INSERT INTO users (telegram_id, username, first_name, photo_url, referred_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [id, username || null, first_name || null, photo_url || null, validRef]
  );

  if (validRef) {
    const refExists = await pool.query('SELECT 1 FROM users WHERE telegram_id=$1', [validRef]);
    if (refExists.rows.length) {
      await pool.query(
        'INSERT INTO referrals (referrer_id, referred_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [validRef, id]
      );
    }
  }

  return created.rows[0];
}

// Resets daily ad counter if the date has rolled over. Call before reading/using ad limits.
async function resetDailyAdsIfNeeded(userId) {
  await pool.query(
    `UPDATE users SET ads_watched_today = 0, ads_date = CURRENT_DATE
     WHERE telegram_id = $1 AND ads_date <> CURRENT_DATE`,
    [userId]
  );
}

// Central place every APPLE reward flows through: credits balance, writes history,
// and pays the referrer their 10% lifetime commission if this user was referred.
async function creditApple(userId, amount, source, note = null) {
  if (amount <= 0) return;

  await pool.query('UPDATE users SET apple_balance = apple_balance + $2 WHERE telegram_id=$1', [userId, amount]);
  await pool.query(
    'INSERT INTO earn_history (user_id, source, amount, note) VALUES ($1,$2,$3,$4)',
    [userId, source, amount, note]
  );

  if (source === 'referral_bonus' || source === 'referral_commission') return; // no commission-on-commission

  const u = await pool.query('SELECT referred_by FROM users WHERE telegram_id=$1', [userId]);
  const referrerId = u.rows[0] && u.rows[0].referred_by;
  if (referrerId) {
    const commission = Math.floor(amount * COMMISSION_RATE);
    if (commission > 0) {
      await pool.query('UPDATE users SET apple_balance = apple_balance + $2 WHERE telegram_id=$1', [referrerId, commission]);
      await pool.query(
        'INSERT INTO earn_history (user_id, source, amount, note) VALUES ($1,$2,$3,$4)',
        [referrerId, 'referral_commission', commission, `10% commission from user ${userId}`]
      );
    }
  }
}

// Checks if a referred user now meets the 14-ads + 10-tasks bar, and if so
// marks the referral qualified + pays the referrer's one-time 100 APPLE + free spin.
async function checkReferralQualification(referredUserId) {
  const r = await pool.query(
    `SELECT r.id, r.referrer_id, r.status, u.total_ads_watched, u.tasks_done_count
     FROM referrals r JOIN users u ON u.telegram_id = r.referred_id
     WHERE r.referred_id = $1 AND r.status = 'pending'`,
    [referredUserId]
  );
  if (!r.rows.length) return;
  const row = r.rows[0];
  if (row.total_ads_watched >= QUALIFY_ADS && row.tasks_done_count >= QUALIFY_TASKS) {
    await pool.query(`UPDATE referrals SET status='qualified', qualified_at=now() WHERE id=$1`, [row.id]);
    await creditApple(row.referrer_id, REFERRAL_BONUS, 'referral_bonus', `Referral qualified: user ${referredUserId}`);
    await pool.query(
      `UPDATE users SET pending_spin_reward = COALESCE(pending_spin_reward,0)
       WHERE telegram_id = $1`,
      [row.referrer_id]
    );
    // grant one extra free spin by rolling back last_spin_date by a day
    await pool.query(`UPDATE users SET last_spin_date = (COALESCE(last_spin_date, CURRENT_DATE) - INTERVAL '1 day')::date WHERE telegram_id=$1`, [row.referrer_id]);
  }
}

module.exports = {
  QUALIFY_ADS, QUALIFY_TASKS, REFERRAL_BONUS, COMMISSION_RATE,
  getOrCreateUser, resetDailyAdsIfNeeded, creditApple, checkReferralQualification
};
