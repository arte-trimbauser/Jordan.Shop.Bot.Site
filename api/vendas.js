const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = async (req, res) => {
    try {
        // Buscar vendas dos últimos 7 dias
        const hoje = new Date();
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(hoje.getDate() - 7);

        const { data: vendas, error } = await supabase
            .from('vendas')
            .select('*')
            .gte('data', seteDiasAtras.toISOString())
            .order('data', { ascending: true });

        if (error) {
            console.error('Erro ao buscar vendas:', error);
            return res.status(500).json({ error: error.message });
        }

        // Processar dados para o gráfico
        const dias = [];
        const valores = [];
        const hojeStr = hoje.toISOString().split('T')[0];
        let totalHoje = 0;
        let countHoje = 0;

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const diaStr = d.toISOString().split('T')[0];
            dias.push(diaStr);
            const total = vendas.filter(v => v.data.startsWith(diaStr)).reduce((acc, v) => acc + parseFloat(v.preco), 0);
            valores.push(total);
            if (diaStr === hojeStr) {
                totalHoje = total;
                countHoje = vendas.filter(v => v.data.startsWith(diaStr)).length;
            }
        }

        res.json({
            dias,
            valores,
            totalHoje,
            countHoje
        });
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
};
