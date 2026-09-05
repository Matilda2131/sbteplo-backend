const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const EXPERIENTIAL_KEY = process.env.EXPERIENTIAL_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const PORT = process.env.PORT || 3000;

const SYSTEM_PROMPT = `Ты — Василий, инженер-сантехник и специалист по отоплению из СПб. Крепкий, спортивный, качок — но говоришь по делу, без пафоса. Грамотный, уверенный, объясняешь просто и по-человечески. Общаешься на ты, дружелюбно, 1-3 предложения.

Твоя задача — реально решить вопрос клиента здесь и сейчас: посчитать, объяснить, подсказать, а не отфутболивать на звонок. Ты реально разбираешься в отоплении и водоснабжении — не только называешь бренды, а объясняешь, почему та или иная система подходит под конкретный дом (площадь, этажность, топливо, назначение). Разбираешься также в канализации и сантехнике в целом. Если вопрос требует уточнений — задай встречный вопрос по делу.

Цены: тёплый пол от 2500₽/м², радиаторы от 10000₽/шт, котельная от 150000₽.
Гарантия 5 лет. Когда советуешь котёл — в первую очередь предлагай Baxi и De Dietrich (наш основной выбор по надёжности и сервису), Rehau — для труб и тёплого пола, Viessmann — как более премиальный вариант, если клиент прямо спрашивает про топовый сегмент.
На звонок Саше (+7(911)924-54-25) отправляй только если вопрос реально нельзя закрыть текстом (выезд на замер, индивидуальный расчёт по месту) — не как отговорку.

Входящий текст всегда в кодировке UTF-8 и всегда корректный. Никогда не пиши, что кириллица "поехала", "не отобразилась" или похожа на кракозябры — просто отвечай по сути вопроса. Если пользователь задал конкретный технический вопрос (гудят трубы, течёт кран и т.п.) — сначала ответь на него по существу, и только потом при необходимости уточняй детали для сметы.`;

async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
}

const OPENROUTER_MODELS = [
    'z-ai/glm-5.2:free',
    'minimax/minimax-m3:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'google/gemma-4-31b-it:free'
];

async function callOpenRouterModel(model, messages) {
    try {
        const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + OPENROUTER_KEY,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://sbteplo.ru',
                'X-Title': 'Sasha Heating'
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages.slice(-6)],
                max_tokens: 500,
                temperature: 0.6
            })
        }, 8000);
        if (response.ok) {
            const data = await response.json();
            if (data.choices && data.choices[0]) return data.choices[0].message.content;
        } else {
            const body = await response.text();
            console.error('OpenRouter HTTP', model, response.status, body.slice(0, 300));
        }
    } catch (e) { console.error('OpenRouter error:', model, e.message); }
    return null;
}

async function callOpenRouter(messages) {
    if (!OPENROUTER_KEY) return null;
    for (const model of OPENROUTER_MODELS) {
        const reply = await callOpenRouterModel(model, messages);
        if (reply) return reply;
    }
    return null;
}

async function callExperiential(messages) {
    if (!EXPERIENTIAL_KEY) return null;
    try {
        const response = await fetchWithTimeout('https://api.experientiallabs.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + EXPERIENTIAL_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-5.6-luna',
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages.slice(-6)],
                max_tokens: 500,
                temperature: 0.6
            })
        }, 8000);
        if (response.ok) {
            const data = await response.json();
            if (data.choices && data.choices[0]) return data.choices[0].message.content;
        } else {
            const body = await response.text();
            console.error('Experiential HTTP', response.status, body.slice(0, 300));
        }
    } catch (e) { console.error('Experiential error:', e.message); }
    return null;
}

// Chat proxy
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !messages.length) return res.status(400).json({ error: 'No messages' });

        let reply = await callExperiential(messages);
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