const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const PORT = process.env.PORT || 3000;

const SYSTEM_PROMPT = `Ты — Василий, инженер-сантехник и специалист по отоплению из СПб. Крепкий, спортивный, качок — но говоришь по делу, без пафоса. Грамотный, уверенный, объясняешь просто и по-человечески. Общаешься на ты, дружелюбно, 1-3 предложения.

Твоя задача — реально решить вопрос клиента здесь и сейчас: посчитать, объяснить, подсказать, а не отфутболивать на звонок. Разбираешься не только в отоплении, но и в водоснабжении, канализации, сантехнике в целом. Если вопрос требует уточнений — задай встречный вопрос по делу (площадь, этажи, топливо, что именно беспокоит).

Цены: тёплый пол от 2500₽/м², радиаторы от 10000₽/шт, котельная от 150000₽.
Гарантия 5 лет. Материалы: Rehau, Baxi, Viessmann.
На звонок Саше (+7(911)924-54-25) отправляй только если вопрос реально нельзя закрыть текстом (выезд на замер, индивидуальный расчёт по месту) — не как отговорку.`;

async function callDeepSeek(messages) {
    if (!DEEPSEEK_KEY) return null;
    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + DEEPSEEK_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages.slice(-6)],
                max_tokens: 200,
                temperature: 0.6
            })
        });
        if (response.ok) {
            const data = await response.json();
            if (data.choices && data.choices[0]) return data.choices[0].message.content;
        } else {
            const body = await response.text();
            console.error('DeepSeek HTTP', response.status, body.slice(0, 300));
        }
    } catch (e) { console.error('DeepSeek error:', e.message); }
    return null;
}

async function callOpenRouter(messages) {
    if (!OPENROUTER_KEY) return null;
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + OPENROUTER_KEY,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://sbteplo.ru',
                'X-Title': 'Sasha Heating'
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-20b:free',
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages.slice(-6)],
                max_tokens: 500,
                temperature: 0.6
            })
        });
        if (response.ok) {
            const data = await response.json();
            if (data.choices && data.choices[0]) return data.choices[0].message.content;
        } else {
            const body = await response.text();
            console.error('OpenRouter HTTP', response.status, body.slice(0, 300));
        }
    } catch (e) { console.error('OpenRouter error:', e.message); }
    return null;
}

// Chat proxy
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !messages.length) return res.status(400).json({ error: 'No messages' });

        let reply = await callDeepSeek(messages);
        if (!reply) reply = await callOpenRouter(messages);
        if (!reply) return res.json({ choices: [{ message: { content: 'Попробуй позвонить: +7(911)924-54-25' } }] });

        res.json({ choices: [{ message: { content: reply } }] });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Lead form
app.post('/api/lead', express.urlencoded({ extended: true }), async (req, res) => {
    const { name, phone, comment, form } = req.body;
    const TG_TOKEN = process.env.TG_BOT_TOKEN;
    const TG_CHAT = process.env.TG_CHAT_ID || '425052747';
    if (TG_TOKEN) {
        try {
            await fetch('https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: TG_CHAT, text: 'Новая заявка: ' + (name||'') + ' ' + (phone||'') + '\n' + (comment||'') })
            });
        } catch (e) {}
    }
    res.json({ ok: true });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', deployMarker: 'test-marker-v9k2' }));

app.listen(PORT, () => console.log('Server on port ' + PORT));