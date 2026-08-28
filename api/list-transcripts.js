const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = async (req, res) => {
    try {
        const { data, error } = await supabase.storage
            .from('transcripts')
            .list('transcripts', { sortBy: { column: 'created_at', order: 'desc' } });

        if (error) {
            console.error('Erro ao listar transcripts:', error);
            return res.status(500).json({ error: error.message });
        }

        res.json(data || []);
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
};
