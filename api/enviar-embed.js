// api/enviar-embed.js
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    // URL do teu bot no Render (substitui pelo teu URL real)
    const BOT_URL = process.env.BOT_API_URL || 'https://teu-bot.onrender.com/api/enviar-embed';

    try {
        const response = await fetch(BOT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const text = await response.text();
        res.status(response.status).send(text);
    } catch (err) {
        console.error('Erro ao comunicar com o bot:', err);
        res.status(500).send('Erro ao comunicar com o bot. Verifica se o bot está online.');
    }
};
