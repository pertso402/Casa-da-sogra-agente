const express = require('express');
const axios = require('axios');
const { OpenAI } = require('openai');

const app = express();
app.use(express.json());

// Pega as variáveis e limpa espaços extras
const getEnv = (key) => (process.env[key] ? process.env[key].trim() : null);

const CONFIG = {
    OPENAI_KEY: getEnv('OPENAI_KEY'),
    SUPABASE_URL: getEnv('SUPABASE_URL'),
    SUPABASE_KEY: getEnv('SUPABASE_KEY'),
    EVOLUTION_URL: getEnv('EVOLUTION_URL'),
    EVOLUTION_KEY: getEnv('EVOLUTION_KEY'),
    INSTANCE: getEnv('INSTANCE')
};

console.log("--- DEBUG SOFIA ---");
console.log("Instância:", CONFIG.INSTANCE || "NÃO CONFIGURADA");
console.log("OpenAI Key carregada:", CONFIG.OPENAI_KEY ? "SIM (começa com " + CONFIG.OPENAI_KEY.substring(0, 7) + ")" : "NÃO");
console.log("--- FIM DEBUG ---");

// Rota de teste para ver se o app subiu
app.get('/', (req, res) => res.status(200).send("Sofia Online!"));

// Só inicializa a OpenAI se tiver a chave, para não crashar o app
let openai = null;
if (CONFIG.OPENAI_KEY) {
    openai = new OpenAI({ apiKey: CONFIG.OPENAI_KEY });
}

app.post('/webhook', async (req, res) => {
    try {
        if (!openai) return res.status(200).send("IA não configurada");

        const message = req.body.data?.messages?.[0];
        if (!message || message.key.fromMe) return res.sendStatus(200);

        const customerPhone = message.key.remoteJid.split('@')[0];
        const customerText = message.message?.conversation || message.message?.extendedTextMessage?.text || "";

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
        console.error('Erro no Webhook:', error.message);
        res.sendStatus(200);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sofia rodando na porta ${PORT}`);
});
