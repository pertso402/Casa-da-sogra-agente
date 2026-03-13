const express = require('express');
const axios = require('axios');
const { OpenAI } = require('openai');

const app = express();
app.use(express.json());

// CONFIGURAÇÕES - O Easypanel vai preencher isso automaticamente
const CONFIG = {
    OPENAI_KEY: process.env.OPENAI_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY,
    EVOLUTION_URL: process.env.EVOLUTION_URL,
    EVOLUTION_KEY: process.env.EVOLUTION_KEY,
    INSTANCE: process.env.INSTANCE
};

const openai = new OpenAI({ apiKey: CONFIG.OPENAI_KEY });

// Função para buscar cardápio no Supabase
async function getMenu() {
    try {
        const res = await axios.get(`${CONFIG.SUPABASE_URL}/rest/v1/menu_of_day?select=*&order=date.desc&limit=1`, {
            headers: { 'apikey': CONFIG.SUPABASE_KEY }
        });
        return res.data[0];
    } catch (e) {
        return null;
    }
}

// Rota principal (Webhook)
app.post('/webhook', async (req, res) => {
    const data = req.body;
    
    // Filtro básico
    const message = data.data?.messages?.[0];
    if (!message || message.key.fromMe || message.key.remoteJid.includes('@g.us')) {
        return res.sendStatus(200);
    }

    const remoteJid = message.key.remoteJid;
    const customerPhone = remoteJid.split('@')[0];
    const customerText = message.message?.conversation || message.message?.extendedTextMessage?.text || "";

    if (!customerText) return res.sendStatus(200);

    try {
        // Busca cardápio para dar contexto à IA
        const menu = await getMenu();
        const menuContext = menu ? `Cardápio de hoje: ${JSON.stringify(menu.options)}. Extras: ${JSON.stringify(menu.extras)}` : "Cardápio não disponível.";

        // IA Sofia
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: `Você é a Sofia, atendente simpática da Casa da Sogra. 
                Regras: Marmitas P (25), M (30), G (37). 
                ${menuContext}
                Peça o nome, endereço e forma de pagamento (Pix, Cartão, Dinheiro).` },
                { role: "user", content: customerText }
            ]
        });

        const replyText = completion.choices[0].message.content;

        // Responde no WhatsApp
        await axios.post(`${CONFIG.EVOLUTION_URL}/message/sendText/${CONFIG.INSTANCE}`, {
            number: customerPhone,
            text: replyText
        }, {
            headers: { 'apikey': CONFIG.EVOLUTION_KEY }
        });

        res.sendStatus(200);
    } catch (error) {
        console.error('Erro:', error.message);
        res.sendStatus(500);
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Sofia online na porta ${PORT}`));
