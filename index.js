const express = require('express');
const axios = require('axios');
const { OpenAI } = require('openai');

const app = express();
app.use(express.json());

// Pega as variáveis e limpa espaços
const getEnv = (k) => (process.env[k] ? process.env[k].trim() : null);

const CONFIG = {
    OPENAI_KEY: getEnv('OPENAI_KEY'),
    EVOLUTION_URL: getEnv('EVOLUTION_URL'),
    EVOLUTION_KEY: getEnv('EVOLUTION_KEY'),
    INSTANCE: getEnv('INSTANCE')
};

const openai = new OpenAI({ apiKey: CONFIG.OPENAI_KEY || 'vazia' });

// ESSENCIAL: Easypanel usa isso para saber que o app está vivo
app.get('/', (req, res) => res.status(200).send("Sofia Online v2"));
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
            messages: [{ role: "system", content: "Você é a Sofia, atendente da Casa da Sogra." }, { role: "user", content: customerText }]
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

// USANDO A PORTA 3000
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Sofia rodando na porta ${PORT}`));
