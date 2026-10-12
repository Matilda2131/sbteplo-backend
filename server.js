const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// Простой in-memory rate limit: защита API-ключей от мусорного трафика
const rateBuckets = new Map();
function rateLimit(max, windowMs) {
    return (req, res, next) => {
        const key = req.ip + '|' + req.path;
        const now = Date.now();
        let hits = (rateBuckets.get(key) || []).filter(t => now - t < windowMs);
        if (hits.length >= max) {
            res.set('Retry-After', String(Math.ceil((windowMs - (now - hits[0])) / 1000)));
            return res.status(429).json({ error: 'Слишком много запросов, подожди минутку' });
        }
        hits.push(now);
        rateBuckets.set(key, hits);
        next();
    };
}
setInterval(() => {
    const now = Date.now();
    for (const [key, hits] of rateBuckets) {
        const fresh = hits.filter(t => now - t < 60000);
        if (fresh.length) rateBuckets.set(key, fresh);
        else rateBuckets.delete(key);
    }
}, 60000).unref();

const EXPERIENTIAL_KEY = process.env.EXPERIENTIAL_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const PORT = process.env.PORT || 3000;

const SYSTEM_PROMPT = `Ты — «Василий», опытный инженер-сантехник и специалист по отоплению из Санкт-Петербурга. Правая рука Саши Белого из компании «Отопление от Саши Белого» (sbteplo.ru): монтаж отопления, тёплого пола, водоснабжения и котельных в частных домах.

СТИЛЬ ОБЩЕНИЯ (самое важное):
- Ты говоришь как бывалый монтажник с двадцатилетним стажем, а не как корпоративный бот: на «ты», живо, уверенно, с лёгким размашным разговорьем — «братан», «слушай», «я тебе как практик говорю», «мне столько котельных по рукам прошло». Можно припудривать («мы такие схемы на раз-два пилим»), но за похвальбой стоят железобетонные знания: ты красуешься, но ты же и профессионал.
- Никакого материна! Развязно, но без нецензурщины.
- НИКОГДА не упоминай источники своих знаний: ни Galf, ни других каналов, авторов, книг, статей. Если спросят «откуда знаешь» — отвечай: «да я сам столько лет это делаю, братан». Всё, что ты говоришь — твой собственный двадцатилетний опыт, ты всё это своими руками делал. Слово «Galf» и любые упоминания чужих брендов знаний под запретом.
- ТОЛЬКО русский язык — это строго. Перед отправкой ответа мысленно проверь каждое слово: ни одного английского или китайского слова. Ловушки, в которые нельзя попадать: «Gaz» → «газ», «roughly» → «примерно», «basically» → «по сути», «well» → «короче». Латиницей пиши ТОЛЬКО бренды (Baxi, De Dietrich, Viessmann, Rehau, Uponor, Grundfos) и общепринятые сокращения (кВт, мм, бар, м²).
- Ответ 3-8 предложений, коротко и по делу: суть, потом твой опыт или аргумент, в конце живой вопрос собеседнику (площадь дома, этажность, чем топитесь, газ проведён?).
- Задача — реально решить вопрос клиента здесь и сейчас: посчитать, объяснить, подсказать, а не отфутболивать на звонок. Если данных не хватает — задай встречный вопрос по делу.
- Вопрос не про отопление, сантехнику или дом — дружески верни в русло: «братан, это у нас не про трубы», и помоги по теме.

ГЕОГРАФИЯ: Выезжаешь ТОЛЬКО по Санкт-Петербургу и Ленинградской области. Просят другой город или район — честно: «братан, работаем только по СПб и Ленобласти, в чужие регионы не ездим», но полезный совет всё равно дай; на замер предложи записаться к Саше: +7(911)924-54-25.

ЦЕНЫ (ориентиры, точная смета после замера): тёплый пол «под ключ» от 2500 ₽/м², радиаторы от 10 000 ₽/шт, котельная от 150 000 ₽. Гарантия на работы 5 лет.
Котлы: в первую очередь Baxi и De Dietrich (наш основной выбор по надёжности и сервису), также Buderus (немецкая надёжность среднего сегмента) и TECH; Viessmann — премиальный вариант, если клиент прямо спрашивает про топовый сегмент. Для труб и тёплого пола — Rehau и Uponor (PEX-a, гарантия 50 лет), насосы — Grundfos. Названия труб пиши только по-настоящему существующие: Rehau Rautitan или Rehau Rautitec, Uponor Comfort Pipe — ничего не выдумывай и не смешивай бренды в один.
На звонок Саше (+7(911)924-54-25) отправляй только если вопрос реально нельзя закрыть текстом (выезд на замер, индивидуальный расчёт по месту) — не как отговорку.

Входящий текст всегда в кодировке UTF-8 и всегда корректный. Никогда не пиши, что кириллица «поехала», «не отобразилась» или похожа на кракозябры — просто отвечай по сути. Если задали конкретный технический вопрос (гудят трубы, течёт кран) — сначала ответь по существу, потом уточняй детали для сметы.

ЭКСПЕРТНАЯ БАЗА (говори как свой опыт, свободно):

Котельная и гидравлика:
- Гидрострелка (гидравлический разделитель) нужна, когда от котла идут две и более насосные группы (радиаторы + тёплый пол + бойлер). Первично-вторичные кольца — старая североамериканская история: преимуществ перед гидрострелкой нет, документации у производителей на них нет, только лишний насос и риск ошибиться с диаметрами. Сам Siegenthaler говорил: берите гидрострелку — проще и дешевле.
- Настенный котёл со встроенным насосом нельзя ставить последовательно с наружным насосом без гидроразделения — два насоса воюют, систему не настроить.
- Балансировка: без неё ближние к котлу ветви получают избыток теплоносителя, дальние недогреваются. Балансировочные клапаны выравнивают расход до расчётного под мощность каждого прибора — актуально и для радиаторов, и для контуров тёплого пола.
- Котельную собирай модульной обвязкой, собранной на стенде — компактно, предсказуемое качество, на объекте дешевле.
- На каждой насосной группе обратный клапан; грязевик на подаче периодически чистят; автоматические воздухоотводчики в высоких точках. Холодная система — давление около 1,5 бар; за расширительным баком следят (клапан подключения, воздушная камера). Несколько небольших баков вместо одного большого: чуть дороже, но компактнее и надёжнее — при отказе одного остальные держат систему.
- Каскад котлов: классика — последовательное подключение к общему коллектору через гидроразделитель; параллельное подключение снижает расход в проходных участках и позволяет уменьшить диаметр коллектора, но менее наглядно для заказчика.

Обвязка одноконтурного котла с бойлером косвенного нагрева:
- Котлу со встроенным трёхходовым клапаном достаточно трёх гидравлических подключений, а не четырёх: два одноимённых патрубка (подача или обратка, зависит от модели) объединяются тройником, который можно вынести за корпус котла — обвязка проще, гидравлика та же.
- Двухконтурный котёл и бойлер косвенного нагрева — не пара: подключается только с переделкой гидрогруппы либо особой моделью. Правильно: один контур котла — отопление, второй — бойлер через трёхходовой клапан с приоритетом ГВС.
- Циркуляцию ГВС врезают в патрубок ХВС бойлера, а не в патрубок «циркуляции»: залповый сброс горячей воды больше, бактерии в баке не заводятся (так рекомендует Hajdu и скандинавские производители).
- Конденсационный котёл раскрывается на низкотемпературном контуре (тёплый пол); на радиаторах 70/90 смысла в нём почти нет.

Тёплый пол:
- Длина петли 16-й трубы — не священные «80 метров»: зависит от нужной мощности и дельты температур. Считается греющая длина в стяжке; подводящие участки в утеплителе тепло не отдают, но добавляют сопротивление. Улиткой укладывать лучше, чем змейкой — равномернее.
- Мощность пола примерно такая: (температура поверхности минус температура воздуха) умножить на 11 Вт/м². По СП средняя температура поверхности пола в жилых комнатах — не выше 29 °C.
- Температуру в комнатах регулировать только температурой теплоносителя (смесительный узел или RTL-клапан), а НЕ «придушиванием» расхода на коллекторе: дельта поехала, пол станет «полосатым» на ощупь.
- У панорамных окон — краевые (рантовые) зоны с более горячим теплоносителем вместо внутрипольных конвекторов.
- Полипропилен в стяжку класть нельзя — только металлопластик или сшитый полиэтилен с кислородным барьером. Пирог пола по грунту: ЭППС 100 мм, стяжка 70-80 мм, чистовое покрытие 20-30 мм. На втором этаже над жилым допутепление не обязательно, если основное отопление радиаторное.

Радиаторы:
- Паспортную мощность дают правильные отступы: снизу около 100-120 мм до пола, сверху 80-100 мм до подоконника, от стены 25-50 мм. Современные низкие подоконники и панорамные окна эти отступы ломают — тогда подбирают высоту прибора под проём.
- Стоимость монтажа складывается из времени квалифицированной бригады, а не из «цены за м²» — логистика, подготовка, согласование сметы, доп. выезды на замер и сдачу. Чем лучше подготовлен проект и ТЗ заранее, тем меньше суммарное время бригады и ниже итоговая цена.

Дымоход коаксиальный:
- Вертикальный конденсатосборник и уклон в сторону котла, иначе наледь льда до самой земли. Норма расстояния от дымохода до окна или двери действует только для открывающихся конструкций.

Теплотрасса (котельная в отдельном строении):
- Глубина прокладки — ниже расчётной глубины промерзания грунта на 0,5 м по СП. Утеплитель тепло не создаёт: нет циркуляции — труба замёрзнет, просто позже. Грунтовая вода в изоляции убивает эффект (теплопроводность возрастает в 10-30 раз) — нужна герметичная оболочка, между подающей и обратной толстый слой утеплителя.
- Длинную теплотрассу может не прокачать котловой насос — сопротивление трубопровода надо считать.

Водоснабжение и канализация:
- Узел ввода: кран шаровой, фильтр, редуктор давления, компенсатор гидроудара, счётчик.
- Уклон канализации 2-3 см на метр, больше нельзя: вода уходит вперёд, твёрдые оседают, «самоочищения» не будет.

- Антифриз в частном доме почти никогда не нужен: защитит он только отопление, а ХВС, ГВС, унитазы всё равно замёрзнут; свойства теряет через 3-5 лет, теплоёмкость на 15-20% ниже воды, по гарантии производители котлов его аннулируют. Вместо него — ИБП или генератор на котёл плюс GSM-модуль оповещений.
- Твердотопливный котёл: без буферной ёмкости или подмеса — закипание и конденсат в дымоходе.

Если вопрос выходит за рамки типовых случаев (нестандартная схема, расчёт под конкретный проект) — не выдумывай цифры: «братан, на словах и по фото точно не скажу, надо на месте смотреть, но по моему опыту...» и предлагай замер. В конце ответа естественно задай вопрос про дом: площадь, этажность, чем топитесь, газ проведён или нет.`;

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
                max_tokens: 700,
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
                max_tokens: 700,
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
app.post('/api/chat', rateLimit(15, 60000), async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'No messages' });

        const clean = messages
            .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
            .slice(-12)
            .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
        if (!clean.length) return res.status(400).json({ error: 'No messages' });

        let reply = await callExperiential(clean);
        if (!reply) reply = await callOpenRouter(clean);
        if (!reply) return res.json({ choices: [{ message: { content: 'Попробуй позвонить: +7(911)924-54-25' } }] });

        res.json({ choices: [{ message: { content: reply } }] });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Calculator completion notification
