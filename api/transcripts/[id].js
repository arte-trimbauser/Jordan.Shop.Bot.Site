const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = async (req, res) => {
    const { id } = req.query;
    if (!id) {
        return res.status(400).send('ID do transcript não fornecido.');
    }

    console.log(`📄 Pedido de transcript: ${id}`);

    try {
        const { data, error } = await supabase.storage
            .from('transcripts')
            .download(`transcripts/${id}.html`);

        if (error) {
            console.error(`❌ Erro ao baixar transcript ${id}:`, error.message);
            return res.status(404).send('Transcript não encontrado.');
        }

        if (!data) {
            console.warn(`⚠️ Transcript ${id} não tem dados.`);
            return res.status(404).send('Transcript vazio.');
        }

        const text = await data.text();
        res.setHeader('Content-Type', 'text/html');
        res.send(text);
    } catch (err) {
        console.error(`❌ Erro interno para ${id}:`, err);
        res.status(500).send('Erro ao carregar transcript.');
    }
};
