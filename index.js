const express = require('express');
const axios = require('axios');
const { OpenAI } = require('openai');

const app = express();
app.use(express.json());

const CONFIG = {
    OPENAI_KEY: process.env.OPENAI_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY,
    EVOLUTION_URL: process.env.EVOLUTION_URL,
    EVOLUTION_KEY: process.env.EVOLUTION_KEY,
    INSTANCE: process.env.INSTANCE
};

// Log de segurança para você ver no Easypanel se as chaves carregaram
console.log("Iniciando Sofia com Instância:", CONFIG.INSTANCE);

if (!CONFIG.OPENAI_KEY) {
    console.error("ERRO CRÍTICO: OPENAI_KEY não encontrada nas variáveis de ambiente!");
}

const openai = new OpenAI({ apiKey: CONFIG.OPENAI_KEY });

app.get('/', (req, res) => res.send("Sofia está Online! 🚀"));

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
                { role: "system", content: "Você é a Sofia, atendente da Casa da Sogra. Seja simpática e humana." },
                { role: "user", content: customerText }
            ]
        });

        const replyText = completion.choices[0].message.content;

        await axios.post(`${CONFIG.EVOLUTION_URL}/message/sendText/${CONFIG.INSTANCE}`, {
            number: customerPhone,
            text: replyText
        }, {
            headers: { 'apikey': CONFIG.EVOLUTION_KEY }
        });

        res.sendStatus(200);
    } catch (error) {
        console.error('Erro no processamento:', error.message);
        res.status(500).send(error.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Sofia ouvindo na porta ${PORT}`));
