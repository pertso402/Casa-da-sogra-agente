const express = require('express');
const axios = require('axios');
const { OpenAI } = require('openai');

const app = express();
app.use(express.json());

// Pega as variáveis
const getEnv = (key) => (process.env[key] ? process.env[key].trim() : null);

const CONFIG = {
    OPENAI_KEY: getEnv('OPENAI_KEY'),
    EVOLUTION_URL: getEnv('EVOLUTION_URL'),
    EVOLUTION_KEY: getEnv('EVOLUTION_KEY'),
    INSTANCE: getEnv('INSTANCE')
};

// IA Sofia
const openai = new OpenAI({ apiKey: CONFIG.OPENAI_KEY });

// ROTA IMPORTANTE: O Easypanel precisa disso para saber que a Sofia não morreu
app.get('/', (req, res) => res.status(200).send("OK"));
app.get('/health', (req, res) => res.status(200).send("OK"));

app.post('/webhook', async (req, res) => {
    try {
        const message = req.body.data?.messages?.[0];
        if (!message || message.key.fromMe) return res.sendStatus(200);

        const customerPhone = message.key.remoteJid.split('@')[0];
        const customerText = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
        if (!customerText) return res.sendStatus(200);

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "Você é a Sofia, atendente simpática da Casa da Sogra." },
                { role: "user", content: customerText }
            ]
        });

        await axios.post(`${CONFIG.EVOLUTION_URL}/message/sendText/${CONFIG.INSTANCE}`, {
            number: customerPhone,
            text: completion.choices[0].message.content
        }, {
            headers: { 'apikey': CONFIG.EVOLUTION_KEY }
        });

        res.sendStatus(200);
    } catch (error) {
        console.error('Erro:', error.message);
        res.sendStatus(200);
    }
});

// AQUI O SEGREDO: Forçar a porta 3000 para sair do conflito da porta 80 da VPS
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sofia rodando na porta ${PORT}`);
});
