const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = async (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).send('ID do transcript não fornecido.');

    console.log(`📄 A buscar transcript: ${id}`);

    try {
        // Tenta com "transcripts/{id}.html"
        let { data, error } = await supabase.storage
            .from('transcripts')
            .download(`transcripts/${id}.html`);

        // Se falhar, tenta na raiz
        if (error || !data) {
            console.log(`⚠️ Caminho com pasta falhou, a tentar raiz...`);
            const result = await supabase.storage
                .from('transcripts')
                .download(`${id}.html`);
            data = result.data;
            error = result.error;
        }

        if (error || !data) {
            console.error(`❌ Transcript ${id} não encontrado:`, error?.message);
            return res.status(404).send('Transcript não encontrado.');
        }

        const text = await data.text();
        res.setHeader('Content-Type', 'text/html');
        res.send(text);
    } catch (err) {
        console.error(`❌ Erro interno para ${id}:`, err);
        res.status(500).send('Erro ao carregar transcript.');
    }
};
