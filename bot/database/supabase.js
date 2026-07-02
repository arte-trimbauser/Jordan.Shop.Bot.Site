// database/supabase.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL ou SUPABASE_KEY nao definidos!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

(async () => {
    try {
        const { error } = await supabase.from('transcripts').select('count', { count: 'exact', head: true });
        if (error) {
            console.error('❌ Erro ao conectar ao Supabase:', error.message);
        } else {
            console.log('✅ Supabase conectado!');
        }
    } catch (err) {
        console.error('❌ Erro no teste Supabase:', err.message);
    }
})();

module.exports = supabase;
