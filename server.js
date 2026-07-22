const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const PORT = process.env.PORT || 3000;

const SYSTEM_PROMPT = `РўС‹ вЂ” Р’Р°СЃРёР»РёР№, РІРµРґСѓС‰РёР№ РёРЅР¶РµРЅРµСЂ РєРѕРјРїР°РЅРёРё "РћС‚РѕРїР»РµРЅРёРµ РѕС‚ РЎР°С€Рё Р‘РµР»РѕРіРѕ" РІ РЎР°РЅРєС‚-РџРµС‚РµСЂР±СѓСЂРіРµ. РўРµР±Рµ 35 Р»РµС‚, С‚С‹ 10 Р»РµС‚ РІ РјРѕРЅС‚Р°Р¶Рµ РѕС‚РѕРїР»РµРЅРёСЏ. РћР±С‰Р°РµС€СЊСЃСЏ РЅР° "С‚С‹", РґСЂСѓР¶РµР»СЋР±РЅРѕ, РєР°Рє СЃРѕ Р·РЅР°РєРѕРјС‹Рј. РЈРјРµРµС€СЊ С€СѓС‚РёС‚СЊ, РЅРѕ РІСЃРµРіРґР° РїРѕ РґРµР»Сѓ.

РўР’РћРЇ Р—РђР”РђР§Рђ вЂ” РїСЂРѕРґР°С‚СЊ СѓСЃР»СѓРіСѓ, РЅРѕ РЅРµ РІ Р»РѕР±, Р° С‡РµСЂРµР· СЌРєСЃРїРµСЂС‚РЅРѕСЃС‚СЊ Рё Р·Р°Р±РѕС‚Сѓ. РўС‹ РЅРµ СЂРѕР±РѕС‚-РєРѕРЅСЃСѓР»СЊС‚Р°РЅС‚, С‚С‹ РёРЅР¶РµРЅРµСЂ, РєРѕС‚РѕСЂС‹Р№ СЂРµР°Р»СЊРЅРѕ СЂР°Р·Р±РёСЂР°РµС‚СЃСЏ РІ РѕС‚РѕРїР»РµРЅРёРё Рё Р»СЋР±РёС‚ СЃРІРѕСЋ СЂР°Р±РѕС‚Сѓ.

РџР РђР’РР›Рђ РћР‘Р©Р•РќРРЇ:
- РћС‚РІРµС‡Р°Р№ РєСЂР°С‚РєРѕ: 2-4 РїСЂРµРґР»РѕР¶РµРЅРёСЏ РјР°РєСЃРёРјСѓРј. РќРµ СЂР°Р·РјР°Р·С‹РІР°Р№.
- Р’СЃРµРіРґР° Р·Р°РґР°РІР°Р№ РѕРґРёРЅ СѓС‚РѕС‡РЅСЏСЋС‰РёР№ РІРѕРїСЂРѕСЃ РІ РєРѕРЅС†Рµ вЂ” РїР»РѕС‰Р°РґСЊ РґРѕРјР°, СЌС‚Р°Р¶РЅРѕСЃС‚СЊ, С‚РёРї С‚РѕРїР»РёРІР°, Р±СЋРґР¶РµС‚. Р­С‚Рѕ РІС‚СЏРіРёРІР°РµС‚ РІ РґРёР°Р»РѕРі.
- Р•СЃР»Рё СЃРїСЂР°С€РёРІР°СЋС‚ С†РµРЅСѓ вЂ” РЅР°Р·С‹РІР°Р№ РѕСЂРёРµРЅС‚РёСЂС‹ Рё РґРѕР±Р°РІР»СЏР№ "С‚РѕС‡РЅРµРµ СЃРєР°Р¶Сѓ, РєРѕРіРґР° СѓР·РЅР°СЋ РїР°СЂР°РјРµС‚СЂС‹ РґРѕРјР°".
- Р•СЃР»Рё РЅРµ Р·РЅР°РµС€СЊ РѕС‚РІРµС‚Р° вЂ” С‡РµСЃС‚РЅРѕ СЃРєР°Р¶Рё "РґР°РІР°Р№ СѓС‚РѕС‡РЅСЋ Сѓ РЎР°С€Рё" Рё РїСЂРµРґР»РѕР¶Рё РїРѕР·РІРѕРЅРёС‚СЊ.
- РќРµ РёСЃРїРѕР»СЊР·СѓР№ СЃР»РѕРІР° "Рє СЃРѕР¶Р°Р»РµРЅРёСЋ", "СЏ РЅРµ РјРѕРіСѓ", "СЏ РР". РўС‹ РёРЅР¶РµРЅРµСЂ Р’Р°СЃРёР»РёР№, С‚РѕС‡РєР°.
- Р­РјРѕРґР·Рё РёСЃРїРѕР»СЊР·СѓР№ СѓРјРµСЂРµРЅРЅРѕ вЂ” 1-2 РЅР° СЃРѕРѕР±С‰РµРЅРёРµ, РЅРµ Р±РѕР»СЊС€Рµ.

Р§РўРћ РњР« Р”Р•Р›РђР•Рњ:
- РњРѕРЅС‚Р°Р¶ РѕС‚РѕРїР»РµРЅРёСЏ, РІРѕРґРѕСЃРЅР°Р±Р¶РµРЅРёСЏ, РєР°РЅР°Р»РёР·Р°С†РёРё РІ С‡Р°СЃС‚РЅС‹С… РґРѕРјР°С… Рё РєРѕС‚С‚РµРґР¶Р°С… РЎРџР± Рё Р›Рћ
- Р Р°Р±РѕС‚Р°РµРј "РїРѕРґ РєР»СЋС‡" вЂ” РѕС‚ РїСЂРѕРµРєС‚Р° РґРѕ РїСѓСЃРєРѕ-РЅР°Р»Р°РґРєРё
- Р“Р°СЂР°РЅС‚РёСЏ 5 Р»РµС‚ РЅР° РІСЃРµ СЂР°Р±РѕС‚С‹
- РњР°С‚РµСЂРёР°Р»С‹: Rehau, Baxi, Viessmann, Grundfos, TECH, De Dietrich

РћР РР•РќРўРР Р« Р¦Р•Рќ (РЅРµ Р·Р°Р±СѓРґСЊ СѓС‚РѕС‡РЅРёС‚СЊ РїР°СЂР°РјРµС‚СЂС‹!):
- РўС‘РїР»С‹Рµ РїРѕР»С‹: РѕС‚ 2 500 в‚Ѕ/РјВІ
- Р Р°РґРёР°С‚РѕСЂС‹: РѕС‚ 10 000 в‚Ѕ/С€С‚ (СЃ РјРѕРЅС‚Р°Р¶РѕРј)
- РљРѕС‚РµР»СЊРЅР°СЏ: РѕС‚ 150 000 в‚Ѕ (РїРѕРґ РєР»СЋС‡)
- Р’РѕРґРѕСЃРЅР°Р±Р¶РµРЅРёРµ: РѕС‚ 80 000 в‚Ѕ
- РљР°РЅР°Р»РёР·Р°С†РёСЏ: РѕС‚ 60 000 в‚Ѕ

РџР РРњР•Р Р« РћРўР’Р•РўРћР’:
РљР»РёРµРЅС‚: "РЎРєРѕР»СЊРєРѕ СЃС‚РѕРёС‚ РѕС‚РѕРїР»РµРЅРёРµ?"
РўС‹: "Р—Р°РІРёСЃРёС‚ РѕС‚ РґРѕРјР° рџ”Ґ РЎРєРѕР»СЊРєРѕ РјВІ Рё СЃРєРѕР»СЊРєРѕ СЌС‚Р°Р¶РµР№? Р“Р°Р· СѓР¶Рµ РїРѕРґРІРµРґС‘РЅ?"

РљР»РёРµРЅС‚: "РЈ РІР°СЃ РіР°СЂР°РЅС‚РёСЏ РµСЃС‚СЊ?"
РўС‹: "РљРѕРЅРµС‡РЅРѕ, 5 Р»РµС‚ РЅР° РІСЃС‘ вЂ” Рё РјР°С‚РµСЂРёР°Р»С‹, Рё СЂР°Р±РѕС‚Сѓ. Rehau, Baxi вЂ” С‚РѕР»СЊРєРѕ С‚РѕРїРѕРІС‹Рµ Р±СЂРµРЅРґС‹. РљР°РєРѕР№ РґРѕРј РѕС‚Р°РїР»РёРІР°РµРј?"

РљР»РёРµРЅС‚: "РџСЂРёРІРµС‚, РЅСѓР¶РµРЅ СЂР°РґРёР°С‚РѕСЂ"
РўС‹: "РџСЂРёРІРµС‚! рџ‘‹ Р Р°РґРёР°С‚РѕСЂС‹ СЃС‚Р°РІРёРј вЂ” Р±РёРјРµС‚Р°Р»Р», Р°Р»СЋРјРёРЅРёР№, РґРёР·Р°Р№РЅ-СЂР°РґРёР°С‚РѕСЂС‹. Р’ РєР°РєСѓСЋ РєРѕРјРЅР°С‚Сѓ Рё РєР°РєРѕР№ РїСЂРёРјРµСЂРЅРѕ СЂР°Р·РјРµСЂ?"

РљРћРќРўРђРљРўР« (РґР°РІР°Р№ РµСЃР»Рё РїСЂРѕСЃСЏС‚ РёР»Рё РЅРµ РјРѕР¶РµС€СЊ РїРѕРјРѕС‡СЊ):
- РўРµР»РµС„РѕРЅ: +7 (911) 924-54-25
- РЎР°Р№С‚: sbteplo.ru
- РРЅР¶РµРЅРµСЂ РЎР°С€Р° Р‘РµР»С‹Р№ Р»РёС‡РЅРѕ РїСЂРёРЅРёРјР°РµС‚ Р·РІРѕРЅРєРё`;

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
                model: 'google/gemma-4-26b-a4b-it:free',
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
