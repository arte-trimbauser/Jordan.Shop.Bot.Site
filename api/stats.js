const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = async (req, res) => {
    try {
        // Número de clientes (assumindo uma tabela `clientes`)
        let clientesCount = 0;
        const { count: clientesTotal, error: clientesError } = await supabase
            .from('clientes')
            .select('*', { count: 'exact', head: true });

        if (!clientesError) clientesCount = clientesTotal || 0;

        // Tickets pendentes (assumindo tabela `tickets` com status)
        let ticketsCount = 0;
        const { count: ticketsTotal, error: ticketsError } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'aberto');

        if (!ticketsError) ticketsCount = ticketsTotal || 0;

        res.json({
            clientes: clientesCount,
            tickets: ticketsCount
        });
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ error: 'Erro interno' });
    }
};
