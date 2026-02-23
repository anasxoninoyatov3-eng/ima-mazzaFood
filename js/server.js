// Load environment from .env if available (optional). Do NOT commit a real .env to source control.
try { require('dotenv').config(); } catch (e) { }
const express = require('express');
const https = require('https');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8521051511:AAGqsWjQ82kecjN6reYPZ3-x3WUGXEb6jlc";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || 5377787513;

app.use(express.json());
// Serve static files from the parent directory
app.use(express.static(path.join(__dirname, '../')));

app.post('/api/send-order', (req, res) => {
    const order = req.body.order || req.body;

    if (!BOT_TOKEN || !CHAT_ID) {
        return res.status(500).json({ error: 'Server not configured with TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID' });
    }

    const lines = [];
    lines.push(`📩 New order from ${order.name || 'Guest'}`);
    if (order.phone) lines.push(`📞 ${order.phone}`);
    if (order.address) lines.push(`📍 ${order.address}`);
    lines.push('');
    lines.push('Items:');

    if (order.items && typeof order.items === 'object') {
        Object.values(order.items).forEach(it => {
            lines.push(`• ${it.name} x${it.qty} — ${(it.price * it.qty).toLocaleString()} so'm`);
        });
    } else if (Array.isArray(order.items)) {
        order.items.forEach(it => {
            lines.push(`• ${it.name} x${it.qty} — ${(it.price * it.qty).toLocaleString()} so'm`);
        });
    }

    lines.push('');
    const total = (typeof order.total === 'number') ? order.total.toLocaleString() : order.total || '0';
    lines.push(`Jami: ${total} so'm`);

    const text = encodeURIComponent(lines.join('\n'));
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${text}`;

    https.get(url, (tgRes) => {
        let data = '';
        tgRes.on('data', chunk => data += chunk);
        tgRes.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                if (parsed && parsed.ok) {
                    return res.json({ ok: true, telegram: parsed.result });
                }
                return res.status(502).json({ error: 'Telegram API error', details: parsed });
            } catch (err) {
                return res.status(502).json({ error: 'Invalid response from Telegram', raw: data });
            }
        });
    }).on('error', (err) => {
        console.error('Telegram request failed:', err);
        res.status(500).json({ error: 'Failed to reach Telegram API', details: String(err) });
    });
});

app.listen(PORT, () => {
    console.log(`Mazza backend listening on port ${PORT}`);
});