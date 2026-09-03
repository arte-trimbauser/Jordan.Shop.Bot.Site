// api/login-manual.js
module.exports = async (req, res) => {
    // Apenas POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Campos em falta' });
    }

    // Credenciais autorizadas (exatamente as mesmas do bot)
    const credenciais = {
        "Jordan Costa": "Jordan26Costa",
        "Arteex26": "Arteex_26",
        "lucasvieira0453": "lucasvieira",
        "migueldodrip_09110": "migueldodrip",
        "pincher11": "pincher11"
    };

    if (credenciais[username] === password) {
        const tokenSessao = Math.random().toString(36).substring(2);
        return res.json({ success: true, user: username, token: tokenSessao });
    } else {
        return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
    }
};