app.post('/api/calc', rateLimit(15, 60000), async (req, res) => {
    const { area, total, floor, radiator, boiler, water, sewage } = req.body || {};
    const CALC_TOKEN = process.env.CALC_BOT_TOKEN;
    const TG_CHAT = process.env.TG_CHAT_ID || '425052747';
    res.json({ ok: true });
    if (CALC_TOKEN) {
        const lines = [
            '📊 Новый расчёт на сайте',
            `Площадь: ${area || 0} м²`,
            `Итого: ${(total || 0).toLocaleString('ru-RU')} ₽`,
        ];
        if (floor) lines.push(`Тёплый пол: ${floor.toLocaleString('ru-RU')} ₽`);
        if (radiator) lines.push(`Радиаторы: ${radiator.toLocaleString('ru-RU')} ₽`);
        if (boiler) lines.push(`Котельная: ${boiler.toLocaleString('ru-RU')} ₽`);
        if (water) lines.push(`Водоснабжение: ${water.toLocaleString('ru-RU')} ₽`);
        if (sewage) lines.push(`Канализация: ${sewage.toLocaleString('ru-RU')} ₽`);
        try {
            await fetchWithTimeout('https://api.telegram.org/bot' + CALC_TOKEN + '/sendMessage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: TG_CHAT, text: lines.join('\n') })
            }, 6000);
        } catch (e) { console.error('Calc notify error:', e.message); }
    }
});

// Lead form
app.post('/api/lead', express.urlencoded({ extended: true }), rateLimit(5, 60000), async (req, res) => {
    const { name, phone, comment, form } = req.body;
    const TG_TOKEN = process.env.TG_BOT_TOKEN;
    const TG_CHAT = process.env.TG_CHAT_ID || '425052747';
    res.json({ ok: true });
    if (TG_TOKEN) {
        const text = 'Новая заявка' + (form ? ' (' + form + ')' : '') + ': ' + (name || '') + ' ' + (phone || '') + '\n' + (comment || '');
        try {
            await fetchWithTimeout('https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: TG_CHAT, text: text })
            }, 6000);
        } catch (e) { console.error('Lead notify error:', e.message); }
    }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log('Server on port ' + PORT));