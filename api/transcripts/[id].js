// api/transcripts/[id].js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = async (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).send('ID do transcript não fornecido.');

    console.log(`📄 A buscar transcript: ${id}`);

    // Lista de caminhos possíveis (ordem de tentativa)
    const paths = [
        `${id}.html`,                     // raiz da bucket
        `transcripts/${id}.html`,         // dentro da pasta "transcripts"
        `transcripts/${id}`,              // sem extensão (alguns podem estar assim)
        `${id}`,                          // sem extensão
    ];

    let data = null;
    let usedPath = '';

    for (const path of paths) {
        console.log(`🔍 A tentar caminho: ${path}`);
        const { data: fileData, error } = await supabase.storage
            .from('transcripts')
            .download(path);
        if (!error && fileData) {
            data = fileData;
            usedPath = path;
            break;
        } else {
            console.warn(`⚠️ Falha em "${path}":`, error?.message || 'erro desconhecido');
        }
    }

    if (!data) {
        console.error(`❌ Transcript ${id} não encontrado em nenhum caminho.`);
        return res.status(404).send('Transcript não encontrado.');
    }

    console.log(`✅ Transcript encontrado em: ${usedPath}`);
    const text = await data.text();
    res.setHeader('Content-Type', 'text/html');
    res.send(text);
};
