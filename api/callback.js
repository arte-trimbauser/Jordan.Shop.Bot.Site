// api/callback.js - Vercel Serverless Function (CommonJS)
const { createClient } = require('@supabase/supabase-js');

// Inicializa Supabase (opcional)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Lista de staff autorizados (IDs do Discord)
const staffAutorizado = {
  "924344854232834068": "Jordan Costa",
  "996454465555136675": "Arteex26",
  "1476260824669618307": "lucasvieira",
  "1138795786507919410": "migueldodrip",
  "886007990942052362": "pincher11"
};

module.exports = async function handler(req, res) {
  // Apenas aceita GET (redirecionamento do Discord)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.query;
  if (!code) {
    return res.redirect('/login.html?error=no_code');
  }

  try {
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      console.error('Missing CLIENT_ID or CLIENT_SECRET');
      return res.redirect('/login.html?error=auth_failed');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://jordan-shop-bot-site.vercel.app/callback'
    });

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error('Discord token error:', tokenRes.status, errorText);
      return res.redirect('/login.html?error=auth_failed');
    }

    const tokenData = await tokenRes.json();
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!userRes.ok) {
      console.error('Discord user fetch error:', userRes.status);
      return res.redirect('/login.html?error=auth_failed');
    }

    const userData = await userRes.json();
    const discordID = userData.id;

    if (!staffAutorizado[discordID]) {
      return res.redirect('/login.html?error=nao_autorizado');
    }

    // Gera token de sessão (podes melhorar depois)
    const tokenSessao = Math.random().toString(36).substring(2);

    // Redireciona para a loja
    return res.redirect(
      `/loja.html?user=${encodeURIComponent(userData.username)}&token=${tokenSessao}`
    );
  } catch (error) {
    console.error('Callback error:', error);
    return res.redirect('/login.html?error=auth_failed');
  }
};
