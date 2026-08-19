# EARN APPLE — Backend Setup Guide

Yeh backend tere Telegram Mini App (UI prototype) ke saath kaam karega.
Neeche step-by-step likha hai — order me follow karna.

## 1. MongoDB database banao (free)
1. https://www.mongodb.com/cloud/atlas pe free account banao
2. Ek free "M0" cluster create karo
3. Database Access me ek user banao (username/password yaad rakhna)
4. Network Access me "Allow access from anywhere" (0.0.0.0/0) add karo
5. "Connect" > "Drivers" se connection string copy karo, kuch aisa dikhega:
   `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/earnapple`

## 2. Telegram Bot banao
1. Telegram me `@BotFather` ko message karo
2. `/newbot` type karo, naam do: **EARN APPLE**, username do: jaise `EarnAppleBot`
3. Tujhe ek **BOT_TOKEN** milega — yeh kisi ko mat dena
4. `/mybots` > apna bot select karo > "Bot Settings" > "Menu Button" > yahan apna
   deployed app ka URL daalna hoga (step 5 ke baad)

## 3. Environment variables set karo
`.env.example` ko `.env` naam se copy karo aur values bharo:

```
BOT_TOKEN=<BotFather se mila token>
ADMIN_TELEGRAM_ID=<tera apna Telegram numeric ID — @userinfobot se pata chalega>
ADMIN_SECRET=<koi strong random password bana lo, admin panel login ke liye>
MONGO_URI=<MongoDB connection string>
PORT=5000
```

## 4. Local me test karo (optional)
```bash
npm install
npm run dev
```
Browser me `http://localhost:5000` khol ke check karo "EARN APPLE backend is running ✅" dikhna chahiye.

## 5. Deploy karo (Railway ya Render — dono free tier dete hain)

**Railway.app se:**
1. GitHub pe is folder ko push karo (naya repo banao)
2. Railway.app pe "New Project" > "Deploy from GitHub repo"
3. Environment variables (.env wale) Railway ke "Variables" tab me daalo
4. Deploy hone ke baad tujhe ek URL milega jaise `https://earnapple-production.up.railway.app`

## 6. Mini App ko is backend se connect karo
1. Jo HTML file maine banayi thi (`earn-apple-app.html`), usme jahan bhi
   `fetch(...)` calls honi hain, wahan apna Railway URL daalna hoga
   (jaise `https://earnapple-production.up.railway.app/api/spin`)
2. BotFather me `/mybots` > "Bot Settings" > "Menu Button" me apni Mini App
   ka URL daalo (HTML file kisi static hosting — Vercel/Netlify — pe upload karni hogi)

## 7. Adsgram ads lagao
1. https://adsgram.ai pe account banao, apna bot register karo
2. "Reward Ad" block banao — tujhe ek `Block ID` milega
3. Mini App ke HTML me yeh script daalo:
   ```html
   <script src="https://sad.adsgram.ai/js/sad.min.js"></script>
   ```
   Aur JS me:
   ```js
   const AdController = window.Adsgram.init({ blockId: "TERA_BLOCK_ID" });
   AdController.show()
     .then(() => { /* backend ko /api/ads/watch ya /api/spin/claim call karo */ })
     .catch(() => { /* "No ad found" dikhao */ });
   ```

⚠️ **Important:** Client-side ad-complete signal ko blindly trust mat karna production
me — koi bhi browser console se fake call bhej sakta hai. Jab volume badhe, Adsgram ka
**server-to-server reward postback** setup karna taaki reward sirf tabhi mile jab
Adsgram khud confirm kare ki ad poori dekhi gayi.

## 8. Admin panel
`admin-panel.html` file ko kahin bhi static hosting pe daal do (ya apne computer pe
bas double-click karke browser me kholo — internet chahiye, backend URL bas API calls
ke liye use hota hai).

Login karte waqt 3 cheezein bharni hongi:
- Telegram ID → tera `ADMIN_TELEGRAM_ID` (jo .env me daala hai)
- Admin secret → tera `ADMIN_SECRET` (jo .env me daala hai)
- Backend URL → jaha backend deploy kiya (Railway wala URL)

Yeh dono cheezein backend ke .env se exactly match honi chahiye, warna 403 error aayega.
Is secret ko kabhi kisi ke saath share mat karna.

## API Routes summary

| Route | Method | Kaam |
|---|---|---|
| `/api/auth` | POST | Login/user create |
| `/api/user/me` | GET | Profile + balance |
| `/api/spin` | POST | Daily spin (1/day, server-checked) |
| `/api/spin/claim` | POST | Ad dekhne ke baad reward claim |
| `/api/ads/watch` | POST | Watch & earn (14/day limit) |
| `/api/tasks` | GET | Task list |
| `/api/tasks/:id/complete` | POST | Task complete karna |
| `/api/promo/claim` | POST | Promo code apply |
| `/api/referral/me` | GET | Referral link + stats + list |
| `/api/wallet/swap` | POST | APPLE → USDT swap |
| `/api/wallet/withdraw` | POST | Withdraw request |
| `/api/wallet/history` | GET | Transaction history |
| `/api/admin/*` | — | Admin-only routes (users, promo, tasks, withdrawals) | 

Koi bhi step me atke to bata dena, us specific step ka aur detail me help kar dunga.
