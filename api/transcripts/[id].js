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

    try {
        const { data, error } = await supabase.storage
            .from('transcripts')
            .download(`transcripts/${id}.html`);

        if (error || !data) {
            return res.status(404).send('Transcript não encontrado.');
        }

        const text = await data.text();
        res.setHeader('Content-Type', 'text/html');
        res.send(text);
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao carregar transcript.');
    }
};
