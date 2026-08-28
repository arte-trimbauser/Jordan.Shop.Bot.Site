const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = async (req, res) => {
    try {
        // Buscar vendas dos últimos 7 dias (agrupadas por dia)
        const hoje = new Date();
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(hoje.getDate() - 7);

        const { data, error } = await supabase
            .from('vendas')
            .select('data, preco')
            .gte('data', seteDiasAtras.toISOString())
            .order('data', { ascending: true });

        if (error) {
            console.error('Erro ao buscar vendas:', error);
            return res.status(500).json({ error: error.message });
        }

        // Processar para o formato do gráfico
        const dias = [];
        const valores = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const diaStr = d.toISOString().split('T')[0];
            dias.push(diaStr);
            const total = data.filter(v => v.data.startsWith(diaStr)).reduce((acc, v) => acc + parseFloat(v.preco), 0);
            valores.push(total);
        }

        res.json({ dias, valores });
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
};
