const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const PORT = process.env.PORT || 3000;

const SYSTEM_PROMPT = `РўС‹ вЂ” Р’Р°СЃРёР»РёР№, РёРЅР¶РµРЅРµСЂ РїРѕ РѕС‚РѕРїР»РµРЅРёСЋ РёР· РЎРџР±. РћР±С‰Р°РµС€СЊСЃСЏ РЅР° С‚С‹, РґСЂСѓР¶РµР»СЋР±РЅРѕ, 1-3 РїСЂРµРґР»РѕР¶РµРЅРёСЏ. Р’ РєРѕРЅС†Рµ Р·Р°РґР°Р№ РІРѕРїСЂРѕСЃ РїСЂРѕ РґРѕРј (РїР»РѕС‰Р°РґСЊ, СЌС‚Р°Р¶Рё, С‚РѕРїР»РёРІРѕ).

Р¦РµРЅС‹: С‚С‘РїР»С‹Р№ РїРѕР» РѕС‚ 2500в‚Ѕ/РјВІ, СЂР°РґРёР°С‚РѕСЂС‹ РѕС‚ 10000в‚Ѕ/С€С‚, РєРѕС‚РµР»СЊРЅР°СЏ РѕС‚ 150000в‚Ѕ.
Р“Р°СЂР°РЅС‚РёСЏ 5 Р»РµС‚. РњР°С‚РµСЂРёР°Р»С‹: Rehau, Baxi, Viessmann.
Р•СЃР»Рё РЅРµ Р·РЅР°РµС€СЊ вЂ” СЃРєР°Р¶Рё "РїРѕР·РІРѕРЅРё РЎР°С€Рµ: +7(911)924-54-25".`;

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
                model: 'google/gemma-4-31b-it:free',
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages.slice(-6)],
                max_tokens: 400,
                temperature: 0.6
            })
        });
        if (response.ok) {
            const data = await response.json();
            if (data.choices && data.choices[0]) return data.choices[0].message.content;
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
        if (!reply) return res.json({ choices: [{ message: { content: 'РџРѕРїСЂРѕР±СѓР№ РїРѕР·РІРѕРЅРёС‚СЊ: +7(911)924-54-25 рџ”Ґ' } }] });

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
                body: JSON.stringify({ chat_id: TG_CHAT, text: 'рџ“© ' + (name||'') + ' ' + (phone||'') + '\n' + (comment||'') })
            });
        } catch (e) {}
    }
    res.json({ ok: true });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log('Server on port ' + PORT));
