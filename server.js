require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { telegramAuth } = require('./telegramAuth');
const adminAuth = require('./adminAuth');

const app = express();
app.use(cors());
app.use(express.json());

// Health check (useful for Railway)
app.get('/', (req, res) => res.json({ status: 'ok', service: 'apple-earn-backend' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Admin panel: plain browser page, protected by its own secret key (not Telegram initData)
app.use('/api/admin', adminAuth, require('./routes/admin'));

// Everything else must prove it came from Telegram (the mini app itself)
app.use('/api', telegramAuth);

app.use('/api/user', require('./routes/user'));
app.use('/api/spin', require('./routes/spin'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/promo', require('./routes/promo'));
app.use('/api/referral', require('./routes/referral'));
app.use('/api/wallet', require('./routes/wallet'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🍎 Apple Earn backend running on port ${PORT}`));
